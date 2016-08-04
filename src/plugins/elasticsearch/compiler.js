function compile(info) {
    let query = {};
    if (info.filters) {
        query.query = getFilters(info.filters); 
    }
	if(info.search) {
		if(!query.query || !query.query.bool) {
			query.query = { bool: { filter: [] } };
		}
		query.query.bool.filter.push({
			query_string : {
				query : info.search,
				fields: getTextFields(info.mapping)
			}
		})
	}
	if(info.search || info.filters) {
		query.highlight = getHighlight(info.mapping);
	}

    if(info.summaries) {
        query.aggs = {}
        let agg2 = compileSummaries(info.summaries, !!info.filters);
		query.aggs = compileSummaries(info.summaries, !!info.filters);
    }
    return query
}

function compileSummaries(summaries, hasFilters, group) {
	let result = {};
	for (let key in summaries) {
		let agg = getAggsField(summaries[key], hasFilters)
		if(summaries[key].summaries) {
			agg.aggs = compileSummaries(summaries[key].summaries, true, 'Summaries')
		}
		if(summaries[key].Counts) {
			agg.aggs = agg.aggs || {};
			for(let field in summaries[key].Counts) {
				agg.aggs[`Counts${field}`] = { cardinality : {field: summaries[key].Counts[field].info.field}}
				agg.aggs[`Counts${field}`].meta = { group: 'Counts'}
			}
		}
		agg.meta = { group }
		if(!group) {
			result[key] = agg
		} else {
			result[`Summaries${key}`] = agg
		}
	}
	return result;
}

function getHighlight(mapping) {
	const high = { fields : {} };
	for (let rule in mapping) {
		const obj = mapping[rule];
		if(obj.type === 'Text') {
			high.fields[rule] = {}
		}
	}
	return high;
}


function getTextFields(mapping) {
	const fields = [];
	for (let rule in mapping) {
		const obj = mapping[rule];
		if(obj.type === 'Text') {
			fields.push(rule)
		}
	}
	return fields;
}

function getFilters(filters) {
    if (filters) {
        let result = { bool: { filter: [] } };
        for (let rule of filters) {
            result.bool.filter.push(getFilterRule(rule));
        }
        return result;
    }
    return undefined;
}

function getAggsField(fieldInfo, hasFilters) {
        try {
            let {field, type} = fieldInfo.info;
            let {limit, order, include,exclude, min_doc_count, significant, background_filter, interval} = fieldInfo.args || {};
			exclude = exclude || [];

            switch (type) {
                case "List.String":
                case "String":
                    return {
                        "terms": {
                            "field": field,
                            "size": limit || 50,
                            "order": order,
                            "include": include,
							"collect_mode" : "breadth_first",
                            "min_doc_count": min_doc_count || 1
                        }
                    };
                    
                case  "Text":
                    significant = false;
                    if(significant) {
                        return {
                            "significant_terms": {
                                "field": field,
								"collect_mode" : "breadth_first",
                                "gnd": {},
                               // "script_heuristic": {
                                //    "script": "_subset_freq/_subset_size * Math.log(_superset_size/_superset_freq)"
                                //},
                               //  "script_heuristic": {
                               //     "script": "_subset_freq"
                               // },
                                "include": include,
                                "exclude": '.*[0-9].*',
                                "size": limit || 50,
                                
                                "background_filter": background_filter
                            }
                        };
                    }
                    return {
                        "terms": {
                            "field": field,
                            "include": include,
                            "exclude": exclude,
							"collect_mode" : "breadth_first",
                            "size": limit || 50,
                            "order": order,
                            "min_doc_count": min_doc_count || 1
                        }
                    };
                    
                case  "Number":
                    return {
                        "histogram": {
                            "field": field,
                            "interval": interval || 1,
                            "order": order
                        }
                    };
                    
                case  "CONTINUOUS":
                    return {
                        "histogram": {
                            "field": field,
                            "interval": interval || 1,
                            "order": order
                        }
                    };
                    
                case  "Date":
                    return {
                        "date_histogram": {
                            "field": field,
                            "interval": interval || "month",
                            "format": getDateFormat(interval || "month")
                        }
                    };
                    
                case  "Boolean":
                    return {
                        "terms": {
                            "field": field
                        }
                    };
                    
            }
        } catch(ex) {
            console.error(ex);
        }
    }

function getFilterRule(rule) {
    try {
        let {operation, value} = rule;
        let {field, type} = rule.field;
        switch (operation) {
            case "in":
                let keys = value;
                keys = keys.concat(value.map(k => cammel(k)))
                keys = keys.concat(value.map(k => k.toLowerCase()))
                keys = keys.concat(value.map(k => k.toUpperCase()))
                keys = keys.concat(value.map(k => cammel(k.toLowerCase())))
                return { "terms": { [field]: keys } };


            case "contains":
                return { "query_string": { "default_field": field, "query": value } };


            case "between":
                if (type == "Date")
                    return {
                        "range": {
                            [field]: {
                                "gte": value[0],
                                "lte": value[1],
                                "format": "yyyy-mm-dd"
                            }
                        }
                    };
                else
                    return {
                        "range": {
                            [field]: {
                                "gte": value[0],
                                "lte": value[1]
                            }
                        }
                    };


            case "is":
                return { "term": { [field]: value[0] } };
        }
        return {};
    } catch (ex) {
        console.trace(ex);
    }
}

function cammel(str) {
    return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
}

function getDateFormat(interval) {
        switch (interval) {
            case "year":
                return "yyyy";
            case "month":
            case "quarter":
                return "MM/yyyy";
            case "week":
            case "day":
                return "dd/MM/yyyy";
            case "hour":
                return "dd/MM - hh:mm a";
            case "minute":
                return "hh:mm a";
            case "second":
                return "hh:mm:ss a";
        }
    }

module.exports = { compile }