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

function testReflection_resolvePathToFunction(next) {

    var result = Reflection.resolve("Object.freeze"); // { path, fn }

    if (result.path === "Object.freeze" &&
        result.fn   ===  Object.freeze) {
        next && next.pass();
    } else {
        next && next.miss();
    }
}

function testReflection_resolveFunctionToPath(next) {

    var result = Reflection.resolve(Object.freeze); // { path, fn }

    if (result.path === "Object.freeze" &&
        result.fn   ===  Object.freeze) {
        next && next.pass();
    } else {
        next && next.miss();
    }
}

function testReflection_unknown(next) {

    var result = Reflection.resolve("Unknown.keyword"); // { path, fn }

    if (result.path === "Unknown.keyword" &&
        result.fn   === null) {
        next && next.pass();
    } else {
        next && next.miss();
    }
}

/* ok
function testReflection_invalidType(next) {

    try {
        Reflection.resolve(/a/); // -> throw Error
        next && next.miss();
    } catch (o_o) {
        next && next.pass();
    }
}
 */

function testReflection_syntaxHighlight(next) {
    console.log.apply(console, Reflection.syntaxHighlight(Reflection.syntaxHighlight + "", "body"));

    if ( 1 ) {
        next && next.pass();
    } else {
        next && next.miss();
    }
}


})((this || 0).self || global);

