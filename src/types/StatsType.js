const {
    graphql,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLBoolean,
    GraphQLList,
    GraphQLInt,
	GraphQLEnumType
} = require('graphql');
const _ = require('lodash')
const FieldType = require('./FieldType')
const DocumentType = require('./DocumentType')


const StatsType = function (mapping = {}, resolvers = {}) {
	const Summary = new GraphQLObjectType({
		name: 'Stats',
		fields: () => {
			let fields = {};
			for (let key in mapping) {
				fields[key] = getFieldType(key, mapping[key], resolvers)
			}
			return fields;
		}
	}); 

	const StatsFields = new GraphQLObjectType({
		name: "StatsFields",
		fields: {
			Count: { type: GraphQLString},
			Min: { type: GraphQLString },
			Max: { type: GraphQLString },
			Avg: { type: GraphQLString },
			Sum: { type: GraphQLString },
			MinAsString: { type: GraphQLString },
			MaxAsString: { type: GraphQLString },
			AvgAsString: { type: GraphQLString },
			SumAsString: { type: GraphQLString },
		}
	})

	const getFieldType = (field, info, resolvers) => {
		let Type = StatsFields;
		return {
			type: Type,
			resolve: (obj = {}, args, context, ast) => {
				
				if (resolvers.stats) {
					let result = resolvers.stats(field, obj, args, context, ast);
					return resolvers.stats(field, obj, args, context, ast)	
				} else {
					return _.get(obj, `stats.${field}`)
				}
			}
		}
	}

    
    return Summary;
}






module.exports = StatsType