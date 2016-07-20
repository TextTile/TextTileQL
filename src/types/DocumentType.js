const _ = require('lodash')
const {
    graphql,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLBoolean,
    GraphQLList
} = require('graphql');

function getType(type) {
    switch(type) {
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

const DocumentType = function(mapping, resolvers) {
    let fields = {};
    for(let key in mapping) {
        fields[key] = {
            type: getType(mapping[key].type),
            resolve: (obj) => {
                return _.get(obj, mapping[key].field)
            }
        }
        
        if (mapping[key].NLP) {
            let fieldsNLP = {};
            for(let keyNLP in mapping[key].NLP) {
                fieldsNLP[keyNLP] = {
                    type: getType(mapping[key].NLP[keyNLP].type),
                    resolve: (obj) => {
                        console.log(mapping[key].NLP[keyNLP].field);
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

    return new GraphQLObjectType({
        name: "Document",
        fields: fields
    })
}

module.exports = DocumentType
