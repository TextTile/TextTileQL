const {
    graphql,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLBoolean,
    GraphQLList,
} = require('graphql');


const build = function build(mapping, schemaLoader) {
    return Promise.resolve(schemaLoader).then(info => {
		try {
			const {resolvers} = info;
			const RuleType = require('./types/RuleType')
			const MustRuleType = require('./types/MustRuleType')
			const SelectType = require('./types/SelectType')(mapping, resolvers);
			const DocumentType = require('./types/DocumentType')(mapping, resolvers)
			return new GraphQLSchema({
				query: new GraphQLObjectType({
					name: 'TextTile',
					fields: {
						check: {
							type: GraphQLBoolean,
							resolve() {
								return true;
							}
						},
						Document: {
							type: DocumentType,
							resolve: resolvers.document,
							args: {
								id: { type: GraphQLString }
							}
						},
						Select: {
							type: SelectType,
							resolve: resolvers.select,
							args: {
								filters: { type: new GraphQLList(RuleType(mapping)), description: "filters in the data", deprecationReason: "Replaced with Must", isDeprecated: true },
								must: {type: new GraphQLList(MustRuleType(mapping))},
								not: {type: new GraphQLList(MustRuleType(mapping))},
								search: { type: GraphQLString }
							},
						}
					}
				})
			});
		} catch (error) {
			console.error(error);
		}
	});
}

module.exports = { build };