import { Server } from 'http';
import * as express from 'express';

/**
 * listenで起動可能なexpressアプリケーションを返す。
 * 呼び出しごとに別のアプリケーションを生成することに注意。
 * @author kbc14a12
 */
export function bootstrap():express.Application {
    const app = express();
    configureUse(app);
    configureRoute(app);
    return app;
}

function configureRoute(app: express.Application) {
    // ルータをここに追加
}

function configureUse(app: express.Application) {
    // ミドルウェアをここに追加
}
