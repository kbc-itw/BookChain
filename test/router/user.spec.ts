import 'mocha';
import * as chai from 'chai';
import * as express from 'express';
import { Server } from 'http';
import * as config from 'config';
import { IServerConfig } from '../../app/config/IServerConfig';
import { createUserRouter } from '../../app/router/user';
import { chainCodeQuery } from '../../app/chaincode-connection';
import * as sinon from 'sinon';
import { initializeLogger } from '../../app/logger';

chai.use(require('chai-http'));

describe('userRouter /user', () => {
    const serverConfig = config.get<IServerConfig>('server');
    let app: express.Express;
    let server: Server;

    const { port, host } = serverConfig;

    before(() => {
        initializeLogger();
    });
    beforeEach((done) => {
        app = express();
        server = app.listen(port, host, () => done());
    });

    afterEach((done) => {
        server.close(() => done());
    });

    it('正常系', (done) => {
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
        chai.request(server)
            .get('/user')
            .end((err, res) => {
                const dataArray = res.body;
                chai.expect(res.body.length).to.be.eql(2);
                chai.expect(res.status).to.be.equal(200);
                chai.expect(dataArray[0]).to.deep.equal({
                    locator: 'huruikagi@kbc-itw.net',
                    host: 'kbc-itw.net',
                    id: 'huruikagi',
                    name: 'huruikagi',
                });
                done();
            });
    });

    it('通信後chaincodeがthrowしてきた', (done) => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.reject({ error:true });
        const stubInvokeFunction = () => Promise.resolve();

        app.use(createUserRouter(stubQueryFunction, stubInvokeFunction));
        chai.request(server)
            .get('/')
            .end((err, res) => {
                chai.expect(res.status).to.be.equal(500);
                chai.expect(res.body).to.deep.equal({ error: true });
                done();
            });
    });
});

describe('userRouter /user/:host/:id', () => {
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
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.resolve({
            locator: 'huruikagi@kbc-itw.net',
            host: 'kbc-itw.net',
            id: 'huruikagi',
            name:'huruikagi',
        });

        const stubInvokeFunction = ()  => Promise.resolve();

        app.use('/user', createUserRouter(stubQueryFunction, stubInvokeFunction));
        chai.request(server)
            .get('/user/kbc-itw.net/huruikagi')
            .end((err, res) => {
                chai.expect(res.status).to.be.equal(200);
                chai.expect(res.body).to.deep.equal({
                    locator: 'huruikagi@kbc-itw.net',
                    host: 'kbc-itw.net',
                    id: 'huruikagi',
                    name: 'huruikagi',
                });
                done();
            });
    });

    it('通信後chaincodeがthrowしてきた', (done) => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.reject({ error:true });
        const stubInvokeFunction = () => Promise.resolve();

        app.use('/user', createUserRouter(stubQueryFunction, stubInvokeFunction));
        chai.request(server)
            .get('/user/kbc-itw.net/huruikagi')
            .end((err, res) => {
                chai.expect(res.status).to.be.equal(500);
                chai.expect(res.body).to.deep.equal({ error: true });
                done();
            });
    });

    it('invalidなURIパラメタでのアクセス', (done) => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.reject({ error:true });
        const stubInvokeFunction = () => Promise.resolve();

        app.use('/user', createUserRouter(stubQueryFunction, stubInvokeFunction));
        Promise.all([
            new Promise((resolve, reject) => {
                chai.request(server)
                    .get('/user/kbc-<>itw/huruikagi')
                    .end((err, res) => {
                        chai.expect(res.status).to.be.equal(400);
                        chai.expect(res.body).to.deep.equal({ error: true });
                        resolve();
                    });
            }),
            new Promise((resolve, reject) => {
                chai.request(server)
                .get('/user/kbc-itw.net/foobarfoobarfoob')
                .end((err, res) => {
                    chai.expect(res.status).to.be.equal(400);
                    chai.expect(res.body).to.deep.equal({ error: true });
                    resolve();
                });
            }),
            new Promise((resolve, reject) => {
                chai.request(server)
                .get('/user/kbc-<>itw/foobarfoobarfoob')
                .end((err, res) => {
                    chai.expect(res.status).to.be.equal(400);
                    chai.expect(res.body).to.deep.equal({ error: true });
                    resolve();
                });
            }),
        ]).then(result => done());
    });

});
