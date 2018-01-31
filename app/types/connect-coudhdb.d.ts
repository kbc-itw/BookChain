declare module 'connect-couchdb' {

    import * as ExpressSession from 'express-session';

    class ConnectCouchDB extends ExpressSession.Store {}

    interface Options {

        /** Name of the database you would like to use for sessions. */
        name: string;

        /**
         * Database connection details.
         * See yacw documentation for more information
         */
        username?: string;
        password?: string;
        host?: string;

        /**
         * How often expired sessions should be cleaned up.
         * Defaults to 600000 (10 minutes).
         */
        reapInterval?: number;

        /**
         * How often to run DB compaction against the session database.
         * Defaults to 300000 (5 minutes).
         * To disable compaction, set compactInterval to -1
         */
        compactInterval?: number;

        /**
         * How many time between two identical session store
         * Defaults to 60000 (1 minute)
         */
        setThrottle?: number;
    }

    function connectCouchDB(session: typeof ExpressSession): new (option: Options) => ConnectCouchDB;

    namespace connectCouchDB {}

    export = connectCouchDB;

}
