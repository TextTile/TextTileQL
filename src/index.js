const schema = require('./schema')
const { graphql } = require('graphql')

class TextTileLanguage {
    constructor(mapping, adapter) {
        console.log("working")
        this._adapter = adapter;
        this.mapping = mapping;
        this.ready = Promise.all([
            schema.build(mapping, adapter.getSchema()).then(schema => {
                this.schema = schema;
                return schema;
            })
        ])
    }

    query(query) {
        return this.ready.then(() => {
            return graphql(this.schema, query, {mapping: this.mapping});
        })
    }
}

module.exports = TextTileLanguage
