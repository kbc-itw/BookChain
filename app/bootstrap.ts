import { Server } from 'http';
import * as express from 'express';
import { chainCodeQuery, chainCodeInvoke } from './chaincode-connection';
import { createUserRouter } from './router/user';
import { logger } from './logger';
import * as bodyParser from 'body-parser';
import { passport } from './authenticator';

/**
 * listenで起動可能なexpressアプリケーションを返す。
 * 呼び出しごとに別のアプリケーションを生成することに注意。
 * @author kbc14a12
 */
export function bootstrap():express.Application {
    const app = express();
    configureUse(app);
    configureRoute(app);
    logger.trace('bootstrap完了');
    return app;
}

function configureRoute(app: express.Application) {
//    app.use('/user', createUserRouter(chainCodeQuery, chainCodeInvoke));
}

function configureUse(app: express.Application) {
    app.use(bodyParser.urlencoded({
        extended: true,
    }));
    app.use(bodyParser.json());
    app.use(passport.initialize());
    app.use(passport.session());
    // ミドルウェアをここに追加
}
