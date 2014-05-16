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

})((this || 0).self || global);

