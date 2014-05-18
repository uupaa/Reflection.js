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
        "length",
        "String.prototype.help",
        "Function.prototype.help"
    ];

// --- define ----------------------------------------------
// --- interface -------------------------------------------
function Reflection() {
}

Reflection["lang"] = ""; // Reference language. "", "en", "ja"

Reflection["repository"] = "https://github.com/uupaa/Reflection.js";

Reflection["addIgnoreKeyword"]      = Reflection_addIgnoreKeyword;      // Reflection.addIgnoreKeyword(keywords:StringArray):void

// --- path ---
Reflection["resolve"]               = Reflection_resolve;               // Reflection.resolve(target:Function|String, callback:Function = null):Object
// --- module ---
Reflection["getModuleRepository"]   = Reflection_getModuleRepository;   // Reflection.getModuleRepository(moduleName:String):String
// --- class ---
Reflection["getBaseClassName"]      = Reflection_getBaseClassName;      // Reflection.getBaseClassName(value):String
Reflection["getConstructorName"]    = Reflection_getConstructorName;    // Reflection.getConstructorName(value):String
// --- function ---
Reflection["getFunctionAttribute"]  = Reflection_getFunctionAttribute;  // Reflection.getFunctionAttribute(target:Function, name:String = "all"):Object
// --- link ---
Reflection["getSearchLink"]         = Reflection_getSearchLink;         // Reflection.getSearchLink(path:String):Object
Reflection["getReferenceLink"]      = Reflection_getReferenceLink;      // Reflection.getReferenceLink(path:String):Object

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
          //var name     = token1[0].replace(/\W+/g, "").trim();
            var type     = token3[0].trim();
          //var optional = token3.slice(1).join("=").trim();
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
    var code = sourceCode.trim();
    var lines = code.split("\n");
    var x = lines[0].indexOf("//");
    var i = 0, iz = lines.length;

    if (x >= 10) {
        for (; i < iz; ++i) {
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
    return path.trim().replace("#", ".prototype.");
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

function Reflection_getSearchLink(path) { // @arg String # "Object.freeze"
                                          // @ret Object # { title:String, url:URLString }
                                          // @desc get Google search link.
    //
    //  Google Search( Array.isArray ):
    //      http://www.google.com/search?lr=lang_ja&ie=UTF-8&oe=UTF-8&q=Array.isArray
    //
    return {
        "title": "Google Search( " + path + " ):",
        "url":   _createGoogleSearchURL(path)
    };
}

function _createGoogleSearchURL(keyword) { // @arg String # search keyword.
                                           // @ret String # "http://..."
    return "http://www.google.com/search?lr=lang_" +
                _getLanguage() + "&ie=UTF-8&oe=UTF-8&q=" +
                encodeURIComponent(keyword);
}

function Reflection_getReferenceLink(path) { // @arg String # "Object.freeze"
                                             // @ret Object # { title:String, url:URLString }
                                             // @desc get JavaScript/WebModule reference link.
    var className  = path.split(".")[0] || "";       // "Array.prototype.forEach" -> ["Array", "prototype", "forEach"] -> "Array"
    var repository = Reflection_getModuleRepository(className); // "https://github.com/uupaa/Help.js"

    //
    //  JavaScript API( Array.isArray ) Reference:
    //      http://www.google.com/search?btnI=I%27m+Feeling+Lucky&lr=lang_ja&ie=UTF-8&oe=UTF-8&q=MDN%20Array.isArray
    //
    //  WebModule Reference:
    //      https://github.com/uupaa/PageVisibilityEvent.js/wiki/PageVisibilityEvent#
    //
    if (/native code/.test(global[className] + "")) {
        return {
            "title": "JavaScript Reference( " + path + " ):",
            "url":   _createGoogleImFeelingLuckyURL(path, "MDN")
        };
    } else if (repository && /github/i.test(repository)) {
        return {
            "title": "WebModule Reference:",
            "url":   _createGitHubWikiURL(repository, className, path)
        };
    }
    return null;
}

function _createGoogleImFeelingLuckyURL(keyword,    // @arg String # search keyword.
                                        provider) { // @arg String # search providoer.
                                                    // @ret String # "http://..."
                                                    // @desc create I'm feeling lucky url
    return "http://www.google.com/search?btnI=I%27m+Feeling+Lucky&lr=lang_" +
                _getLanguage() + "&ie=UTF-8&oe=UTF-8&q=" + provider + "%20" +
                encodeURIComponent(keyword);
}

function _createGitHubWikiURL(baseURL,      // @arg String # "http://..."
                              wikiPageName, // @arg String # "Foo"
                              hash) {       // @arg String # "Foo#add"
    // replace characters
    //      space    -> "-"
    //      hyphen   -> "-"
    //      underbar -> "_"
    //      alphabet -> alphabet
    //      number   -> number
    //      other    -> ""
    //      unicode  -> encodeURIComponent(unicode)
    hash = hash.replace(/[\x20-\x7e]/g, function(match) {
                var result = / |-/.test(match) ? "-"
                           : /\W/.test(match)  ? ""
                           : match;

                return result;
            });

    // {baseURL}/wiki/{wikiPageName} or
    // {baseURL}/wiki/{wikiPageName}#{hash}
    var result = [];

    result.push( baseURL.replace(/\/+$/, ""), // remove tail slash
                 "/wiki/",
                 wikiPageName + "#" );

    if (wikiPageName !== hash) {
        result.push( "wiki-", encodeURIComponent(hash.toLowerCase()) );
    }
    return result.join("");
}

function _getLanguage() { // @ret String # "en", "ja" ...
    if (Reflection["lang"]) {
        return Reflection["lang"];
    }
    if (global["navigator"]) {
        return global["navigator"]["language"];
    }
    return "en";
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

