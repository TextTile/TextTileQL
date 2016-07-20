var expect = require('chai').expect;
require('dotenv').config({path: process.cwd()+ '/test/test.env'});
const mlog = require('mocha-logger');
const {printSchema} = require('graphql')
mlog.json = function(obj) {
    mlog.log(JSON.stringify(obj))
}

let TextTileLanguage = require('../src/')
let ESPlugin = require('../src/plugins/elasticsearch/') 

const dataInfo = require('../src/examples/enron.json')

const TextTileExecutor = () => {
    let Executor = new TextTileLanguage(dataInfo.mapping, new ESPlugin(dataInfo.config))
    return Executor.ready.then(() => Executor);
}  

describe('ES-Plugin',  function() {
    this.timeout(5000);
    it('Should set configuration', function() {
        return TextTileExecutor().then(Executor => {
            expect(Executor).to.have.deep.property('_adapter.config.server', 'vgc.poly.edu/projects/es-gateway');
        })
    })

    it('Should generate schema', () => {
        return TextTileExecutor().then(Executor => {
           printSchema(Executor.schema);
        })
    })

    it('Should query check', () => {
        return TextTileExecutor().then(Executor => {
            return Executor.query('{check}').then((result) => {
                expect(result).to.eql({ data: { check: true }});
            }).catch((error) => {throw error})
        })
    })
    it('Should Select', () => {
        return TextTileExecutor().then(Executor => {
            return Executor.query('{Select { Documents { Contents } }}').then((result) => {
                if(result.errors) {
                    throw Error(result.errors)
                } else {
                    expect(result).to.have.deep.property('data.Select.Documents');
                }
            }).catch((error) => {throw error})
        })
    })
});