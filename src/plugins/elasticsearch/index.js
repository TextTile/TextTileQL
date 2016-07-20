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


class ElasticsearchPlugin {
    constructor(config) {
        this.config = config;
        this.client = new elasticsearch.Client({
            host: config.user ? `http://${config.user}:${config.password}@${config.server}` : config.server,
            //log: 'trace'
        });
    }

    execute(body) {
        return this.client.search({
            index: this.config.index,
            type: this.config.type,
            body: body
        })
    }

    getSchema() {
        if (this.schema) {
            return this.schema;
        } else {
            return {
                resolvers: {
                    documents: (source, args, context, ast) => {
                        return source.documents.map(d => {
                            d._source._id = d._id;
                            return d._source;
                        });
                    },

                    summary: (field, source, args, context, ast) => {
                        return source[field].buckets.map(a => ({
                           Key: a.key,
                           Count: a.doc_count 
                        }));
                    },

                    select: (source, args = {}, context, ast) => {
                        let keys = parseQuery(ast);
                        let summaries = _.get(keys, "Select.keys.Summaries.keys")
                        if (summaries) {
                            summaries = Object.keys(summaries).map(k => {
                                return k;
                            })
                            if (summaries.length > 1) {
                                summaries = summaries.reduce((a, b) => {
                                    if(typeof(a) == "string") {
                                        a = { [a]: { info: context.mapping[a]}}
                                    }
                                    return Object.assign(a, { [b]: { info: context.mapping[b] }})
                                })
                            } else {
                                
                                summaries = { [summaries[0]]: { info: context.mapping[summaries[0]] }}
                            }
                        }
                        
                        let query = compile({
                            filters: args.filters,
                            summaries: summaries
                        })
                        return this.execute(query).then(result => {
                            let data = {}
                            data.documents = result.hits.hits
                            data.Summaries = result.aggregations
                            return data
                        }).catch(err => { throw Error(err) })
                    }
                }
            }
        }
    }
}




module.exports = ElasticsearchPlugin;