# Reflection.js [![Build Status](https://travis-ci.org/uupaa/Reflection.js.png)](http://travis-ci.org/uupaa/Reflection.js)

[![npm](https://nodei.co/npm/uupaa.reflection.js.png?downloads=true&stars=true)](https://nodei.co/npm/uupaa.reflection.js/)

WebModule reflection.

## Document

- [Reflection.js wiki](https://github.com/uupaa/Reflection.js/wiki/Reflection)
- [Development](https://github.com/uupaa/WebModule/wiki/Development)
- [WebModule](https://github.com/uupaa/WebModule)
    - [Slide](http://uupaa.github.io/Slide/slide/WebModule/index.html)
    - [Development](https://github.com/uupaa/WebModule/wiki/Development)


## How to use

### Browser

```js
<script src="lib/Reflection.js">
<script>
console.log( Reflection.resolve(Object.freeze).path );
</script>
```

### WebWorkers

```js
importScripts("lib/Reflection.js");

console.log( Reflection.resolve(Object.freeze).path );
```

### Node.js

```js
var Reflection = require("lib/Reflection.js");

console.log( Reflection.resolve(Object.freeze).path );
```

