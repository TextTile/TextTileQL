const elasticsearch = require('elasticsearch');
const _ = require('lodash')
const compile = require("./compiler").compile
const {parseQuery} = require('../../utils')
const {
    graphql,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString
} = require('graphql');

const {getFieldsFromInfo} = require('graphql-utils');
const parseMapping = (mapping) => {
	return mapEsField(mapping);
};

const mapEsField = (field) => {
	let result = {};
	if (field.properties) {
		for (let prop in field.properties) {
			let mapped = mapEsField(field.properties[prop]);
			if (mapped) {
				result[prop] = mapped
				result[prop].field = prop;
			}
		}
		return result;
	} else {
		if (field.type) {
			switch (field.type) {
				case "string":
					if (field.index == "not_analyzed") {
						return {
							type: "String",
						}
					}
					return {
						type: "Text"
					}

				case "long":
				case "integer":
				case "short":
				case "byte":
					return {
						type: "Number"
					}

				case "float":
				case "double":
					return {
						type: "Decimal"
					}
				case "date":
					return {
						type: "Date",
						format: field.format
					}
				case "boolean":
					return {
						type: "Boolean"
					}
				default:
					return {};
				//long, integer, short, byte, double, float
			}
		} else {
			console.error('Outlier', field)
		}
	}


}


class ElasticsearchPlugin {
    constructor(config) {
        this.config = config;
        this.client = ElasticsearchPlugin.getClient(config)
    }
	static getClient(config) {
		return new elasticsearch.Client({
            host: config.user ? `http://${config.user}:${config.password}@${config.server}` : config.server,
            //log: 'trace'
        });
	}

	static extractMapping(config) {
		const client = ElasticsearchPlugin.getClient(config);
		const {index, type} = config;
		return client.indices.getMapping({
			index: index,
			type: type
		}).then(mapping => {
			return parseMapping(mapping[index].mappings[type]);
		}).catch((err) => console.error(err));
	}

	get(id) {
		return this.client.get({
			index: this.config.index,
			type: this.config.type,
			id
		});
	}

    execute(body) {
		body.timeout = 13600;
        return this.client.search({
            index: this.config.index,
            type: this.config.type,
            body: body
})
    }

parseDocument(d) {
	d._source._id_ = d._id;
	const highlights = [];
	if (d.highlight) {
		for (const key in d.highlight) {
			highlights.push({
				field: key,
				texts: d.highlight[key]
			})
		}
		d._source._highlights_ = highlights;
	}
	return d._source;
}

parseSummaries(root, context) {
	let summaries = _.get(root, "keys.Summaries.keys")
	const mapObject = (obj) => {
		const s = { info: context.mapping[obj.key] };
		if (obj.keys.Summaries) {
			s.summaries = this.parseSummaries(obj, context);
		}
		if (obj.keys.Counts) {
			s.Counts = {};
			for (let key in obj.keys.Counts.keys) {
				s.Counts[key] = obj.keys.Counts.keys[key];
				s.Counts[key].info = context.mapping[key];
			}
		}
		s.args = obj.args;
		return s;
	}
	if (summaries) {
		summaries = Object.keys(summaries).map(k => {
			summaries[k].key = k;
			return summaries[k];
		})
		if (summaries.length > 1) {
			summaries = summaries.reduce((a, b) => {
				return Object.assign(a, { [b.key]: mapObject(b) })
			}, {})
		} else {
			summaries = { [summaries[0].key]: mapObject(summaries[0]) }
		}
	}
	return summaries;
}

getSchema() {
	if (this.schema) {
		return this.schema;
	} else {
		return {
			resolvers: {
				documents: (source, args, context, ast) => {
					return source.documents.map(d => {
						d._source._id_ = d._id;
						const highlights = [];
						if (d.highlight) {
							for (const key in d.highlight) {
								highlights.push({
									field: key,
									texts: d.highlight[key]
								})
							}
							d._source._highlights_ = highlights;
						}
						return d._source;
					});
				},

				document: (source, args, context, ast) => {
					return this.get(args.id).then(result => {
						return this.parseDocument(result)
					})
				},

				count: (source, args, context, ast) => {
					return source.Count;
				},

				stats: (field, source, args, context, ast) => {
					return {
						Count: source[field].min,
						Min: source[field].min,
						Max: source[field].max,
						Avg: source[field].avg,
						Sum: source[field].sum,
						MinAsString: source[field].min_as_string,
						MaxAsString: source[field].max_as_string,
						AvgAsString: source[field].avg_as_string,
						SumAsString: source[field].sum_as_string,
					}
				},

				summary: (field, source, args, context, ast) => {
					let result = source[field].buckets.map(a => {
						let result = {
							Key: a.key,
							KeyAsString: a.key_as_string,
							Count: a.doc_count
						}
						for (let key in a) {
							let group = _.get(a[key], 'meta.group');
							if (group) {
								result[group] = result[group] || {};
								if (group == 'Counts') {
									result[group][key.replace(group, '')] = a[key].value
								} else {
									result[group][key.replace(group, '')] = a[key]
								}
							}
						}

						return result
					})
					return result;
				},

				select: (source, args = {}, context, ast) => {
					context = context || source;
					let simpleQuery = parseQuery(ast);
					
					let summaries = this.parseSummaries(_.get(simpleQuery.keys, "Select"), context)

					let documents = _.get(simpleQuery.keys, "Select.keys.Documents");
					let stats = _.get(simpleQuery.keys, "Select.keys.Stats");
					try {
						let query = compile({
							filters: args.filters,
							must: args.must,
							not: args.not,
							documents: documents,
							search: args.search,
							summaries: summaries,
							mapping: context.mapping,
							stats: stats
						})

						return this.execute(query).then(result => {
							let data = {}
							data.documents = result.hits.hits
							data.Summaries = result.aggregations
							data.Count = result.hits.total
							data.Stats = _.pick(result.aggregations, _.keys(result.aggregations).filter((k) => result.aggregations[k].meta.group === "Stats" ))
							data.Stats = _.mapKeys(data.Stats, (value, key) => {
								return key.replace("_Stats_", "")
							})
							return data
						}).catch(err => { console.error(err) })
					} catch (error) {
						console.error(error);
					}
				}
			}
		}
	}
}
}




module.exports = ElasticsearchPlugin;
