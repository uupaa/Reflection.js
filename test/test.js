var ModuleTestReflection = (function(global) {

var _inNode    = "process"        in global;
var _inWorker  = "WorkerLocation" in global;
var _inBrowser = "document"       in global;

return new Test("Reflection", {
        disable:    false,
        browser:    true,
        worker:     true,
        node:       true,
        button:     true,
        both:       true,
    }).add([
        testReflection_resolvePathToFunction,
        testReflection_resolveFunctionToPath,
        testReflection_unknown,
//ok    testReflection_invalidType,
        testReflection_syntaxHighlight,
    ]).run().clone();

function testReflection_resolvePathToFunction(test, pass, miss) {

    var result = Reflection.resolve("Object.freeze"); // { path, fn }

    if (result.path === "Object.freeze" &&
        result.fn   ===  Object.freeze) {
        test.done(pass());
    } else {
        test.done(miss());
    }
}

function testReflection_resolveFunctionToPath(test, pass, miss) {

    var result = Reflection.resolve(Object.freeze); // { path, fn }

    if (result.path === "Object.freeze" &&
        result.fn   ===  Object.freeze) {
        test.done(pass());
    } else {
        test.done(miss());
    }
}

function testReflection_unknown(test, pass, miss) {

    var result = Reflection.resolve("Unknown.keyword"); // { path, fn }

    if (result.path === "Unknown.keyword" &&
        result.fn   === null) {
        test.done(pass());
    } else {
        test.done(miss());
    }
}

/* ok
function testReflection_invalidType(test, pass, miss) {

    try {
        Reflection.resolve(/a/); // -> throw Error
        test.done(miss());
    } catch (o_o) {
        test.done(pass());
    }
}
 */

function testReflection_syntaxHighlight(test, pass, miss) {
    console.log.apply(console, Reflection.syntaxHighlight(Reflection.syntaxHighlight + "", "body"));

    if ( 1 ) {
        test.done(pass());
    } else {
        test.done(miss());
    }
}


})((this || 0).self || global);

