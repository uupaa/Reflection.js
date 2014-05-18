(function(global) {
"use strict";

// --- dependency module -----------------------------------
// --- local variable --------------------------------------
var _inNode = "process" in global;

var _ignoreKeyword = [
        "webkitStorageInfo",
        "Infinity",
        "NaN",
        "arguments",
        "caller",
        "callee",
        "buffer",
        "byteOffset",
        "byteLength", // DataView, ArrayBuffer, Float32Array, ...
        "length"
    ];

// --- define ----------------------------------------------
// --- interface -------------------------------------------
function Reflection() {
}

Reflection["repository"] = "https://github.com/uupaa/Reflection.js";

Reflection["addIgnoreKeyword"]     = Reflection_addIgnoreKeyword;     // Reflection.addIgnoreKeyword(key:String):void
Reflection["resolve"]              = Reflection_resolve;              // Reflection.resolve(target:Function|String, callback:Function = null):Object
//Reflection["getFunctionAttribute"] = Reflection_getFunctionAttribute; // Reflection.getFunctionAttribute(target:Function, name:String):Array
Reflection["getModuleRepository"]  = Reflection_getModuleRepository;  // Reflection.getModuleRepository(moduleName:String):String

// --- implement -------------------------------------------
function Reflection_addIgnoreKeyword(keywords) { // @arg KeywordStringArray:
    Array.prototype.push.apply(_ignoreKeyword, keywords);
}

function Reflection_resolve(target,     // @arg Function|String: target function. eg: Object.freeze or "Object.freeze"
                            callback) { // @arg Function(= null): callback at the timing attaching and detaching the accessor.
                                        //                        callback(detach:Boolean):void
                                        // @ret Object: { path, fn }
                                        //      return.path - String: function absoulute path. eg: ["Object", "freeze"]
                                        //      return.fn   - Function: function. eg: Object.freeze
                                        // @desc: resolve function absolute path.

//{@dev
    if (!/function|string/.test(typeof target)) {
        throw new Error("Reflection.resolve(target): target is not Function or String.");
    }
//}@dev

    var path = "";
    var fn = null;

    switch (typeof target) {
    case "function":
        if (callback) {
            callback(true);
        }
        path = _convertFunctionToPath(target);
        if (callback) {
            callback(false);
        }
        return { "path": path, "fn": target };
    case "string":
        path = _extractSharp(target);
        fn   = _convertPathToFunction(path);
        return { "path": path, "fn": fn };
    }
    return { "path": path, "fn": fn };
}

function _convertPathToFunction(target) { // @arg String: function path. eg: "Object.freeze"
                                          // @ret Function/null: eg: Object.freeze
    return target.split(".").reduce(function(parent, token) {
                if (parent && token in parent) {
                    return parent[token];
                }
                return null;
            }, global);
}

function _convertFunctionToPath(target) { // @arg Function: function. eg: Object.freeze
                                          // @ret String: function path. eg: "Object.freeze"
    var resultPath = "";
    var keys = Object["getOwnPropertyNames"] || Object["keys"];
    var globalIdentities = keys(global).sort();

    globalIdentities.unshift("Object", "Function", "Array", "String", "Number"); // inject
    globalIdentities.some(_resolvePath);
    return resultPath.replace(/^global\./i, "");


    function _resolvePath(className) {
        var path = "";

        try {
            if (_ignoreKeyword.indexOf(className) >= 0) {
                return false;
            }
            if ( !/object|function/.test(typeof global[className]) ) {
                return false;
            }
            if (global[className] === target) {
                resultPath = className;
                return true; // resolve
            }

            // find. global[className][key]
            try {
                keys(global[className]).some(function(key) {
                    path = className + "." + key;

                    if (_ignoreKeyword.indexOf(path) >= 0 ||
                        _ignoreKeyword.indexOf(key)  >= 0) {
                        return false;
                    }
                    if (global[className][key] === target) {
                        resultPath = path;
                        return true; // resolve
                    }
                    return false;
                });
            } catch (o_o) {
                debugger;
            }

            if (resultPath) {
                return true;
            }

            // find. global[className].prototype[key]
            try {
                if ("prototype" in global[className] ) {
                    keys(global[className]["prototype"]).some(function(key) {
                        path = className + ".prototype." + key;

                        if (_ignoreKeyword.indexOf(path) >= 0 ||
                            _ignoreKeyword.indexOf(key)  >= 0) {
                            return false;
                        }
                        if (global[className]["prototype"][key] === target) {
                            resultPath = path;
                            return true; // resolve
                        }
                        return false;
                    });
                }
            } catch (o_o) {
                debugger;
            }
        } catch (o_o) {
            debugger;
        }

        return resultPath;
    }
}

/*
function Reflection_getFunctionAttribute(target, // @arg Function:
                                         name) { // @arg String:
                                                 // @ret Array:
//{@dev
    if (!/function/.test(typeof target)) {
        throw new Error("Reflection.getFunctionAttribute(target): target is not Function.");
    }
    if (!/string/.test(typeof name)) {
        throw new Error("Reflection.getFunctionAttribute(, name): name is not String.");
    }
//}@dev

    switch (name) {
    case "help":
        return [_getHelpAttribute(target)];
    }
    return [];
}
 */

/*
function _getHelpAttribute(target) {

    // get @help attribute.
    //
    //      function Foo_add() { @help: Foo#add
    //          ...                     ~~~~~~~
    //      }

    var match = /@help:\s*([^\n\*]+)\n?/.exec("\n" + target + "\n"); // ["@help: Foo#add", "Foo#add"]

    if (match && match[1]) {
        return _extractSharp(match[1].split(",")[0]); // "Foo.prototype.add"
    }
    return "";
}
 */

function _extractSharp(path) { // @arg String: "Array#forEach"
                               // @ret String: "Array.prototype.forEach"
    return path.trim().replace("#", ".prototype.")
}

function Reflection_getModuleRepository(moduleName) { // @arg String: path. "Reflection"
                                                      // @ret String:
                                                      // @desc: get WebModule repository url.
    if (moduleName in global) {
        var repository = global[moduleName]["repository"] || "";

        if (repository) {
            return repository.replace(/\/+$/, ""); // trim tail slash
        }
    }
    return ""; // global[moduleName] not found
}

// --- export ----------------------------------------------
if (_inNode) {
    module["exports"] = Reflection;
}
if (global["Reflection"]) {
    global["Reflection_"] = Reflection; // secondary
} else {
    global["Reflection"]  = Reflection; // primary
}

})((this || 0).self || global); // WebModule idiom

