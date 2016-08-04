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

const FieldType = require('./FieldType')
let cache;
let previousMapping;
const RuleType = function (mapping) {
	if(mapping == previousMapping && cache) {
		return cache;
	}
    var OperationType = new GraphQLEnumType({
        name: 'Operation',
        values: {
            in: { value: "in" },
            contains: { value: "contains" },
            between: { value: "between" },
            is: { value: "is" }
        }
    });

	previousMapping = mapping;
	cache =  new GraphQLInputObjectType({
        name: 'Rule',
        fields: {
            field: {
                type: new GraphQLNonNull(FieldType(mapping)),
            },
            operation: {
                type: new GraphQLNonNull(OperationType)
            },
            value: {
                type: new GraphQLNonNull(new GraphQLList(GraphQLString))
            }
        }
    });
	return cache;
}

module.exports = RuleType