const {
    graphql,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLBoolean,
    GraphQLList
} = require('graphql');



const SelectType = function (mapping = {}, resolvers = {}) {
    const DocumentType = require('./DocumentType')(mapping, resolvers)
    const SummariesType = require('./SummariesType')(mapping, resolvers)
    return new GraphQLObjectType({
        name: 'Select',
        fields: {
            Documents: {
                type: new GraphQLList(DocumentType),
                resolve: resolvers.documents || ((obj = {}, args, context, ast) => {
                    return obj.documents
                })
            },
            Summaries: {
                type: SummariesType
            }
        }
    });
}

module.exports = SelectType