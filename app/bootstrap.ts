import { ISecrets } from './config/ISecrets';
import { Server } from 'http';
import * as express from 'express';
import * as session from 'express-session';
import * as connectCouchDB from 'connect-couchdb';
import { chainCodeQuery, chainCodeInvoke } from './chaincode-connection';
import { createUserRouter } from './router/user';
import { logger } from './logger';
import * as bodyParser from 'body-parser';
import { passport, isAuthenticated } from './authenticator';
import { Request, Response } from 'express-serve-static-core';
import { createAuthenticationRouter } from './router/authenticate';
import { createRegisterRouter } from './router/register';
import { Strategy, AuthDb } from './auth-db';
import { createTradingsRouter } from './router/tradings';
import { createOwnershipRouter } from './router/ownership';
import { createRoomsRouter } from './router/rooms';
import { createWebSocketServer, SocketRoom } from './roomWebSocket';
import { UUID } from './util';


const secret = require('../config/secrets.json') as ISecrets;

/**
 * listenで起動可能なexpressアプリケーションを返す。
 * 呼び出しごとに別のアプリケーションを生成することに注意。
 * @author kbc14a12
 */
export function bootstrap(map: Map<UUID, SocketRoom>):express.Application {
    const app = express();
    configureUse(app);
    configureRoute(app, map);
    logger.trace('bootstrap完了');
    return app;
}

function configureRoute(app: express.Application, map: Map<UUID, SocketRoom>) {
    app.use('/user', createUserRouter(chainCodeQuery, chainCodeInvoke));
    app.use('/user/register', createRegisterRouter(AuthDb.registerLocalInfo));
    app.use('/auth', createAuthenticationRouter);
    app.use('/trading', createTradingsRouter(chainCodeQuery, chainCodeInvoke));
    app.use('/ownership', createOwnershipRouter(chainCodeQuery, chainCodeInvoke));
    app.use('/rooms', createRoomsRouter(map, chainCodeQuery, chainCodeInvoke));
    app.use('/client', express.static('/opt/BookChain-Client/dist'));
}

export function configureUse(app: express.Application) {
    app.use(bodyParser.urlencoded({
        extended: true,
    }));
    app.use(session({
        secret: secret.SESSION_SECRET,
        resave: true,
        saveUninitialized: false,
        store: new (connectCouchDB(session))({
            name: secret.couch.SESSION_DB_NAME,
            username: secret.couch.USER_NAME,
            password: secret.couch.USER_PASSWORD,
            host: secret.couch.HOST,
        })
    }));
    app.use(bodyParser.json());
    app.use(passport.initialize());
    app.use(passport.session());
    // ミドルウェアをここに追加
}
