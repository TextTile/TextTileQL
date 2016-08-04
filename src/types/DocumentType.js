
try {
	const _ = require('lodash')
	let cache;
	const {
		graphql,
		GraphQLSchema,
		GraphQLObjectType,
		GraphQLString,
		GraphQLBoolean,
		GraphQLList
	} = require('graphql');

	const getType = (type) => {
		switch (type) {
			case "String":
			case "Text":
			case "Date":
				return GraphQLString;
			case "List.String":
				return new GraphQLList(GraphQLString);
			case "Number":
				return GraphQLString;
		}
	}

	const HighlightType = new GraphQLObjectType({
		name: "Highlight",
		fields: {
			field: { type: GraphQLString },
			texts: { type: new GraphQLList(GraphQLString) }
		}
	})



	const DocumentType = function (mapping, resolvers) {
		if(cache) {
			return cache;
		}
		let fields = {};
		fields._id_ = {
			type: GraphQLString,
			resolve: (obj) => {
				return obj._id_
			}
		}
		fields._highlights_ = {
			type: new GraphQLList(HighlightType),
			resolve: (obj) => {
				return obj._highlights_
			}
		}
		for (let key in mapping) {
			fields[key] = {
				type: getType(mapping[key].type),
				resolve: (obj) => {
					return _.get(obj, mapping[key].field)
				}
			}



			if (mapping[key].NLP) {
				let fieldsNLP = {};
				for (let keyNLP in mapping[key].NLP) {
					fieldsNLP[keyNLP] = {
						type: getType(mapping[key].NLP[keyNLP].type),
						resolve: (obj) => {
							return "yes"; //_.get(obj, mapping[key].NLP[keyNLP].field)
						}
					}
				}
				let fieldsNLPType = new GraphQLObjectType({
					name: `Document${key}_NLP`,
					fields: fieldsNLP
				})
				fields[key + "_NLP"] = { type: fieldsNLPType }

			}

		}
		cache = new GraphQLObjectType({
			name: "Document",
			fields: fields
		})
		return cache;
	}

	module.exports = DocumentType
} catch (error) {
	console.error(error);
}
