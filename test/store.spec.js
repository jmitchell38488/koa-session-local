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

        it('should not throw an error', () => {
            try {
                store = new LocalSessionStore();
                assert(store !== null);
            } catch (e) {
                // truly hacky bs way around this
                assert.equal(false, true);
            }
        });

        it('shold set default gc values', () => {
            assert.equal(store.gc, false);
            assert.equal(store.probability, 0.05);
            assert.equal(store.maxlifetime, 60000);
            assert.equal(store.debug, null);
        });

        it('should call _verifyOpts', () => {
            let stub = sinon.stub(LocalSessionStore.prototype, '_verifyOpts').callsFake();
            store = new LocalSessionStore();
            assert(stub.calledOnce);
            stub.restore();
        });

        it('should throw exception for invalid data', () => {
            let opts = 'foo';
            try {
                store = new LocalSessionStore(opts);
            } catch (e) {
                assert(e instanceof TypeError);
                assert.equal(e.message, 'options must be an object, invalid value provided');
            }
        });

        it('should throw exception for invalid gc data', () => {
            let opts = {gc: 'foo'};
            try {
                store = new LocalSessionStore(opts);
            } catch (e) {
                assert(e instanceof TypeError);
                assert.equal(e.message, 'options.gc must be a boolean');
            }
        });

        it('should throw exception for invalid probability data', () => {
            let opts = {probability: 'foo'};
            try {
                store = new LocalSessionStore(opts);
            } catch (e) {
                assert(e instanceof TypeError);
                assert.equal(e.message, 'options.probability must be a number');
            }

            opts = {gc: true, probability: 1};
            try {
                store = new LocalSessionStore(opts);
            } catch (e) {
                assert(e instanceof TypeError);
                assert.equal(e.message, 'options.probability must be a number equal to or less than 1 and greater than 0 when options.gc is enabled');
            }

            opts = {gc: true, probability: 0};
            try {
                store = new LocalSessionStore(opts);
            } catch (e) {
                assert(e instanceof TypeError);
                assert.equal(e.message, 'options.probability must be a number equal to or less than 1 and greater than 0 when options.gc is enabled');
            }
        });

        it('should throw exception for invalid maxlifetime data', () => {
            let opts = {maxlifetime: 'foo'};
            try {
                store = new LocalSessionStore(opts);
            } catch (e) {
                assert(e instanceof TypeError);
                assert.equal(e.message, 'options.maxlifetime must be a number');
            }

            opts = {gc: true, maxlifetime: -1};
            try {
                store = new LocalSessionStore(opts);
            } catch (e) {
                assert(e instanceof TypeError);
                assert.equal(e.message, 'options.maxlifetime must be a number greater than 0 when options.gc is enabled');
            }
        });

        it('should not set a debug function', () => {
            assert.equal(store.debug, null);
        });

        it('should not set a debug function', () => {
            opts = {debug: console.log};
            store = new LocalSessionStore(opts);

            assert.equal(store.debug, opts.debug);
            assert.equal(typeof store.debug, 'function');
        })
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

            store.sessions.set(key1, {created: Date.now(), key: key1});
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

            store.sessions.set(key1, {created: Date.now(), key: key1});
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

            store.sessions.set(key1, {created: Date.now(), key: key1});
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

            store.sessions.set(key1, {created: Date.now(), key: key1});
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

            findSpy = sinon.spy(store.sessions, 'get');
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

            store.sessions.set(data.key, data);
            let session = await store.get(key1);

            assert(findSpy.calledOnce);
            assert.equal(JSON.stringify(session), JSON.stringify(data.json));
            assert(getSpy.notCalled);
        });

        it('should return session that has not expired', async () => {
            let getSpy = sinon.spy(Date, 'now');

            store.sessions.set(data.key, data);
            let session = await store.get(key1);

            assert(findSpy.calledOnce);
            assert.equal(JSON.stringify(session), JSON.stringify(data.json));
            assert(getSpy.calledOnce);
        });

        it('should return null for an expired session', async () => {
            let getSpy = sinon.spy(Date, 'now');
            data.json._expire -= 20 * 1000;

            store.sessions.set(data.key, data);
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

        it('should call gc function', async () => {
            let getSpy = sinon.spy(Date, 'now');
            let spy = sinon.spy(store, '_performGc');

            store.sessions.set(data.key, data);
            await store.get(key1);
            assert(getSpy.calledOnce);

            spy.restore();
        })
    });

    describe('destroying a session', () => {
        let delSpy;

        beforeEach(() => {
            store = new LocalSessionStore();
            delSpy = sinon.spy(store.sessions, 'delete');
            let now = Date.now();
            data = {
                created: now,
                key: key1,
                ttl: ttl,
                json: { views: 1, _expire: now + ttl }
            };
        });

        afterEach(() => {
            data = {};
            store = null;
            delSpy = null;
        });

        it('should destroy found session', async () => {
            store.sessions.set(data.key, data);
            assert.equal(store.size, 1);

            await store.destroy(key1);

            assert(delSpy.calledOnce);
            assert.equal(store.size, 0);
        });

        it('should destroy found session, leave other sessions', async () => {
            store.sessions.set(data.key, data);
            assert.equal(store.size, 1);

            store.sessions.set(key2, Object.assign({}, data, {key: key2}));
            assert.equal(store.size, 2);

            await store.destroy(key1);

            assert(delSpy.calledOnce);
            assert.equal(store.size, 1);
            assert(store.get(key2) !== null);
        });

        it('should not destroy session if not found', async () => {
            data.key = key3;
            store.sessions.set(data.key, data);
            assert.equal(store.size, 1);
            
            await store.destroy(key1);

            assert(delSpy.calledOnce);
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
        });
    });

    describe('garbage collection', () => {
        let getSpy;
        let findSpy;
        let mathSpy;
        let dateSpy;

        beforeEach(() => {
            let now = Date.now();
            mathSpy = sinon.spy(Math, 'random');
            dateSpy = sinon.spy(Date, 'now');
            data = {
                created: now,
                key: key1,
                ttl: ttl,
                json: { views: 1, _expire: now + ttl }
            };
        });

        afterEach(() => {
            data = {};
            store = null;
            getSpy = null;
            findSpy = null;

            Math.random.restore();
            Date.now.restore();
            mathSpy = null;
            dateSpy = null;
        });

        it('should not perform gc if gc is disabled', () => {
            let opts = {gc: false};
            store = new LocalSessionStore(opts);

            store._performGc();

            assert(mathSpy.notCalled);
        });

        it('should not perform gc if gc is enabled but no sessions', () => {
            let opts = {gc: true};
            store = new LocalSessionStore(opts);

            store._performGc();

            assert(mathSpy.notCalled);
        });

        it('should not perform gc if probability < Math.random', () => {
            let opts = {gc: true, probability: 0.0000001};
            store = new LocalSessionStore(opts);
            store.sessions.set(key1, data);

            let dbgSpy = sinon.spy(store, '_debug');
            store._performGc();

            assert(dbgSpy.notCalled);
            assert(mathSpy.calledOnce);
            assert(dateSpy.notCalled);
        });

        it('should perform gc if probability met, delete 0 sessions', () => {
            let opts = {gc: true, probability: 1};
            store = new LocalSessionStore(opts);
            store.sessions.set(key1, data);

            let dbgSpy = sinon.spy(store, '_debug');
            let delSpy = sinon.spy(store.sessions, 'delete');

            store._performGc();

            assert(dbgSpy.calledTwice);
            assert(mathSpy.calledOnce);
            assert(dateSpy.calledOnce);
            assert(delSpy.notCalled);
            assert.equal(store.size, 1);
        });

        it('should perform gc if probability met, not delete _session:true sessions', () => {
            let opts = {gc: true, probability: 1};
            store = new LocalSessionStore(opts);

            data.json._session = true;
            store.sessions.set(key1, data);

            let dbgSpy = sinon.spy(store, '_debug');
            let delSpy = sinon.spy(store.sessions, 'delete');

            store._performGc();

            assert(dbgSpy.calledTwice);
            assert(mathSpy.calledOnce);
            assert(dateSpy.calledOnce);
            assert(delSpy.notCalled);
            assert.equal(store.size, 1);
        });

        it('should perform gc if probability met, delete 1 session', () => {
            let opts = {gc: true, probability: 1, maxlifetime: 1};
            store = new LocalSessionStore(opts);

            data.created -= 90 * 1000;
            data.json._expire = data.created;

            store.sessions.set(key1, data);

            let dbgSpy = sinon.spy(store, '_debug');
            let delSpy = sinon.spy(store.sessions, 'delete');

            store._performGc();

            assert(dbgSpy.calledTwice);
            assert(mathSpy.calledOnce);
            assert(dateSpy.calledOnce);
            assert(delSpy.calledOnce);
            assert.equal(store.size, 0);
        });
    });

    describe('test: _debug', () => {
        let logStub;

        beforeEach(() => {
            logStub = sinon.stub();
        });

        afterEach(() => {
            store = null;
            logStub = null;
        });

        it('should not log if not enabled', () => {
            store = new LocalSessionStore();
            store._debug('foo');
            assert(logStub.notCalled);
        });

        it('should log if not enabled', () => {
            store = new LocalSessionStore({debug: logStub});
            store._debug('foo');
            assert(logStub.calledWith('foo'));
            assert(logStub.calledOnce);
        });
    });
});
