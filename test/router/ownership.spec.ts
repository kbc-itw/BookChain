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

describe('ownershipRouter /ownership get', () => {
    const serverConfig = config.get<IServerConfig>('server');
    let app: express.Express;
    let server: Server;

    const { port, host } = serverConfig;

    beforeEach((done) => {
        app = express();
        server = app.listen(port, host, () => done());
    });

    afterEach((done) => {
        server.close(() => done());
    });

    it('正常系', (done) => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.resolve([{
            owner: 'huruikagi@kbc-itw.net',
            isbn: '9784873114675',
            createdAt: '2017-11-21T04:37:11.247Z',
        }]);

        const stubInvokeFunction = ()  => Promise.resolve();

        app.use('/ownership', createOwnershipRouter(stubQueryFunction, stubInvokeFunction));

        // see http://neilsloane.com/oadir/oa.8.4.2.3.txt
        Promise.all([
            testGet(server, '/ownership'),
            testGet(server, '/ownership?limit=10&offset=0'),
            testGet(server, '/ownership?isbn=9784873114675&offset=0'),
            testGet(server, '/ownership?isbn=9784873114675&limit=10'),
            testGet(server, '/ownership?owner=huruikagi@kbc-itw.net&offset=0'),
            testGet(server, '/ownership?owner=huruikagi@kbc-itw.net&limit=10'),
            testGet(server, '/ownership?owner=huruikagi@kbc-itw.net&isbn=9784873114675'),
            testGet(server, '/ownership?owner=huruikagi@kbc-itw.net&isbn=9784873114675&limit=10&offset=0'),
        ]).then((results) => {
            for (const result of results) {
                chai.expect(result.status).to.be.equal(200);
                chai.expect(result.body.result).to.deep.equal([{
                    owner: 'huruikagi@kbc-itw.net',
                    isbn: '9784873114675',
                    createdAt: '2017-11-21T04:37:11.247Z',
                }]);
            }
            done();
        }).catch(err => done());
    });

    it('不正データ投げつけ', (done) => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.resolve([{
            owner: 'huruikagi@kbc-itw.net',
            isbn: '9784873114675',
            createdAt: '2017-11-21T04:37:11.247Z',
        }]);

        const stubInvokeFunction = ()  => Promise.resolve();
        process.on('unhandledRejection', console.dir);
        
        app.use('/ownership', createOwnershipRouter(stubQueryFunction, stubInvokeFunction));

        // see http://neilsloane.com/oadir/oa.8.4.2.3.txt
        Promise.all([
            testGet(server, '/ownership?limit=hoge&offset=moge'),
            testGet(server, '/ownership?isbn=3334873114675&offset=moge'),
            testGet(server, '/ownership?isbn=3334873114675&limit=hoge'),
            testGet(server, '/ownership?owner=foobarfoobarfoob@kbc-itw.net&offset=moge'),
            testGet(server, '/ownership?owner=foobarfoobarfoob@kbc-itw.net&limit=hoge'),
            testGet(server, '/ownership?owner=foobarfoobarfoob@kbc-itw.net&isbn=3334873114675'),
            testGet(server, '/ownership?owner=foobarfoobarfoob@kbc-itw.net&isbn=3334873114675&limit=hoge&offset=moge'),
        ]).then((results) => {
            for (const result of results) {
                chai.expect(result.status).to.be.equal(400);
            }
            done();
        }).catch(err => done());
    });

    it('通信後chaincodeがthrowしてきた', (done) => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.reject(new Error('エラーだよ'));
        const stubInvokeFunction = () => Promise.resolve();

        app.use('/ownership', createOwnershipRouter(stubQueryFunction, stubInvokeFunction));

        testGet(server, '/ownership')
            .then((result) => {
                chai.expect(result.status).to.be.equal(500);
                chai.expect(result.body).to.deep.equal({ error: true });
                done();
            }).catch(err => done());
    });
});

