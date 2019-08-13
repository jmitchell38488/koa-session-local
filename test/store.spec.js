const LocalSessionStore = require('../src');

const chai = require('chai');
const dirtyChai = require('dirty-chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const assert = require('assert');

const { expect } = chai;

chai.use(dirtyChai);
chai.use(sinonChai);

if (parseFloat(process.version.slice(1)) < 7.6) {
    throw 'Cannot execute tests, node >= 7.6 required';
}

const stubCreator = (key, json, ttl, date = Date.now()) => sinon.stub(LocalSessionStore, 'getNewSessionEntry').returns({
    created: date,
    key: key,
    json: json,
    ttl: ttl
});

describe('Local storage', () => {
    let store;
    let data;
    let optSpy;
    let opts;
    let ttl = 15 * 1000;
    let key1 = 'abc1234567890';
    let key2 = '0987654321cba';
    let key3 = 'foobarasasdas';

    beforeEach(() => {
        store = new LocalSessionStore();
        data = {
            views: 1
        };
        opts = {};
        optSpy = null;
    });

    describe('constructor', () => {
        it('Should return 0 sessions', () => {
            expect(store.size).to.equal(0);
        });

        it('should return a session store with destroy, get and set methods', () => {
            expect(store.destroy).to.be.a('function');
            expect(store.get).to.be.a('function');
            expect(store.set).to.be.a('function');
        });
    });

    describe('creating a session', () => {
        let creatorStub;

        beforeEach(() => {
            creatorStub = stubCreator(key1, data, ttl);
            store = new LocalSessionStore();
        });

        afterEach(() => {
            creatorStub.restore();
        });

        it('session should create with changed', async () => {
            opts = {
                get changed() {
                    return true;
                }
            };

            optSpy = sinon.spy(opts, 'changed', ['get']);

            await store.set(key1, data, ttl, opts);
            assert(creatorStub.calledOnce);
            assert.equal(optSpy.get.callCount, 1);
            assert.equal(store.size, 1);
        });

        it('session should create with rolling', async () => {
            opts = {
                get rolling() {
                    return true;
                }
            };

            optSpy = sinon.spy(opts, 'rolling', ['get']);

            await store.set(key1, data, ttl, opts);
            assert(creatorStub.calledOnce);
            assert.equal(optSpy.get.callCount, 1);
            assert.equal(store.size, 1);
        });

        it('session should updated changed', async () => {
            opts = {
                get changed() {
                    return true;
                }
            };

            optSpy = sinon.spy(opts, 'changed', ['get']);

            store.sessions.push({created: Date.now(), key: key1});
            assert.equal(store.size, 1);

            await store.set(key1, data, ttl, opts);
            assert(creatorStub.notCalled);
            assert.equal(optSpy.get.callCount, 1);
            assert.equal(store.size, 1);
        });

        it('session should updated rolling', async () => {
            opts = {
                get rolling() {
                    return true;
                }
            };

            optSpy = sinon.spy(opts, 'rolling', ['get']);

            store.sessions.push({created: Date.now(), key: key1});
            assert.equal(store.size, 1);

            await store.set(key1, data, ttl, opts);
            assert(creatorStub.notCalled);
            assert.equal(optSpy.get.callCount, 1);
            assert.equal(store.size, 1);
        });

        it('session should throw error on create without rolling and changed', async () => {
            opts = {
                get changed() {
                    return false;
                }
            };

            optSpy = sinon.spy(opts, 'changed', ['get']);

            store.set(key1, data, ttl, opts)
                .then(() => {
                    assert(creatorStub.notCalled);
                    assert.equal(optSpy.get.callCount, 1);
                    assert.equal(store.size, 0);
                })
                .catch((e) => {assert.equal(e.message, 'Cannot resolve session')});
        });

        it('session should renew existing session', async () => {
            opts = {
                get renew() {
                    return true;
                }
            };

            optSpy = sinon.spy(opts, 'renew', ['get']);
            let destroySpy = sinon.spy(store, 'destroy');

            store.sessions.push({created: Date.now(), key: key1});
            assert.equal(store.size, 1);

            await store.set(key1, data, ttl, opts);
            assert(creatorStub.calledOnce);
            assert.equal(optSpy.get.callCount, 1);
            assert.equal(store.size, 1);
            assert(destroySpy.calledOnce);
            assert(destroySpy.calledWith(key1));
        });

        it('session should force save an existing session', async () => {
            opts = {
                get force() {
                    return true;
                }
            };

            optSpy = sinon.spy(opts, 'force', ['get']);
            let destroySpy = sinon.spy(store, 'destroy');

            store.sessions.push({created: Date.now(), key: key1});
            assert.equal(store.size, 1);

            await store.set(key1, data, ttl, opts);
            assert(creatorStub.calledOnce);
            assert.equal(optSpy.get.callCount, 1);
            assert.equal(store.size, 1);
            assert(destroySpy.calledOnce);
            assert(destroySpy.calledWith(key1));
        });
    });

    describe('getting a session', () => {
        let getSpy;
        let findSpy;

        beforeEach(() => {
            store = new LocalSessionStore();
            let now = Date.now();
            data = {
                created: now,
                key: key1,
                ttl: ttl,
                json: { views: 1, _expire: now + ttl }
            };

            findSpy = sinon.spy(store.sessions, 'find');
        });

        afterEach(() => {
            data = {};
            store = null;
            getSpy = null;
            findSpy = null;
            Date.now.restore();
        });

        it('should return session that is of a session length expiry', async () => {
            data.json._session = true;
            let getSpy = sinon.spy(Date, 'now');

            store.sessions.push(data);
            let session = await store.get(key1);

            assert(findSpy.calledOnce);
            assert.equal(JSON.stringify(session), JSON.stringify(data.json));
            assert(getSpy.notCalled);
        });

        it('should return session that has not expired', async () => {
            let getSpy = sinon.spy(Date, 'now');

            store.sessions.push(data);
            let session = await store.get(key1);

            assert(findSpy.calledOnce);
            assert.equal(JSON.stringify(session), JSON.stringify(data.json));
            assert(getSpy.calledOnce);
        });

        it('should return null for an expired session', async () => {
            let getSpy = sinon.spy(Date, 'now');
            data.json._expire -= 20 * 1000;

            store.sessions.push(data);
            let session = await store.get(key1);

            assert(findSpy.calledOnce);
            assert.equal(session, null);
            assert(getSpy.calledOnce);
        });

        it('should return null for no session found', async () => {
            let getSpy = sinon.spy(Date, 'now');
            let session = await store.get(key1);

            assert(findSpy.calledOnce);
            assert(getSpy.notCalled);
            assert.equal(session, null);
        });
    });

    describe('destroying a session', () => {
        let getSpy;
        let findSpy;

        beforeEach(() => {
            store = new LocalSessionStore();
            let now = Date.now();
            data = {
                created: now,
                key: key1,
                ttl: ttl,
                json: { views: 1, _expire: now + ttl }
            };

            findSpy = sinon.spy(store.sessions, 'find');
        });

        afterEach(() => {
            data = {};
            store = null;
            getSpy = null;
            findSpy = null;
        });

        it('should destroy found session', async () => {
            store.sessions.push(data);
            assert.equal(store.size, 1);

            getSpy = sinon.spy(store.sessions, 'filter');
            await store.destroy(key1);

            assert(getSpy.calledOnce);
            assert.equal(store.size, 0);
        });

        it('should destroy found session, leave other sessions', async () => {
            store.sessions.push(data);
            assert.equal(store.size, 1);

            store.sessions.push(Object.assign({}, data, {key: key2}));
            assert.equal(store.size, 2);
            assert.equal(store.sessions[0].key, key1);
            assert.equal(store.sessions[1].key, key2);

            getSpy = sinon.spy(store.sessions, 'filter');
            await store.destroy(key1);

            assert(getSpy.calledOnce);
            assert.equal(store.size, 1);
            assert.equal(store.sessions[0].key, key2);
        });

        it('should not destroy session if not found', async () => {
            data.key = key3;
            store.sessions.push(data);
            assert.equal(store.size, 1);

            getSpy = sinon.spy(store.sessions, 'filter');
            await store.destroy(key1);

            assert(getSpy.calledOnce);
            assert.equal(store.size, 1);
        });
    });

    describe('it should return a new session template', () => {
        let dateNowStub;
        let dateNow;

        beforeEach(() => {
            store = new LocalSessionStore();
            dateNow = Date.now();
            dateNowStub = sinon.stub(Date, 'now').returns(dateNow);
            data = {
                created: dateNow,
                key: key1,
                json: { views: 1, _expire: dateNow + ttl },
                ttl: ttl
            };
        });

        afterEach(() => {
            dateNowStub.restore();
            store = null;
        });

        it('should return a new session template', () => {
            let session = LocalSessionStore.getNewSessionEntry(data.key, data.json, data.ttl);
            assert(dateNowStub.calledOnce);
            assert.equal(JSON.stringify(session), JSON.stringify(data));
        })
    })
});
