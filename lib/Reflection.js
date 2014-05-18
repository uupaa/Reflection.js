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

Reflection["addIgnoreKeyword"]      = Reflection_addIgnoreKeyword;      // Reflection.addIgnoreKeyword(keywords:StringArray):void

// --- path ---
Reflection["resolve"]               = Reflection_resolve;               // Reflection.resolve(target:Function|String, callback:Function = null):Object

// --- module ---
Reflection["getModuleRepository"]   = Reflection_getModuleRepository;   // Reflection.getModuleRepository(moduleName:String):String

// --- function ---
Reflection["getFunctionAttribute"]  = Reflection_getFunctionAttribute;  // Reflection_getFunctionAttribute(target:Function, name:String = "all"):Object

// --- class ---
Reflection["getBaseClassName"]      = Reflection_getBaseClassName;      // Reflection.getBaseClassName(value):String
Reflection["getConstructorName"]    = Reflection_getConstructorName;    // Reflection.getConstructorName(value):String

// --- implement -------------------------------------------
function Reflection_addIgnoreKeyword(keywords) { // @arg StringArray
    Array.prototype.push.apply(_ignoreKeyword, keywords);
}

function Reflection_resolve(target,     // @arg Function|String # target function. eg: Object.freeze or "Object.freeze"
                            callback) { // @arg Function = null # callback at the timing attaching and detaching the accessor.
                                        //                        callback(detach:Boolean):void
                                        // @ret Object # { path, fn }
                                        //              return.path - String: function absoulute path. eg: ["Object", "freeze"]
                                        //              return.fn   - Function: function. eg: Object.freeze
                                        // @desc resolve function absolute path.

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

function _convertPathToFunction(target) { // @arg String        # function path. eg: "Object.freeze"
                                          // @ret Function|null # eg: Object.freeze
    return target.split(".").reduce(function(parent, token) {
                if (parent && token in parent) {
                    return parent[token];
                }
                return null;
            }, global);
}

function _convertFunctionToPath(target) { // @arg Function  # function. eg: Object.freeze
                                          // @ret String    # function path. eg: "Object.freeze"
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

function Reflection_getFunctionAttribute(target, // @arg Function
                                         name) { // @arg String = "all"
                                                 // @ret Object # { attrName: { types, optional, comment }, ... }
    var result = {};
    var sourceCode = target + "";
    var head = _splitFunctionDeclaration(sourceCode)["head"]; // { head, body }

    switch (name || "all") {
    case "all":
        _getArg(head, result);
        _getRet(head, result);
        break;
    case "arg":
        _getArg(head, result);
        break;
    case "ret":
        _getRet(head, result);
        break;
    }
    return result;
}

function _getArg(head,     // @arg StringArray # [line, ...]
                 result) { // @arg Object
                           // @ret Object # result + { "arg": [{ name, type, optional, comment }, ...] }
    // get @arg attribute.
    //
    //      function Foo_add(name,     // @arg Function|String = "" # comment
    //                       key   ) { // @arg String = ""          # ...
    //                                 // @ret ResultType           # ...
    //                       ~~~~~             ~~~~~~~~~~~~~~~   ~~   ~~~~~~~
    //                       name              type              opt  comment
    //      }

    result["arg"] = [];

    head.forEach(function(line, index) {
        if (/@arg|@var_args|@param/.test(line)) {
            if (index === 0) {
                line = _removeFunctionDeclarationString(line);
            }
            var token1   = line.split(/@arg|@var_args|@param/); // ["(name,  // ", ' Function|String = "" # comment']
            var token2   = token1[1].split("#");                // ['Function|String = ""', " comment"]
            var token3   = token2[0].split("=");                // ["Function|String ", ' ""']
            var name     = token1[0].replace(/\W+/g, "").trim();
            var type     = token3[0].trim();
            var optional = token3.slice(1).join("=").trim();
            var comment  = token2.slice(1).join("#").trim();

            result["arg"].push({ "name": name, "type": type,
                                 "optional": optional, "comment": comment });
        }
    });
    return result;
}

function _getRet(head,     // @arg StringArray # [line, ...]
                 result) { // @arg Object
                           // @ret Object # { "ret": { types, comment }, ... }
    // get @ret attribute.
    //
    //      function Foo_add(name,     // @arg Function|String = "" # comment
    //                       key   ) { // @arg String = ""          # ...
    //                                 // @ret ResultType           # ...
    //                                         ~~~~~~~~~~~~~~~        ~~~~~~~
    //                                         type                   comment
    //      }

    result["ret"] = [];

    head.forEach(function(line, index) {
        if (/@ret|@return|@returns/.test(line)) {
            if (index === 0) {
                line = _removeFunctionDeclarationString(line);
            }
            var token1   = line.split(/@ret|@return|@returns/); // ["(name,  // ", ' Function|String = "" # comment']
            var token2   = token1[1].split("#");                // ['Function|String = ""', " comment"]
            var token3   = token2[0].split("=");                // ["Function|String ", ' ""']
            var name     = token1[0].replace(/\W+/g, "").trim();
            var types    = token3[0].trim();
            var optional = token3.slice(1).join("=").trim();
            var comment  = token2.slice(1).join("#").trim();

            result["ret"].push({ "type": type, "comment": comment });
        }
    });
    return result;
}

function _splitFunctionDeclaration(sourceCode) { // @arg String # function code
                                                 // @ret Object # { head:StringArray, body:StringArray }
    //
    //  sourceCode:
    //
    //      "function foo() { // @ret String\n
    //          return '';\n
    //      }"
    //
    //  result: {
    //      head: [
    //          "function foo() { // @ret String"
    //      ],
    //      body: [
    //          "    return '';",
    //          "}"
    //      ]
    //  }
    //
    var code  = sourceCode.trim();
    var lines = code.split("\n");
    var x     = lines[0].indexOf("//");

    if (x >= 10) {
        for (var i = 0, iz = lines.length; i < iz; ++i) {
            if (lines[i].indexOf("//") !== x) {
                break;
            }
        }
    }
    return { "head": lines.slice(0, i), "body": lines.slice(i) };
}

function _removeFunctionDeclarationString(sourceCode) { // @arg String
                                                        // @ret String
    //
    //  sourceCode:
    //      "function xxx(...) { }"
    //
    //  result:
    //                  "(...) { }"
    //
    return sourceCode.replace(/^function\s+[^\x28]+/, "");
}

function _extractSharp(path) { // @arg String # "Array#forEach"
                               // @ret String # "Array.prototype.forEach"
    return path.trim().replace("#", ".prototype.")
}

function Reflection_getModuleRepository(moduleName) { // @arg String # path. "Reflection"
                                                      // @ret String #
                                                      // @desc get WebModule repository url.
    if (moduleName in global) {
        var repository = global[moduleName]["repository"] || "";

        if (repository) {
            return repository.replace(/\/+$/, ""); // trim tail slash
        }
    }
    return ""; // global[moduleName] not found
}

function Reflection_getBaseClassName(value) { // @arg Any # instance, exclude null and undefined.
                                              // @ret String
    // Object.prototype.toString.call(new Error());     -> "[object Error]"
    // Object.prototype.toString.call(new TypeError()); -> "[object Error]"
    return Object.prototype.toString.call(value).split(" ")[1].slice(0, -1); // -> "Error"
}

function Reflection_getConstructorName(value) { // @arg Any # instance, exclude null and undefined.
                                                // @ret String
    // Reflection_getConstructorName(new (function Aaa() {})); -> "Aaa"
    return value.constructor["name"] ||
          (value.constructor + "").split(" ")[1].split("\x28")[0]; // for IE
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

