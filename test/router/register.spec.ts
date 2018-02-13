
// import 'mocha';
// import * as chai from 'chai';

// import * as express from 'express';
// import { Server } from 'http';
// import * as config from 'config';
// import { IServerConfig } from '../../app/config/IServerConfig';
// import { createRegisterRouter } from '../../app/router/register';
// import * as sinon from 'sinon';
// import { testPost } from '../http-testing-function';
// import * as bodyParser from 'body-parser';
// import { configureUse } from '../../app/bootstrap';
// import { IUserAuth, Strategy } from '../../app/auth-db';
// import { logger } from '../../app/logger';
// import { MaybeDocument } from 'nano';

// chai.use(require('chai-as-promised'));

// describe('registerRouter /user/register post', () => {
//     const serverConfig = config.get<IServerConfig>('server');
//     let app: express.Express;
//     let server: Server;

//     const { port, host } = serverConfig;

//     beforeEach(async () => {
//         app = express();
//         configureUse(app);
//         server = await app.listen(port, host);
//     });

//     afterEach(async () => {
//         await server.close();
//     });

//     it('正常系', async () => {
//         app.use('/user/register', createRegisterRouter(async (auth: IUserAuth & MaybeDocument) => 'Success'));
//         try {
//             const result = await testPost(server, '/user/register', { localId: 'hoge', displayName: 'ほげ', user:{} });
//             chai.expect(result.status).to.be.equal(200);
//         } catch (e) {
//             logger.fatal(e);
//             chai.assert.fail(e);
//         }
//     });

//     it('ステータス不正', async () => {
//         app.use('/user/register', createRegisterRouter(async (auth: IUserAuth & MaybeDocument) => 'Success'));
//         try {
//             await chai.expect(testPost(server, '/user/register', { localId: '', displayName: 'ほげ' })).to.be.rejectedWith('Bad Request');
//             await chai.expect(testPost(server, '/user/register', { localId: '=', displayName: 'ほげ' })).to.be.rejectedWith('Bad Request');
//             await chai.expect(testPost(server, '/user/register', { localId: 'hoge', displayName: '' })).to.be.rejectedWith('Bad Request');
//             await chai.expect(testPost(server, '/user/register', { localId: 'hoge', displayName: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' })).to.be.rejectedWith('Bad Request');
//         } catch (e) {
//             chai.assert.fail(e);
//         }
//     });

// });
