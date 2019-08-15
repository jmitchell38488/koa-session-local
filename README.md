# koa-session-local

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![David deps][david-image]][david-url]
[![David devDeps][david-dev-image]][david-dev-url]
[![node version][node-image]][node-url]
[![npm download][download-image]][download-url]

>Local session storage for Koa sessions using async/await v1.0.4

This is an implementation of the koa-session storage in local system memory. This is intended to be used as in-memory
session storage for testing/development purposes, as none of the data is persisted to permanent storage.

[![NPM](https://nodei.co/npm/koa-session-local.svg?downloads=true)](https://nodei.co/npm/koa-session-local/)

## Table of Contents

* [Install](#install)
* [Usage](#usage)
    * [Basic](#basic)
* [Options](#options)
    * [Garbage collection](#garbage-collection)
* [License](#license)
* [Contributors](#contributors)

## Install

[npm][]:

```sh
npm install --save koa-session-local
```

[yarn][]:

```sh
yarn add koa-session-local
```

## Usage
`koa-session-local` works with [koa-session](https://github.com/koajs/session) (a simple session middleware for Koa), 
and requires Node >= 7.6 for async/await support.

### Basic

```js
const koa = require('koa');
const session = require('koa-session');
const store = require('koa-session-local');

const app = koa();
app.keys = ['keys', 'keykeys'];
app.use(session({
    store: new store(),
    ...
}));

app.use(async ctx => {
    const { session } = ctx;
    let n = session.views || 0;
    session.views = ++n;
    ctx.body = `${n} view(s)`;
});

app.listen(3000);
```

## Options
The module will use the default, or user provided values for `age` and `maxAge` parameters, as well as verify whether a
session is a rolling session, force save session, or otherwise.

### Garbage collection
Garbage collection is an important feature of many session management implementations in NodeJS and other platforms. In
this module, we're provided options for you to control the frequency and other properties of the garbage collection.

Garbage collection is performed on session.get, so there may be a slight request delay when the session garbage
collection has been initiated.

When a session is loaded, a mathematical check is performed against the probability value to determine if there should 
be a garbage collection cycle. If the generated number is less than the 'probability' value, then the sessions in the 
store are scanned for deletion. If the expiry date for an offer is passed, along with the 'maxlifetime' value, 
the sessions are removed. 

_Note: Using this function with a sufficiently low `maxlifetime` value, in conjunction with other `koa-session` settings 
may remove active or recently expired sessions that are not normally ready for garbage collection._

**Options**

* `gc` (_bool_): Enable or disable session garbage collection (gc)
* `probability` (_float_): The probability for which session gc will be triggered, higher is more frequently
* `maxlifetime` (_int_): The is the maximum lifetime in milliseconds after the session expiry a session can live, before it is 
removed
* `debug` (_fn()_): A reference to a function to generate log information (optional)

**Defaults:**

```js
const defaults = {
    gc: false,
    probability: 0.05, /* 5% chance per session.get call */
    maxlifetime: 60 * 1000 /* 60s in ms */
}
```

**To use:**

Enable `gc` and use the default values with no debugging:

```js
app.use(session({
    store: new store({
         gc: true
     }),
    ...
}));
```

Enable `gc` and configure other properties:

```js
app.use(session({
    store: new store({
         gc: true,
         probability: 0.05, /* 5% change */
         maxlifetime: 60 * 1000, /* 60 seconds */
         debug: console.log /* debug messages will be sent to console.log */
     }),
    ...
}));
```

## License

[MIT](LICENSE) &copy; Justin Mitchell (2019)

## Contributors

[![contrib-jmitchell38488]][contrib-jmitchell38488-url]

[npm-image]: https://img.shields.io/npm/v/koa-session-local.svg?style=flat-square
[npm-url]: https://npmjs.org/package/koa-session-local
[travis-image]: https://img.shields.io/travis/jmitchell38488/koa-session-local
[travis-url]: https://travis-ci.com/jmitchell38488/koa-session-local
[david-image]: https://img.shields.io/david/jmitchell38488/koa-session-local.svg?style=flat-square
[david-url]: https://david-dm.org/jmitchell38488/koa-session-local
[david-dev-image]: https://img.shields.io/david/dev/jmitchell38488/koa-session-local.svg?style=flat-square&label=devDeps
[david-dev-url]: https://david-dm.org/jmitchell38488/koa-session-local#info=devDependencies
[node-image]: https://img.shields.io/badge/node.js-%3E=_7.6-green.svg?style=flat-square
[node-url]: http://nodejs.org/download/
[download-image]: https://img.shields.io/npm/dm/koa-session-local.svg?style=flat-square
[download-url]: https://npmjs.org/koa-session-local
[npm]: https://www.npmjs.com/
[yarn]: https://yarnpkg.com/

[contrib-jmitchell38488]: https://avatars1.githubusercontent.com/u/12840052?s=60
[contrib-jmitchell38488-url]: https://github.com/jmitchell38488
