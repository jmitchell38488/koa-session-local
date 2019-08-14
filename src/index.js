/**
 * koa-session-local - index.js
 * Copyright(c) 2019
 * MIT Licensed
 *
 * Authors:
 *      Justin Mitchell <jmitchell38488@gmail.com> (https://github.com/jmitchell38488)
 */

/**
 * The LocalSessionStore class is a simple implementation for the Koa Session manager to store sessions in memory.
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


    constructor() {
        // Initialize our sessions container
        this.sessions = new Map();
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
