function compile(info) {
    let query = {};
    if (info.filters) {
        query.query = getFilters(info.filters); 
    }
    if(info.summaries) {
        query.aggs = {}
        
        for (let key in info.summaries) {
            let agg = getAggsField(info.summaries[key])
            query.aggs[key] = agg
        }
    }
    return query
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

function getAggsField(fieldInfo) {
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
                            "size": limit || 1000,
                            "order": order,
                            "include": include,
                            "min_doc_count": min_doc_count || 1
                        }
                    };
                    
                case  "Text":
                    //significant = false;
                    if(significant) {
                        return {
                            "significant_terms": {
                                "field": field,
                                "mutual_information": {},
                               // "script_heuristic": {
                                //    "script": "_subset_freq/_subset_size * Math.log(_superset_size/_superset_freq)"
                                //},
                               //  "script_heuristic": {
                               //     "script": "_subset_freq"
                               // },
                                "include": include,
                                "exclude": exclude,
                                "size": limit || 50,
                                //"min_doc_count": min_doc_count || 1,
                                "background_filter": background_filter
                            }
                        };
                    }
                    return {
                        "terms": {
                            "field": field,
                            "include": include,
                            "exclude": exclude,
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