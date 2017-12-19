import 'mocha';
import * as chai from 'chai';
import * as express from 'express';
import { Server } from 'http';
import * as config from 'config';
import { IServerConfig } from '../../app/config/IServerConfig';
import { createUserRouter } from '../../app/router/user';
import { chainCodeQuery } from '../../app/chaincode-connection';
import * as sinon from 'sinon';
import { createOwnershipRouter } from '../../app/router/ownership';
import { testGet, testPost, testDelete } from '../http-testing-function';
import { logger } from '../../app/logger';
import * as bodyParser from 'body-parser';
chai.use(require('chai-http'));
chai.use(require('chai-as-promised'));

describe('ownershipRouter /ownership get', () => {
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
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.resolve([{
            owner: 'huruikagi@kbc-itw.net',
            isbn: '9784873114675',
            createdAt: '2017-11-21T04:37:11.247Z',
        }]);

        const stubInvokeFunction = ()  => Promise.resolve();

        app.use('/ownership', createOwnershipRouter(stubQueryFunction, stubInvokeFunction));

        // see http://neilsloane.com/oadir/oa.8.4.2.3.txt
        try {
            const results = await Promise.all([
                testGet(server, '/ownership'),
                testGet(server, '/ownership?limit=10&offset=0'),
                testGet(server, '/ownership?isbn=9784873114675&offset=0'),
                testGet(server, '/ownership?isbn=9784873114675&limit=10'),
                testGet(server, '/ownership?owner=huruikagi@kbc-itw.net&offset=0'),
                testGet(server, '/ownership?owner=huruikagi@kbc-itw.net&limit=10'),
                testGet(server, '/ownership?owner=huruikagi@kbc-itw.net&isbn=9784873114675'),
                testGet(server, '/ownership?owner=huruikagi@kbc-itw.net&isbn=9784873114675&limit=10&offset=0'),
            ]);
            for (const result of results) {
                chai.expect(result.status).to.be.equal(200);
                chai.expect(result.body.result).to.deep.equal([{
                    owner: 'huruikagi@kbc-itw.net',
                    isbn: '9784873114675',
                    createdAt: '2017-11-21T04:37:11.247Z',
                }]);
            }
        } catch (e) {
            chai.assert.fail();
        }
    });

    it('不正データ投げつけ', async () => {

        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.resolve([{
            owner: 'huruikagi@kbc-itw.net',
            isbn: '9784873114675',
            createdAt: '2017-11-21T04:37:11.247Z',
        }]);

        const stubInvokeFunction = ()  => Promise.resolve();
        
        app.use('/ownership', createOwnershipRouter(stubQueryFunction, stubInvokeFunction));

        // see http://neilsloane.com/oadir/oa.8.4.2.3.txt
        try {
            await chai.expect(testGet(server, '/ownership?limit=hoge&offset=moge')).to.be.rejectedWith('Bad Request');
            await chai.expect(testGet(server, '/ownership?isbn=3334873114675&offset=moge')).to.be.rejectedWith('Bad Request');
            await chai.expect(testGet(server, '/ownership?isbn=3334873114675&limit=hoge')).to.be.rejectedWith('Bad Request');
            await chai.expect(testGet(server, '/ownership?owner=foobarfoobarfoob@kbc-itw.net&offset=moge')).to.be.rejectedWith('Bad Request');
            await chai.expect(testGet(server, '/ownership?owner=foobarfoobarfoob@kbc-itw.net&limit=hoge')).to.be.rejectedWith('Bad Request');
            await chai.expect(testGet(server, '/ownership?owner=foobarfoobarfoob@kbc-itw.net&isbn=3334873114675')).to.be.rejectedWith('Bad Request');
            await chai.expect(testGet(server, '/ownership?owner=foobarfoobarfoob@kbc-itw.net&isbn=3334873114675&limit=hoge&offset=moge')).to.be.rejectedWith('Bad Request');
        } catch (e) {
            chai.assert.fail();
        }
    });

    it('通信後chaincodeがthrowしてきた', async () => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.reject(new Error('エラーだよ'));
        const stubInvokeFunction = () => Promise.resolve();

        app.use('/ownership', createOwnershipRouter(stubQueryFunction, stubInvokeFunction));
        
        await chai.expect(testGet(server, '/ownership')).to.be.rejectedWith('Internal Server Error');
    });
});

