(function(global) {
"use strict";

// --- dependency module -----------------------------------
// --- local variable --------------------------------------
var _inNode = "process" in global;

// --- define ----------------------------------------------
var BLACK_LIST = ["webkitStorageInfo", "Infinity", "NaN",
                  "arguments", "caller", "callee",
                  "buffer", "byteOffset", "byteLength", "length"];

// --- interface -------------------------------------------
function Reflection() { // @help: Reflection
}

Reflection["repository"] = "https://github.com/uupaa/Reflection.js";

Reflection["resolve"] = Reflection_resolve; // Reflection.resolve(target:Function|String, callback:Function = null):Object

// --- implement -------------------------------------------
function Reflection_resolve(target,     // @arg Function|String: target function. eg: Object.freeze or "Object.freeze"
                            callback) { // @arg Function(= null): callback at the timing attaching and detaching the accessor.
                                        //                        callback(attach:Boolean):void
                                        // @ret Object: { path, fn }
                                        //      return.path - String: function absoulute path. eg: ["Object", "freeze"]
                                        //      return.fn   - Function: function. eg: Object.freeze
                                        // @desc: resolve function absolute path.
                                        // @help: Reflection.resolve

//{@dev
    if (!/function|string/.test(typeof target)) {
        throw new Error("Reflection.resolve(target): target is not a Function or String.");
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
        path = target.trim().replace("#", ".prototype.");
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
    var path = "";
    var keys = Object["getOwnPropertyNames"] || Object["keys"];
    var globalIdentities = keys(global).sort();

    globalIdentities.unshift("Object", "Function", "Array", "String", "Number"); // inject
    globalIdentities.some(_resolvePath);
    return path.replace(/^global\./i, "");


    function _resolvePath(className) {
        try {
            if (BLACK_LIST.indexOf(className) >= 0) { // ignore
                return false;
            }
            if ( !/object|function/.test(typeof global[className]) ) {
                return false;
            }
            if (global[className] === target) {
                path = className;
                return true; // resolve
            }

            // find. global[className][key]
            try {
                keys(global[className]).some(function(key) {
                    if (BLACK_LIST.indexOf(key) >= 0) { // ignore
                        return false;
                    }
                    if (global[className][key] === target) {
                        path = className + "." + key;
                        return true; // resolve
                    }
                    return false;
                });
            } catch (o_o) { }

            if (path) {
                return true;
            }

            // find. global[className].prototype[key]
            try {
                if ("prototype" in global[className] ) {
                    keys(global[className]["prototype"]).some(function(key) {
                        if (BLACK_LIST.indexOf(key) >= 0) { // ignore
                            return false;
                        }
                        if (global[className]["prototype"][key] === target) {
                            path = className + ".prototype." + key;
                            return true; // resolve
                        }
                        return false;
                    });
                }
            } catch (o_o) { }
        } catch (o_o) { }

        return path;
    }
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

