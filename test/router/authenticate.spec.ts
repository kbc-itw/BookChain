import 'mocha';
import * as chai from 'chai';
import * as express from 'express';
import { Server } from 'http';
import * as config from 'config';
import { IServerConfig } from '../../app/config/IServerConfig';
import * as sinon from 'sinon';
import { testGet, testPost, testDelete } from '../http-testing-function';
import { logger } from '../../app/logger';
import * as bodyParser from 'body-parser';
import { createAuthenticationRouter } from '../../app/router/authenticate';
import { passport } from '../../app/authenticator';

chai.use(require('chai-http'));
chai.use(require('chai-as-promised'));

describe('authenticationRouter /auth', () => {
    const serverConfig = config.get<IServerConfig>('server');
    let app: express.Express;
    let server: Server;

    const { port, host } = serverConfig;

    beforeEach(async () => {
        app = express();
        app.use(bodyParser.urlencoded({
            extended: true,
        }));
        app.use(bodyParser.json());
        app.use(passport.initialize());
        app.use(passport.session());
        server = await app.listen(port, host);
    });

    afterEach(async () => {
        await server.close();
    });

    it('正常系', async () => {
        app.use('/auth', createAuthenticationRouter());
        try {
            const result = await testPost(server, '/auth/local', { username:'hoge', password:'moge' });
            chai.expect(result.status).to.be.equal(200);
        } catch (e) {
            console.log(e);
            chai.assert.fail();
        }
    });
});

