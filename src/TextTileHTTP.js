const graphqlHTTP = require('express-graphql');
let TextTileLanguage = require('../src/')

function TextTileHTTP(mapping, plugin) {
	let executor = new TextTileLanguage(mapping, plugin);
	return (req, res, next) => { 
		return graphqlHTTP({
			schema: executor.schema,
			graphiql: true,
			context: {mapping: mapping}
		})(req, res, next);
	}
}

module.exports = TextTileHTTP;
