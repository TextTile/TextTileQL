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


let cache;
const FieldType = function (mapping) {
	if(cache) return cache;

	let fields = {};
	for (let key in mapping) {
		fields[key] = {
			value: mapping[key]
		}
	}

	cache = new GraphQLEnumType({
		name: 'Field',
		values: fields
	});
	return cache;
}


module.exports = FieldType