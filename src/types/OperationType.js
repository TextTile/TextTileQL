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

var OperationType = new GraphQLEnumType({
	name: 'Operation',
	values: {
		in: { value: "in" },
		contains: { value: "contains" },
		between: { value: "between" },
		is: { value: "is" }
	}
});

module.exports = OperationType