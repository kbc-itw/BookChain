import 'mocha';
import * as chai from 'chai';
import * as express from 'express';
import { Server } from 'http';
import * as config from 'config';
import { IServerConfig } from '../../app/config/IServerConfig';
import { chainCodeQuery } from '../../app/chaincode-connection';
import * as sinon from 'sinon';
import { createOwnershipRouter } from '../../app/router/ownership';
import { testGet, testPost, testDelete } from '../http-testing-function';
import { logger } from '../../app/logger';
import * as bodyParser from 'body-parser';
import { createTradingsRouter } from '../../app/router/tradings';
import { configureUse } from '../../app/bootstrap';
chai.use(require('chai-http'));
chai.use(require('chai-as-promised'));

describe('tradingRouter /tradings get', () => {
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
            id: 'b6e59e77-b989-4b09-a99b-40865035c83d',
            owner: 'huruikagi@kbc-itw.net',
            borrower: 'taro@stu.kawahara.ac.jp',
            isbn: '9784873114675',
            lendAt: '2017-11-21T04:37:11.247Z',
        }]);

        const stubInvokeFunction = ()  => Promise.resolve();

        app.use('/tradings', createTradingsRouter(stubQueryFunction, stubInvokeFunction));

        // see http://neilsloane.com/oadir/oa.8.7.2.2.txt
        const results = await Promise.all([
            testGet(server, '/tradings'),
            testGet(server, '/tradings?owner=huruikagi@kbc-itw.net&isbn=9784873114675&limit=10'),
            testGet(server, '/tradings?borrower=taro@stu.kawahara.ac.jp&isbn=9784873114675&offset=10'),
            testGet(server, '/tradings?owner=huruikagi@kbc-itw.net&borrower=taro@stu.kawahara.ac.jp&limit=10&offset=10'),
            testGet(server, '/tradings?isreturned=true&limit=10&offset=10'),
            testGet(server, '/tradings?owner=huruikagi@kbc-itw.net&isbn=9784873114675&isreturned=true&offset=10'),
            testGet(server, '/tradings?borrower=taro@stu.kawahara.ac.jp&isbn=9784873114675&isreturned=true&limit=10'),
            testGet(server, '/tradings?owner=huruikagi@kbc-itw.net&borrower=taro@stu.kawahara.ac.jp&isreturned=true'),
        ]);
        for (const result of results) {
            chai.expect(result.status).to.be.equal(200);
            chai.expect(result.body.result).to.be.deep.equal([{
                id: 'b6e59e77-b989-4b09-a99b-40865035c83d',
                owner: 'huruikagi@kbc-itw.net',
                borrower: 'taro@stu.kawahara.ac.jp',
                isbn: '9784873114675',
                lendAt: '2017-11-21T04:37:11.247Z',
            }]);
        }
    });

    it('不正なgetパラメタ', async () => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.resolve([{
            id: 'b6e59e77-b989-4b09-a99b-40865035c83d',
            owner: 'huruikagi@kbc-itw.net',
            borrower: 'taro@stu.kawahara.ac.jp',
            isbn: '9784873114675',
            lendAt: '2017-11-21T04:37:11.247Z',
        }]);

        const stubInvokeFunction = ()  => Promise.resolve();

        app.use('/tradings', createTradingsRouter(stubQueryFunction, stubInvokeFunction));

        await chai.expect(testGet(server, '/tradings?owner=foobarfoobarfoob@kbc-itw.net&isbn=1234567890123&limit=hoge')).to.be.rejectedWith('Bad Request');
        await chai.expect(testGet(server, '/tradings?borrower=tarotarotarotaro@stu.kawahara.ac.jp&isbn=1234567890123&offset=hoge')).to.be.rejectedWith('Bad Request');
        await chai.expect(testGet(server, '/tradings?owner=foobarfoobarfoob@kbc-itw.net&borrower=tarotarotarotaro@stu.kawahara.ac.jp&limit=hoge&offset=hoge')).to.be.rejectedWith('Bad Request');
        await chai.expect(testGet(server, '/tradings?isreturned=hoge&limit=hoge&offset=hoge')).to.be.rejectedWith('Bad Request');
        await chai.expect(testGet(server, '/tradings?owner=foobarfoobarfoob@kbc-itw.net&isbn=1234567890123&isreturned=hoge&offset=hoge')).to.be.rejectedWith('Bad Request');
        await chai.expect(testGet(server, '/tradings?borrower=tarotarotarotaro@stu.kawahara.ac.jp&isbn=1234567890123&isreturned=hoge&limit=hoge')).to.be.rejectedWith('Bad Request');
        await chai.expect(testGet(server, '/tradings?owner=foobarfoobarfoob@kbc-itw.net&borrower=tarotarotarotaro@stu.kawahara.ac.jp&isreturned=hoge')).to.be.rejectedWith('Bad Request');
    });

    it('通信後chaincodeがthrowしてきた', async () => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.reject(new Error('エラーだよ'));
        const stubInvokeFunction = (request: ChaincodeInvokeRequest) => Promise.reject(new Error('エラーだよ'));

        app.use('/tradings', createTradingsRouter(stubQueryFunction, stubInvokeFunction));

        await chai.expect(testGet(server, '/tradings')).to.be.rejectedWith('Internal Server Error');
    });
    it('正常系', async () => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.resolve({
            id: 'b6e59e77-b989-4b09-a99b-40865035c83d',
            owner: 'huruikagi@kbc-itw.net',
            borrower: 'taro@stu.kawahara.ac.jp',
            isbn: '9784873114675',
            lendAt: '2017-11-21T04:37:11.247Z',
        });

        const stubInvokeFunction = ()  => Promise.resolve();

        app.use('/tradings', createTradingsRouter(stubQueryFunction, stubInvokeFunction));

        try {
            const result = await testGet(server, '/tradings/b6e59e77-b989-4b09-a99b-40865035c83d');
            chai.expect(result.status).to.be.equal(200);
            chai.expect(result.body).to.deep.equal({
                id: 'b6e59e77-b989-4b09-a99b-40865035c83d',
                owner: 'huruikagi@kbc-itw.net',
                borrower: 'taro@stu.kawahara.ac.jp',
                isbn: '9784873114675',
                lendAt: '2017-11-21T04:37:11.247Z',
            });
        } catch (e) {
            chai.assert.fail();
        }
    });

    it('不正なURIパラメタ', async () => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.reject(new Error('エラーだよ'));
        const stubInvokeFunction = () => Promise.reject(new Error('エラーだよ'));

        app.use('/tradings', createTradingsRouter(stubQueryFunction, stubInvokeFunction));
        
        await chai.expect(testGet(server, '/tradings/foobarfoobarfoo')).to.be.rejectedWith('Bad Request');
    });

    it('通信後chaincodeがthrowしてきた', async () => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.reject(new Error('エラーだよ'));
        const stubInvokeFunction = () => Promise.resolve();

        app.use('/tradings', createTradingsRouter(stubQueryFunction, stubInvokeFunction));

        await chai.expect(testGet(server, '/tradings/b6e59e77-b989-4b09-a99b-40865035c83d')).to.be.rejectedWith('Internal Server Error');
    });


});
