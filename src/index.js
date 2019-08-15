/**
 * koa-session-local - index.js
 * Copyright(c) 2019
 * MIT Licensed
 *
 * This class should only be used for dev testing purposes. This should _never_ be used in production.
 *
 * Authors:
 *      Justin Mitchell <jmitchell38488@gmail.com> (https://github.com/jmitchell38488)
 */

/**
 * The default options for this store.
 *
 * Garbage collection can be handled through this store by setting the 'gc' flag to true.
 *
 * When a session is loaded, a mathematical check is performed against the probability value to determine if there should
 * be a garbage collection cycle. If the generated number is less than the 'probability' value, then the sessions in
 * the store are scanned for deletion. If the expiry date for an offer is passed, along with the 'maxlifetime' value,
 * the sessions are removed. This may remove active/current sessions.
 * @type {{maxlifetime: number, probability: number, gc: boolean, debug: boolean}}
 */
const defaults = {
    gc: false,
    probability: 0.05,
    maxlifetime: 60 * 1000,
    debug: false
};

/**
 * The LocalSessionStore class is a simple implementation for the Koa Session manager to store sessions in system
 * memory.
 *
 * Sessions are stored locally inside of the instance of the LocalSessionStore with the following structure:
 * {
 *     created: Date.now(),
 *     key: string,
 *     json: {
 *         ... ,
 *         _expire: number,
 *         _maxAge: number,
 *         ?_session: boolean
 *     },
 *     ttl: number
 * }
 *
 * Options that are passed from the koa-session class:
 * {
 *     ?renew: boolean,
 *     ?force: boolean,
 *     ?changed: boolean,
 *     ?maxAge: number,
 *     rolling: boolean
 * }
 */
class LocalSessionStore {

    /**
     * Construct an instance of 'LocalSessionStore' with the options passed. The options are verir
     * @param options
     * @throws TypeError the constructor bubbles any exceptions thrown during initialisation.
     */
    constructor(options) {
        this._verifyOpts(options);

        let opts = Object.assign({}, defaults, (options || {}));

        this.gc = opts.gc;
        this.probability = opts.probability;
        this.maxlifetime = opts.maxlifetime;
        this.debug = (!!opts.debug && typeof opts.debug === 'function') ? opts.debug : null;
        this.gcActive = false;

        // Initialize our sessions container
        this.sessions = new Map();
    }

    /**
     * Helper method to verify the provided options to the constructor match the format of which is required. This is
     * useful for validating session integrity, as well as ensuring the garbage collection (if enabled) is correctly
     * executed.
     * 
     * Options:
     *  - gc (boolean): Enable or disable session garbage collection (gc)
     *  - probability (float): The probability for which session gc will be triggered, higher is more frequently
     *  - maxlifetime (int): This is the maximum lifetime in seconds that a session can live for before it is 
     *                       garbage collected, once it's expiry time is passed
     * options: {
     *     gc: boolean,
     *     probability: float,
     *     maxlifetime: int,
     *     ?debug: fn()
     * }
     * 
     * @param options
     * @throws TypeError Throws when an invalid type is encountered
     * @private
     */
    _verifyOpts(options) {
        if (options !== void 0 && !(!!options && Object.prototype.toString.call(options) === '[object Object]')) {
            throw new TypeError('options must be an object, invalid value provided');
        }

        let opts = Object.assign({}, defaults, (options || {}));

        if (opts.gc === void 0 || (!!opts.gc && typeof opts.gc !== 'boolean')) {
            throw new TypeError('options.gc must be a boolean');
        }

        if (opts.probability === void 0 || (!!opts.probability && typeof opts.probability !== 'number')) {
            throw new TypeError('options.probability must be a number');
        }

        if (opts.gc && (opts.probability > 1 || opts.probability <= 0)) {
            throw new TypeError('options.probability must be a number equal to or less than 1 and greater than 0 when options.gc is enabled');
        }

        if (opts.probability && typeof opts.maxlifetime !== 'number') {
            throw new TypeError('options.maxlifetime must be a number');
        }

        if (opts.gc && opts.maxlifetime < 0) {
            throw new TypeError('options.maxlifetime must be a number greater than 0 when options.gc is enabled');
        }
    }

