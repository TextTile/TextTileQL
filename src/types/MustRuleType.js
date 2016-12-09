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

const FieldType = require('./FieldType')
let cache;
let previousMapping;



const RuleType = function (mapping) {
	if(mapping == previousMapping && cache) {
		return cache;
	}
    
	previousMapping = mapping;

	let fields = {}

	for (let key in mapping) {
		fields[key] = {
			type: new GraphQLList(GraphQLString)
		}
	}

	cache =  new GraphQLInputObjectType({
        name: 'MustRule',
        fields: fields
    });
	return cache;
}

module.exports = RuleType