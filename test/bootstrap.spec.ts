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
        app = bootstrap(new Map());
        // configureUse(app);
        server = await app.listen(port, host);
    });

    afterEach(async () => {
        await server.close();
    });

    it('サーバ起動に成功する', async () => {
    });
});