    /**
     * Helper method to print debug information to the console. To enable, pass a reference to a function in the store
     * constructor.
     * 
     * options: {
     *     ...
     *     debug: fn()
     * }
     * 
     * @param data
     * @private
     */
    _debug(data) {
        if (this.debug) this.debug.call(this.debug, data);
    }

    /**
     * This method is responsible for performing garbage collection on the sessions currently loaded in this store.
     * The method relies on three settings, which can be provided to the constructor:
     *
     *   `gc` enables or disables the garbage collection operation
     *   `probability` is used to determine if garbage collection should be performed
     *   `maxlifetime` is used as a buffer for expired sessions to prevent the removal of any 'current' sessions
     *
     * Depending on how many sessions are currently in the storage engine, there may be a performance hit when the
     * garbage collector is activated, as it will need to scan each session and determine if the expiry date has
     * elapsed, and then remove it from the store.
     *
     * Garbage collection _shold_ only ever be triggered when a session is fetched, as it will remove expired sessions,
     * which may be the one the user is requesting.
     *
     * @private
     */
    _performGc() {
        if (this.gcActive || !this.gc || this.sessions.size === 0) {
            return;
        }

        const num = Math.random();
        if (num > this.probability) {
            return;
        }

        this._debug('performing garbage collection...');
        this.gcActive = true;
        let count = 0;
        const start = new Date().getTime();
        const now = Date.now();

        this.sessions.forEach((s, k) => {
            // don't expire session length sessions, they have to be manually removed by a 'logout'
            if (s && s.json._session) {
                return;
            }

            if (s && now > (s.json._expire + this.maxlifetime)) {
                count++;
                this.sessions.delete(k);
            }
        });

        this.gcActive = false;
        const time = new Date().getTime() - start;
        this._debug(`Finished garbage collection on ${count} session(s) in ${time}ms`);
    }

    /**
     * Implements koa/session.get
     * @param key The session key
     * @param ttl The time-to-live option
     * @param opts Options
     * @returns {Promise<*>} A promise containing the session or null
     */
    // eslint-disable-next-line
    async get(key, ttl, opts) {
        this._performGc();
        const session = this.sessions.get(key);

        // Session-length session does not expire
        if (session && session.json._session) {
            return session.json;
        }

        // Check that the session hasn't already expired
        return (session && session.json._expire > Date.now()) ? session.json : null;
    }

    /**
     * Implements koa/session.set
     * @param key The session key
     * @param json The session data
     * @param ttl The time-to-live option
     * @param opts Options
     * @returns {Promise<void>} An empty promise that resolves on success, or failure on error
     */
    async set(key, json, ttl, opts) {
        // Changed means we just update, or create a new session
        if (opts.changed || opts.rolling) {
            let session = this.sessions.get(key);
            if (!session) {
                this.sessions.set(key, LocalSessionStore.getNewSessionEntry(key, json, ttl));
                return;
            }

            session.ttl = ttl;
            session.json = json;
            return;
        }

        // Renew means we generate a new session with the same key
        // Force saving a new session no matter what
        if (opts.renew || opts.force) {
            await this.destroy(key);
            this.sessions.set(key, LocalSessionStore.getNewSessionEntry(key, json, ttl));
            return;
        }

        // Wait, what happened?!
        throw new Error('Cannot resolve session');
    }

    /**
     * Implements koa/session.destroy
     * @param key The session key
     * @returns {Promise<void>} An empty promise that resolves on success, or failure on error
     */
    async destroy(key) {
        this.sessions.delete(key);
    }

    /**
     * A helper class method to create a new session object
     * @param key
     * @param json
     * @param ttl
     * @returns {{created: number, json: Object, ttl: number, key: string}}
     */
    static getNewSessionEntry(key, json, ttl) {
        return {
            created: Date.now(),
            key: key,
            json: json,
            ttl: ttl
        }
    }

    /**
     * Get the number of sessions that have been created, this does not determine those sessions that need to be pruned
     * @returns {number}
     */
    get size() {
        return this.sessions.size;
    }

}

module.exports = LocalSessionStore;
