# koa-session-local

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![David deps][david-image]][david-url]
[![David devDeps][david-dev-image]][david-dev-url]
[![node version][node-image]][node-url]
[![npm download][download-image]][download-url]

>Local session storage for Koa sessions using async/await

[![NPM](https://nodei.co/npm/koa-local-session.svg?downloads=true)](https://nodei.co/npm/koa-local-session/)

## Table of Contents

* [Install](#install)
* [Usage](#usage)
    * [Basic](#basic)
* [Options](#options)
* [License](#license)
* [Contributors](#contributors)

## Install

[npm][]:

```sh
npm install koa-local-session
```

[yarn][]:

```sh
yarn add koa-local-session
```

## Usage
`koa-local-session` works with [koa-session](https://github.com/koajs/session) (a simple session middleware for Koa), 
and requires Node >= 7.6 for async/await support.

### Basic

```js
const koa = require('koa');
const session = require('koa-session');
const store = require('koa-local-session');

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

## License

[MIT](LICENSE) &copy; Justin Mitchell (2019)

## Contributors

[![contrib-jmitchell38488]][contrib-jmitchell38488-url]

[npm-image]: https://img.shields.io/npm/v/koa-local-session.svg?style=flat-square
[npm-url]: https://npmjs.org/package/koa-local-session
[travis-image]: https://img.shields.io/travis/jmitchell38488/koa-local-session
[travis-url]: https://travis-ci.org/jmitchell38488/koa-local-session
[david-image]: https://img.shields.io/david/jmitchell38488/koa-local-session.svg?style=flat-square
[david-url]: https://david-dm.org/jmitchell38488/koa-local-session
[david-dev-image]: https://img.shields.io/david/dev/jmitchell38488/koa-local-session.svg?style=flat-square&label=devDeps
[david-dev-url]: https://david-dm.org/jmitchell38488/koa-local-session#info=devDependencies
[node-image]: https://img.shields.io/badge/node.js-%3E=_7.6-green.svg?style=flat-square
[node-url]: http://nodejs.org/download/
[download-image]: https://img.shields.io/npm/dm/koa-local-session.svg?style=flat-square
[download-url]: https://npmjs.org/jmitchell38488/koa-local-session
[npm]: https://www.npmjs.com/
[yarn]: https://yarnpkg.com/

[contrib-jmitchell38488]: https://en.gravatar.com/userimage/111127134/56b96d8b7d904e5698494597938da449.jpg?size=60
[contrib-jmitchell38488-url]: https://github.com/jmitchell38488