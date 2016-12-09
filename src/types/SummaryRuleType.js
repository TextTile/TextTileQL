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

const OperationType = require("./OperationType")


const SummaryFieldType = new GraphQLEnumType({
	name: 'SummaryField',
	values: {
		Key: { value: "Key" },
		Count: { value: "Count"},
		Counts: {value: "Counts"},
		Score: { value: "Score" },
	}
});


const FieldType = require('./FieldType')
let cache;
let previousMapping;
const SummaryRuleType = function (mapping) {
	if(mapping == previousMapping && cache) {
		return cache;
	}
   
	previousMapping = mapping;
	cache =  new GraphQLInputObjectType({
        name: 'SummaryRule',
        fields: {
            field: {
                type: SummaryFieldType,
            },
            operation: {
                type: OperationType
            },
            value: {
                type: new GraphQLNonNull(new GraphQLList(GraphQLString))
            }
        }
    });
	return cache;
}

module.exports = SummaryRuleType