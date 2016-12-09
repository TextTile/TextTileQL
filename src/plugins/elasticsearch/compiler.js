const _ = require('lodash')

function prepareQuery(query) {
	if(!query.query || !query.query.bool) {
		query.query = { bool: { } };
	}
	return query;
}
//517053
//14656
//502397
const compile = function compile(info) {
    let query = {};
    if (info.filters) {
        query.query = getFilters(info.filters);
    }

	if (info.must) {
		query = prepareQuery(query);
		query.query.bool.filter = query.query.bool.filter || [];
        query.query.bool.filter = query.query.bool.filter.concat(getMust(info.must, info.mapping));
    }

	if (info.not) {
        query = prepareQuery(query);
		query.query.bool.must_not = query.query.bool.must_not || [];
        query.query.bool.must_not = query.query.bool.must_not.concat(getMust(info.not, info.mapping));
		
    }

	if(info.search) {
		if(!query.query || !query.query.bool) {
			query.query = { bool: { filter: [] } };
		}
		query.query.bool.filter.push({
			query_string : {
				query : info.search,
				fields: getTextFields(info.mapping)
			}
		})
	}
	if(info.search || info.filters || info.must) {
		query.highlight = getHighlight(info.mapping);
	}

	if(info.documents) {
		let {documents} = info;
		query.from = _.get(documents, "args.skip");

		query.size = _.get(documents, "args.limit") || 10;
	} else {
		query.size = 0;
	}

    if(info.summaries) {
        query.aggs = {}
        //let agg2 = compileSummaries(info.summaries, !!info.filters);
		query.aggs = compileSummaries(info.summaries, !!info.filters);
    }

	if(info.stats) {
		query.aggs = query.aggs  || {}

		query.aggs = _.assign(query.aggs, compileStats(info.stats, !!info.filters, "Stats", info.mapping)) 
	}

    return query
}

const compileStats = function compileStats(stats, hasFilters, group, mapping) {
	let result = {};
	for (let key in stats.keys) {
		let agg = { "stats" : { "field" : mapping[key].field } }
		
		agg.meta = { group }
		if(!group) {
			result[key] = agg
		} else {
			result[`_Stats_${key}`] = agg
		}
	}
	return result;
}

const compileSummaries = function compileSummaries(summaries, hasFilters, group) {
	let result = {};
	for (let key in summaries) {
		let agg = getAggsField(summaries[key], hasFilters)
		if(summaries[key].summaries) {
			agg.aggs = compileSummaries(summaries[key].summaries, true, 'Summaries')
		}
		if(summaries[key].Counts) {
			agg.aggs = agg.aggs || {};
			for(let field in summaries[key].Counts) {
				agg.aggs[`Counts${field}`] = { cardinality : {field: summaries[key].Counts[field].info.field}}
				agg.aggs[`Counts${field}`].meta = { group: 'Counts'}
			}
		}
		agg.meta = { group }
		if(!group) {
			result[key] = agg
		} else {
			result[`Summaries${key}`] = agg
		}
	}
	return result;
}

const getHighlight = function getHighlight(mapping) {
	const high = { fields : {} };
	for (let rule in mapping) {
		const obj = mapping[rule];
		if(obj.type === 'Text') {
			high.fields[rule] = {}
		}
	}
	return high;
}


const getTextFields = function getTextFields(mapping) {
	const fields = [];
	for (let rule in mapping) {
		const obj = mapping[rule];
		if(obj.type === 'Text') {
			fields.push(rule)
		}
	}
	return fields;
}

const getFilters = function getFilters(filters) {
    if (filters) {
        let result = { bool: { filter: [] } };
        for (let rule of filters) {
            result.bool.filter.push(getFilterRule(rule));
        }
        return result;
    }
    return undefined;
}

const getMust = function getMust(must, mapping) {
    if (must) {
        let result = [];
		
        for (let rule of must) {
            result.push(getMustRule(rule, mapping));
        }
        return result;
    }
    return undefined;
}

