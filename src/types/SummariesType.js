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
const SummaryRuleType = require('./SummaryRuleType')

const IntervalType = new GraphQLEnumType({
	name: 'Interval',
	values: {
		Year: { value: "year" },
		Month: { value: "month" },
		Quarter: { value: "quarter" },
		Week: { value: "week" },
		Day: { value: "day" },
		Hour: { value: "hour" },
		Minute: { value: "minute" },
		Second: { value: "second" },
		
	}
});


const createSummaryFields = function (mapping = {}, resolvers = {}) {
	let fields = {};
    for (let key in mapping) {
        fields[key] = getFieldType(key, mapping[key], resolvers)
    }
	return fields;
}

const SummaryType = function (mapping = {}, resolvers = {}) {
	const Summary = new GraphQLObjectType({
		name: 'Summary',
		fields: () => {
			let fields = {};
			for (let key in mapping) {
				fields[key] = getFieldType(key, mapping[key], resolvers)
			}
			return fields;
		}
	}); 

	const Counts = new GraphQLObjectType({
		name: 'Counts',
		fields: () => {
			let fields = {};
			for (let key in mapping) {
				fields[key] = {type: GraphQLInt}
			}
			return fields;
		}
	}); 
	const TextSummary = new GraphQLObjectType({
		name: "TextSummary",
		fields: {
			Key: { type: GraphQLString },
			KeyAsString: { type: GraphQLString },
			Count: { type: GraphQLInt},
			Counts: {type: Counts},
			Score: { type: GraphQLInt },
			Summaries: { type: Summary }
		}
	})

	const getFieldType = (field, info, resolvers) => {
		let Type = TextSummary;
		return {
			type: new GraphQLList(Type),
			args: {
				skip: { type: GraphQLInt },
				limit: { type: GraphQLInt },
				interval: { type: IntervalType },
				filters: { type: new GraphQLList(SummaryRuleType(mapping)) },
				only: { type: new GraphQLList(GraphQLString) }
			},
			resolve: (obj = {}, args, context, ast) => {
				if (resolvers.summary) {
					return resolvers.summary(field, obj, args, context, ast)
				} else {
					return _.get(obj, `summaries.${field}`)
				}
			}
		}
	}

    
    return Summary;
}






module.exports = SummaryType