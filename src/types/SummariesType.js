const {
    graphql,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLBoolean,
    GraphQLList,
    GraphQLInt
} = require('graphql');
const _ = require('lodash')
const TextSummary = new GraphQLObjectType({
    name: "TextSummary",
    fields: {
        Key: { type: GraphQLString },
        Count: { type: GraphQLInt }
    }
})

function getFieldType(field, info, resolvers) {
    let Type = TextSummary;
    return {
        type: new GraphQLList(Type),
        resolve: (obj = {}, args, context, ast) => {
            if (resolvers.summary) {
                return resolvers.summary(field, obj, args, context, ast)
            } else {
                return _.get(obj, `summaries.${field}`)
            }
        }
    }

}

const SummaryType = function (mapping = {}, resolvers = {}) {
    let fields = {};
    for (let key in mapping) {
        fields[key] = getFieldType(key, mapping[key], resolvers)
    }
    return new GraphQLObjectType({
        name: 'Summary',
        fields: fields
    });
}

module.exports = SummaryType