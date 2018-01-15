import 'mocha';
import * as chai from 'chai';

import * as express from 'express';
import { Server } from 'http';
import * as config from 'config';
import { IServerConfig } from '../../app/config/IServerConfig';
import { createUserRouter } from '../../app/router/user';
import { chainCodeQuery } from '../../app/chaincode-connection';
import * as sinon from 'sinon';
import { testGet, testPost } from '../http-testing-function';
import * as bodyParser from 'body-parser';
import { passport } from '../../app/authenticator';
import { configureUse } from '../../app/bootstrap';
import { createAuthenticationRouter } from '../../app/router/authenticate';

const session = require('express-session');

chai.use(require('chai-as-promised'));

describe('userRouter /user get', () => {
    const serverConfig = config.get<IServerConfig>('server');
    let app: express.Express;
    let server: Server;

    const { port, host } = serverConfig;

    beforeEach(async () => {
        app = express();
        configureUse(app);
        server = await app.listen(port, host);
    });
    afterEach(async () => {
        await server.close();
    });

    it('正常系', async () => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.resolve([{
            locator: 'huruikagi@kbc-itw.net',
            host: 'kbc-itw.net',
            id: 'huruikagi',
            name:'huruikagi',
        },{
            locator: 'nekome@kbc-itw.net',
            host: 'kbc-itw.net',
            id: 'nekome',
            name: 'ねこめ',
        }]);

        const stubInvokeFunction = ()  => Promise.resolve();

        app.use('/user', createUserRouter(stubQueryFunction, stubInvokeFunction));

        try {
            const result = await testGet(server, '/user');
            chai.expect(result.body.length).to.be.equal(2);
            chai.expect(result.status).to.be.equal(200);
            chai.expect(result.body[0]).to.deep.equal({
                locator: 'huruikagi@kbc-itw.net',
                host: 'kbc-itw.net',
                id: 'huruikagi',
                name: 'huruikagi',
            });
        } catch (e) {
            console.log(e);
            chai.assert.fail();
        }
    });

    it('通信後chaincodeがthrowしてきた', async () => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.reject(new Error('エラーだよ'));
        const stubInvokeFunction = () => Promise.reject(new Error('エラーだよ'));

        app.use(createUserRouter(stubQueryFunction, stubInvokeFunction));

        await chai.expect(testGet(server, '/')).to.be.rejectedWith('Internal Server Error');
    });
});

describe('userRouter /user/:host/:id', () => {
    const serverConfig = config.get<IServerConfig>('server');
    let app: express.Express;
    let server: Server;

    const { port, host } = serverConfig;


    beforeEach(async () => {
        app = express();
        server = await app.listen(port, host);
    });

    afterEach(async () => {
        await server.close();
    });

    it('正常系', async () => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.resolve({
            locator: 'huruikagi@kbc-itw.net',
            host: 'kbc-itw.net',
            id: 'huruikagi',
            name:'huruikagi',
        });

        const stubInvokeFunction = ()  => Promise.resolve();

        app.use('/user', createUserRouter(stubQueryFunction, stubInvokeFunction));

        try {
            const result = await testGet(server, '/user/kbc-itw.net/huruikagi');
            chai.expect(result.status).to.be.equal(200);
            chai.expect(result.body).to.deep.equal({
                locator: 'huruikagi@kbc-itw.net',
                host: 'kbc-itw.net',
                id: 'huruikagi',
                name: 'huruikagi',
            });
        } catch (e) {
            chai.assert.fail();
        }
    });

    it('不正なURIパラメタ', async () => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.reject(new Error('エラーだよ'));
        const stubInvokeFunction = () => Promise.reject(new Error('エラーだよ'));

        app.use('/user', createUserRouter(stubQueryFunction, stubInvokeFunction));
        
        await chai.expect(testGet(server, '/user/kbc-<>itw/huruikagi')).to.be.rejectedWith('Bad Request');
        await chai.expect(testGet(server, '/user/kbc-<>itw/foobarfoobarfoob')).to.be.rejectedWith('Bad Request');
        await chai.expect(testGet(server, '/user/kbc-itw.net/foobarfoobarfoob')).to.be.rejectedWith('Bad Request');
    });

    it('通信後chaincodeがthrowしてきた', async () => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.reject(new Error('エラーだよ'));
        const stubInvokeFunction = () => Promise.resolve();

        app.use('/user', createUserRouter(stubQueryFunction, stubInvokeFunction));

        await chai.expect(testGet(server, '/user/kbc-itw.net/huruikagi')).to.be.rejectedWith('Internal Server Error');
    });

});
