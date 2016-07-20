const {
    graphql,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLBoolean,
    GraphQLUnionType,
    GraphQLList,
    GraphQLInputObjectType,
    GraphQLEnumType,
    GraphQLNonNull
} = require('graphql');



const RuleType = function (mapping) {
    var OperationType = new GraphQLEnumType({
        name: 'Operation',
        values: {
            in: { value: "in" },
            contains: { value: "contains" },
            between: { value: "between" },
            is: { value: "is" }
        }
    });

    let fields = {};
    for (let key in mapping) {
        fields[key] = {
            value: mapping[key]
        }
    }

    var FieldType = new GraphQLEnumType({
        name: 'Field',
        values: fields
    });

    return new GraphQLInputObjectType({
        name: 'Rule',
        fields: {
            field: {
                type: new GraphQLNonNull(FieldType),
            },
            operation: {
                type: new GraphQLNonNull(OperationType)
            },
            value: {
                type: new GraphQLNonNull(new GraphQLList(GraphQLString))
            }
        }
    });
}

module.exports = RuleType