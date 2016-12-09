const {
    graphql,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLBoolean,
    GraphQLList,
	GraphQLInt
} = require('graphql');



const SelectType = function (mapping = {}, resolvers = {}) {
    const DocumentType = require('./DocumentType')(mapping, resolvers)
    const SummariesType = require('./SummariesType')(mapping, resolvers)
	const StatsType = require('./StatsType')(mapping, resolvers)
    return new GraphQLObjectType({
        name: 'Select',
        fields: {
            Documents: {
                type: new GraphQLList(DocumentType),
				args: {
					skip: { type: GraphQLInt },
					limit: { type: GraphQLInt }
				},
                resolve: resolvers.documents || ((obj = {}, args, context, ast) => {
                    return obj.documents
                })
            },
			Count: {
				type: GraphQLInt,
				resolve: resolvers.count
			},
            Summaries: {
                type: SummariesType
            },
			Stats: {
				type: StatsType
			}
        }
    });
}

module.exports = SelectType