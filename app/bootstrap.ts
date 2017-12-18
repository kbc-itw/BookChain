import { Server } from 'http';
import * as express from 'express';
import { chainCodeQuery, chainCodeInvoke } from './chaincode-connection';
import { createUserRouter } from './router/user';
import { logTrace } from './logger';

/**
 * listenで起動可能なexpressアプリケーションを返す。
 * 呼び出しごとに別のアプリケーションを生成することに注意。
 * @author kbc14a12
 */
export function bootstrap():express.Application {
    const app = express();
    configureUse(app);
    configureRoute(app);
    logTrace('bootstrap完了');
    return app;
}

function configureRoute(app: express.Application) {
//    app.use('/user', createUserRouter(chainCodeQuery, chainCodeInvoke));
}

function configureUse(app: express.Application) {
    // ミドルウェアをここに追加
}