describe('ownershipRouter /ownership post', () => {
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
        server = await app.listen(port, host);
    });

    afterEach(async () => {
        await server.close();
    });

    it('正常系', async () => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.resolve();
        const stubInvokeFunction = (request:ChaincodeInvokeRequest)  => Promise.resolve();
        const data = {
            owner: 'huruikagi@kbc-itw.net',
            isbn : '9784873114675',
        };

        app.use('/ownership', createOwnershipRouter(stubQueryFunction, stubInvokeFunction));
        
        try {
            const result = await testPost(server, '/ownership', data);
            chai.expect(result.status).to.be.equal(201);
        } catch (e) {
            chai.assert.fail();
        }
    });

    it('不正データ', async () => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.resolve();
        const stubInvokeFunction = (request: ChaincodeInvokeRequest)  => Promise.resolve();

        app.use('/ownership', createOwnershipRouter(stubQueryFunction, stubInvokeFunction));

        try {
            await chai.expect(testPost(server, '/ownership', {})).to.be.rejectedWith('Bad Request');
            await chai.expect(testPost(server, '/ownership', { owner: 'foobarfoobarfoob@kbc-itw.net' })).to.be.rejectedWith('Bad Request');
            await chai.expect(testPost(server, '/ownership', { owner: '' })).to.be.rejectedWith('Bad Request');
            await chai.expect(testPost(server, '/ownership', { owner: 'foobarfoobarfoob@kbc-itw.net', isbn: '3334873114675' })).to.be.rejectedWith('Bad Request');
            await chai.expect(testPost(server, '/ownership', { owner: 'foobarfoobarfoob@kbc-itw.net', isbn: '' })).to.be.rejectedWith('Bad Request');
            await chai.expect(testPost(server, '/ownership', { owner: '', isbn: '3334873114675' })).to.be.rejectedWith('Bad Request');
            await chai.expect(testPost(server, '/ownership', { owner: '', isbn: '' })).to.be.rejectedWith('Bad Request');
        } catch (e) {
            chai.assert.fail();
        }
    });

    it('通信後chaincodeがthrowしてきた',async () => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.reject(new Error('エラーだよ'));
        const stubInvokeFunction = (request: ChaincodeInvokeRequest) => Promise.reject(new Error('エラーだよ'));
        const data = {
            owner: 'huruikagi@kbc-itw.net',
            isbn : '9784873114675',
        };

        app.use('/ownership', createOwnershipRouter(stubQueryFunction, stubInvokeFunction));

        await chai.expect(testPost(server, '/ownership', data)).to.be.rejectedWith('Internal Server Error');
    });
});


describe('/ownership delete', () => {
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
        server = await app.listen(port, host);
    });

    afterEach(async () => {
        await server.close();
    });

    it('正常系', async () => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.resolve();
        const stubInvokeFunction = (request: ChaincodeInvokeRequest)  => Promise.resolve();
        const data = {
            owner: 'huruikagi@kbc-itw.net',
            isbn : '9784873114675',
        };

        app.use('/ownership', createOwnershipRouter(stubQueryFunction, stubInvokeFunction));

        try {
            const result = await testDelete(server, '/ownership', data);
            chai.expect(result.status).to.be.equal(200);
        } catch (e) {
            chai.assert.fail();
        }
    });

    it('不正データ', async () => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.resolve();
        const stubInvokeFunction = (request: ChaincodeInvokeRequest) => Promise.resolve();
        
        app.use('/ownership', createOwnershipRouter(stubQueryFunction, stubInvokeFunction));

        try {
            await chai.expect(testDelete(server, '/ownership', {})).to.be.rejectedWith('Bad Request');
            await chai.expect(testDelete(server, '/ownership', { owner: 'foobarfoobarfoob@kbc-itw.net' })).to.be.rejectedWith('Bad Request');
            await chai.expect(testDelete(server, '/ownership', { owner: '' })).to.be.rejectedWith('Bad Request');
            await chai.expect(testDelete(server, '/ownership', { owner: 'foobarfoobarfoob@kbc-itw.net', isbn: '3334873114675' })).to.be.rejectedWith('Bad Request');
            await chai.expect(testDelete(server, '/ownership', { owner: 'foobarfoobarfoob@kbc-itw.net', isbn: '' })).to.be.rejectedWith('Bad Request');
            await chai.expect(testDelete(server, '/ownership', { owner: '', isbn: '3334873114675' })).to.be.rejectedWith('Bad Request');
            await chai.expect(testDelete(server, '/ownership', { owner: '', isbn: '' })).to.be.rejectedWith('Bad Request');
        } catch (e) {
            chai.assert.fail();
        }
    });

    it('通信後chaincodeがthrowしてきた', async () => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.reject(new Error('エラーだよ'));
        const stubInvokeFunction = (request: ChaincodeInvokeRequest) => Promise.reject(new Error('エラーだよ'));
        const data = {
            owner: 'huruikagi@kbc-itw.net',
            isbn : '9784873114675',
        };

        app.use('/ownership', createOwnershipRouter(stubQueryFunction, stubInvokeFunction));

        await chai.expect(testDelete(server, '/ownership', data)).to.be.rejectedWith('Internal Server Error');
    });
});