const getAggsField = function getAggsField(fieldInfo, hasFilters) {
        try {
            let {field, type} = fieldInfo.info;
            let {limit, order, exclude, only, min_doc_count, significant, background_filter, interval} = fieldInfo.args || {};
			exclude = exclude || [];
			interval = interval ? interval.toLowerCase() : interval;
			let include = only;
            switch (type) {
                case "List.String":
                case "String":
                    let resultString = {
                        "terms": {
                            "field": field,
                            "size": limit || 50,
                            "order": order,
                            "include": include,
							"collect_mode" : "breadth_first",
                            "min_doc_count": min_doc_count || 1
                        }
                    }
                    if(typeof field === 'object') {
                        delete resultString.terms.field;
                        resultString.terms.script = field.map(f => `doc['${f}'].values`).join(" + ")
                    }
                    return resultString

                case  "Text":
                    significant = false;
                    if(significant) {
                        return {
                            "significant_terms": {
                                "field": field,
								"collect_mode" : "breadth_first",
                                "gnd": {},
                               // "script_heuristic": {
                                //    "script": "_subset_freq/_subset_size * Math.log(_superset_size/_superset_freq)"
                                //},
                               //  "script_heuristic": {
                               //     "script": "_subset_freq"
                               // },
                                "include": include,
                                "exclude": '.*[0-9].*',
                                "size": limit || 50,

                                "background_filter": background_filter
                            }
                        };
                    }
                    return {
                        "terms": {
                            "field": field,
                            "include": include,
                            "exclude": exclude,
							"collect_mode" : "breadth_first",
                            "size": limit || 50,
                            "order": order,
                            "min_doc_count": min_doc_count || 1
                        }
                    };

                case  "Number":
                    return {
                        "histogram": {
                            "field": field,
                            "interval": interval || 1,
                            "order": order
                        }
                    };

                case  "CONTINUOUS":
                    return {
                        "histogram": {
                            "field": field,
                            "interval": interval || 1,
                            "order": order
                        }
                    };

                case  "Date":
                    return {
                        "date_histogram": {
                            "field": field,
                            "interval": interval || "month",
                            "format": getDateFormat(interval || "month")
                        }
                    };

                case  "Boolean":
                    return {
                        "terms": {
                            "field": field
                        }
                    };

            }
        } catch(ex) {
            console.error(ex);
        }
    }

const getFilterRule = function getFilterRule(rule) {

    try {
        let {operation, value} = rule;
        let {field, type} = rule.field;
        switch (operation) {
            case "in":
                let keys = value;
                keys = keys.concat(value.map(k => cammel(k)))
                keys = keys.concat(value.map(k => k.toLowerCase()))
                keys = keys.concat(value.map(k => k.toUpperCase()))
                keys = keys.concat(value.map(k => cammel(k.toLowerCase())))
                if(typeof field === 'object') {
                    let result = {or: []};
                    for(let f of field) {
                        result.or.push({ "terms": { [f]: keys } })
                    }
                    return result;
                }
                return { "terms": { [field]: keys } };


            case "contains":
                if(typeof field === 'object') {
                    return { "query_string": { "fields": field, "query": value.join(" ") } };
                }

                return { "query_string": { "default_field": field, "query": value.join(" ") } };


            case "between":
                if (type == "Date")
                    return {
                        "range": {
                            [field]: {
                                "gte": value[0],
                                "lte": value[1],
                                "format": "yyyy-MM-dd"
                            }
                        }
                    };
                else
                    return {
                        "range": {
                            [field]: {
                                "gte": value[0],
                                "lte": value[1]
                            }
                        }
                    };


            case "is":
                return { "term": { [field]: value[0] } };
        }
        return {};
    } catch (ex) {
        console.trace(ex);
    }
}

const getFieldFilter = function getFieldFilter(field, value, type) {
	switch (type) {
		case "String":
		case "List.String":
			return { "terms": { [field]: value } };
		case "Text": 
			return { "query_string": { "default_field": field, "query": value.join(" ") } };
		case "Date":
			return { "range": {
					[field]: {
						"gte": !value[0] ? undefined : value[0],
						"lte":!value[1] ? undefined : value[1],
						"format": "yyyy-MM-dd"
					}
				}
			}
		case "Number":
			return {
				"range": {
					[field]: {
						"gte":  !value[0] ? undefined : value[0],
						"lte":  !value[1] ? undefined : value[1]
					}
				}
			};
			
		default:
			break;
	}
}

const getMustRule = function getMustRule(rule, mapping) {
    try {
		let result = { bool: { should: [] } };
		let rules = _.keys(rule).map(field => {
			let fieldType = mapping[field].type;
			return getFieldFilter(mapping[field].field, rule[field], mapping[field].type)
		})
		result.bool.should.push(rules);
        return result;
    } catch (ex) {
        console.trace(ex);
    }
}


const cammel = function cammel(str) {
    return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
}

const getDateFormat = function getDateFormat(interval) {
        switch (interval) {
            case "year":
                return "yyyy";
            case "month":
            case "quarter":
                return "MM/yyyy";
            case "week":
            case "day":
                return "dd/MM/yyyy";
            case "hour":
                return "dd/MM - hh:mm a";
            case "minute":
                return "hh:mm a";
            case "second":
                return "hh:mm:ss a";
        }
    }

module.exports = { compile }
