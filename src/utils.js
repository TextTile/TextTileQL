function parseQuery(ast) {
    result = parseSelection(ast.operation);
    console.log(result);
    return result;
}

function parseSelection(selection) {
    let result = {}
    if (selection.selectionSet) {
        for (let child of selection.selectionSet.selections) {
            result[child.name.value] = { keys: parseSelection(child) };
        }
    }
    return result;
}

module.exports = { parseQuery }