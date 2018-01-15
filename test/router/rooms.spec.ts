import 'mocha';
import * as chai from 'chai';

import * as express from 'express';
import { Server } from 'http';
import * as config from 'config';
import { IServerConfig } from '../../app/config/IServerConfig';
import { createUserRouter } from '../../app/router/user';
import { chainCodeQuery } from '../../app/chaincode-connection';
import * as sinon from 'sinon';
import { testPost } from '../http-testing-function';
import * as bodyParser from 'body-parser';
import { createRoomsRouter } from '../../app/router/rooms';
import { configureUse } from '../../app/bootstrap';
chai.use(require('chai-as-promised'));

describe('roomsRouter /rooms post', () => {
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
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.resolve();
        const stubInvokeFunction = (request:ChaincodeInvokeRequest)  => Promise.resolve({
            room: {
                host: 'kbc-itw.net',
                id: '6397a19a-bc25-4d73-9dad-98187c1eb698',
                purpose: 'rental',
                inviter: 'huruikagi@example.com',
                createdAt: '2017-11-22T07:16:55.316Z',
            },
            inviteToken: 'JUGt2HUkqFTUfkyuC0MfmSN9BCdZPKDTSdOY',
        });
        const data = {
            purpose: 'rental',
            inviter: 'huruikagi@example.com',
        };

        app.use('/rooms', createRoomsRouter(stubQueryFunction, stubInvokeFunction));
        
        try {
            const result = await testPost(server, '/rooms', data);
            chai.expect(result.status).to.be.equal(201);
            chai.expect(result.body).to.be.deep.equal({
                room: {
                    host: 'kbc-itw.net',
                    id: '6397a19a-bc25-4d73-9dad-98187c1eb698',
                    purpose: 'rental',
                    inviter: 'huruikagi@example.com',
                    createdAt: '2017-11-22T07:16:55.316Z',
                },
                inviteToken: 'JUGt2HUkqFTUfkyuC0MfmSN9BCdZPKDTSdOY',
            });
        } catch (e) {
            chai.assert.fail();
        }
    });

    it('不正なデータ', async () => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.resolve();
        const stubInvokeFunction = (request:ChaincodeInvokeRequest)  => Promise.resolve({
            room: {
                host: 'kbc-itw.net',
                id: '6397a19a-bc25-4d73-9dad-98187c1eb698',
                purpose: 'rental',
                inviter: 'huruikagi@example.com',
                createdAt: '2017-11-22T07:16:55.316Z',
            },
            inviteToken: 'JUGt2HUkqFTUfkyuC0MfmSN9BCdZPKDTSdOY',
        });

        const datas = [
            { purpose: 'hogehoge', inviter: 'huruikagi@example.com' },
            { purpose: '',         inviter: 'huruikagi@example.com' },
            { purpose: 'hogehoge', inviter: 'foobarfoobarfoob@example.com' },
            { purpose: 'hogehoge', inviter: '' },
            { purpose: '',         inviter: 'foobarfoobarfoob@example.com' },
            { purpose: '',         inviter: '' },
        ];

        app.use('/rooms', createRoomsRouter(stubQueryFunction, stubInvokeFunction));
        
        for (const data of datas) {
            await chai.expect(testPost(server, '/rooms', data)).to.be.rejectedWith('Bad Request');
        }
    });

    it('通信後chaincodeがthrowしてきた', async () => {
        const stubQueryFunction = (request: ChaincodeQueryRequest) => Promise.reject(new Error('エラーだよ'));
        const stubInvokeFunction = (request: ChaincodeInvokeRequest) => Promise.reject(new Error('エラーだよ'));
        const data = {
            purpose: 'rental',
            inviter: 'huruikagi@example.com',
        };

        app.use('/rooms', createRoomsRouter(stubQueryFunction, stubInvokeFunction));

        await chai.expect(testPost(server, '/rooms', data)).to.be.rejectedWith('Internal Server Error');
    });

});
