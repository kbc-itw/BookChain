import 'mocha';
import * as chai from 'chai';
import * as express from 'express';
import * as config from 'config';
import { IServerConfig } from '../app/config/IServerConfig';
import { createTradingsRouter } from '../app/router/tradings';
import{ configureUse } from '../app/bootstrap';
import { createWebSocketServer, SocketRoom } from './../app/roomWebSocket';
import { isFQDN, isUUID, isRoleString, isLocator, isISBN, isRoomPurpose, UUID, FQDN, RoomPurpose, Locator, RoleString } from '../app/util';
import { stringify } from 'querystring';
import { String } from 'shelljs';
import * as http from 'http';
import * as ws from 'ws';
const uuidv4 = require('uuid/v4');
chai.use(require('chai-as-promised'));

describe('webSocket', () => {
    let app: express.Express;
    let server: http.Server;
    let appServer: http.Server;
    let wss: ws.Server;

    const serverConfig = config.get<IServerConfig>('server');
    const { port, host } = serverConfig;

    beforeEach((done) => {
        server = http.createServer();
        app = express();
        wss = new ws.Server({ port, host, server:appServer, path:'hoge/hoge' }, () => {appServer = app.listen(port); done();});
    });

    afterEach((done) => {
        appServer.close();
        wss.close(() => {
            done();
        });
    });

    it('借りる', async () => {
        chai.expect(wss).not.to.be.undefined;
    });

});


