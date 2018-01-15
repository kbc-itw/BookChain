import { Express, Response, Request } from 'express-serve-static-core';
import * as chai from 'chai';
import 'mocha';
import { bootstrap, configureUse } from '../app/bootstrap';
import { Server } from 'http';
import * as config from 'config';
import { IServerConfig } from '../app/config/IServerConfig';
import { Router, Application } from 'express';
import { isAuthenticated } from '../app/authenticator';
import { testGet } from './http-testing-function';

chai.use(require('chai-http'));

describe('bootstrap', () => {
    const serverConfig = config.get<IServerConfig>('server');
    const { port, host } = serverConfig;

    let app: Application;
    let server: Server;

    beforeEach(async () => {
        app = bootstrap();
        configureUse(app);
        server = await app.listen(port, host);
    });

    afterEach(async () => {
        await server.close();
    });

    it('サーバ起動に成功する', async () => {
        const router = Router();
        router.get('/', isAuthenticated, (req: Request, res:Response) => res.status(200).json({ result: true }));
        app.use('/user', router);

        try {
            const result = await testGet(server, '/user');
            chai.expect(result.status).to.deep.equal(200);
        } catch (e) {
            chai.assert.fail();
        }
    });
});