describe('ownershipRouter /ownership post', () => {
    const serverConfig = config.get<IServerConfig>('server');
    let app: express.Express;
    let server: Server;

    const { port, host } = serverConfig;

    beforeEach((done) => {
        app = express();
        app.use(bodyParser.urlencoded({
            extended: true,
        }));
        app.use(bodyParser.json());
        server = app.listen(port, host, () => done());
    });

    afterEach((done) => {
        server.close(() => done());
    });

    it('正常系', (done) => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.resolve();
        const stubInvokeFunction = (request:ChaincodeInvokeRequest)  => Promise.resolve();
        const data = {
            owner: 'huruikagi@kbc-itw.net',
            isbn : '9784873114675',
        };

        app.use('/ownership', createOwnershipRouter(stubQueryFunction, stubInvokeFunction));

        testPost(server, '/ownership', data)
            .then((result) => {
                chai.expect(result.status).to.be.equal(201);
                done();
            }).catch(err => done());
    });

    it('不正データ', (done) => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.resolve();
        const stubInvokeFunction = (request: ChaincodeInvokeRequest)  => Promise.resolve();

        app.use('/ownership', createOwnershipRouter(stubQueryFunction, stubInvokeFunction));

        Promise.all([
            testPost(server, '/ownership', {}),
            testPost(server, '/ownership', { owner: 'foobarfoobarfoob@kbc-itw.net' }),
            testPost(server, '/ownership', { owner: '' }),
            testPost(server, '/ownership', { owner: 'foobarfoobarfoob@kbc-itw.net', isbn: '3334873114675' }),
            testPost(server, '/ownership', { owner: 'foobarfoobarfoob@kbc-itw.net', isbn: '' }),
            testPost(server, '/ownership', { owner: '', isbn: '3334873114675' }),
            testPost(server, '/ownership', { owner: '', isbn: '' }),
        ]).then((results) => {
            for (const result of results) {
                chai.expect(result.status).to.be.equal(400);
            }
            done();
        }).catch(err => done());
    });

    it('通信後chaincodeがthrowしてきた', (done) => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.reject(new Error('エラーだよ'));
        const stubInvokeFunction = (request: ChaincodeInvokeRequest) => Promise.reject(new Error('エラーだよ'));
        const data = {
            owner: 'huruikagi@kbc-itw.net',
            isbn : '9784873114675',
        };

        app.use('/ownership', createOwnershipRouter(stubQueryFunction, stubInvokeFunction));

        testPost(server, '/ownership', data)
            .then((result) => {
                chai.expect(result.status).to.be.equal(500);
                chai.expect(result.body).to.deep.equal({ error: true });
                done();
            }).catch(err => done());
    });
});


describe('/ownership delete', () => {
    const serverConfig = config.get<IServerConfig>('server');
    let app: express.Express;
    let server: Server;

    const { port, host } = serverConfig;

    beforeEach((done) => {
        app = express();
        app.use(bodyParser.urlencoded({
            extended: true,
        }));
        app.use(bodyParser.json());
        server = app.listen(port, host, () => done());
    });

    afterEach((done) => {
        server.close(() => done());
    });

    it('正常系', (done) => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.resolve();
        const stubInvokeFunction = (request: ChaincodeInvokeRequest)  => Promise.resolve();
        const data = {
            owner: 'huruikagi@kbc-itw.net',
            isbn : '9784873114675',
        };

        app.use('/ownership', createOwnershipRouter(stubQueryFunction, stubInvokeFunction));

        testDelete(server, '/ownership', data)
            .then((result) => {
                chai.expect(result.status).to.be.equal(201);
                done();
            }).catch(err => done());
    });

    it('不正データ', (done) => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.resolve();
        const stubInvokeFunction = (request: ChaincodeInvokeRequest) => Promise.resolve();
        
        app.use('/ownership', createOwnershipRouter(stubQueryFunction, stubInvokeFunction));

        Promise.all([
            testDelete(server, '/ownership', {}),
            testDelete(server, '/ownership', { owner: 'foobarfoobarfoob@kbc-itw.net' }),
            testDelete(server, '/ownership', { owner: '' }),
            testDelete(server, '/ownership', { owner: 'foobarfoobarfoob@kbc-itw.net', isbn: '3334873114675' }),
            testDelete(server, '/ownership', { owner: 'foobarfoobarfoob@kbc-itw.net', isbn: '' }),
            testDelete(server, '/ownership', { owner: '', isbn: '3334873114675' }),
            testDelete(server, '/ownership', { owner: '', isbn: '' }),
        ]).then((results) => {
            for (const result of results) {
                chai.expect(result.status).to.be.equal(400);
            }
            done();
        }).catch(err => done());
    });

    it('通信後chaincodeがthrowしてきた', (done) => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.reject(new Error('エラーだよ'));
        const stubInvokeFunction = (request: ChaincodeInvokeRequest) => Promise.reject(new Error('エラーだよ'));
        const data = {
            owner: 'huruikagi@kbc-itw.net',
            isbn : '9784873114675',
        };

        app.use('/ownership', createOwnershipRouter(stubQueryFunction, stubInvokeFunction));

        testDelete(server, '/ownership', data)
            .then((result) => {
                chai.expect(result.status).to.be.equal(500);
                chai.expect(result.body).to.deep.equal({ error: true });
                done();
            }).catch(err => done());
    });
});

