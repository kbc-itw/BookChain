import 'mocha';
import * as chai from 'chai';
import * as express from 'express';
import * as config from 'config';
import { IServerConfig } from '../app/config/IServerConfig';
import { createTradingsRouter } from '../app/router/tradings';
import{ configureUse } from '../app/bootstrap';
import { SocketRoom, configureWebSocket, createWebSocketServer } from './../app/roomWebSocket';
import { isFQDN, isUUID, isRoleString, isLocator, isISBN, isRoomPurpose, UUID, FQDN, RoomPurpose, Locator, RoleString } from '../app/util';
import { stringify } from 'querystring';
import { String } from 'shelljs';
import * as http from 'http';
import * as ws from 'ws';
import { IWebSocketConfig } from '../app/config/IWSConfig';
import * as bodyParser from 'body-parser';
const uuidv4 = require('uuid/v4');
chai.use(require('chai-as-promised'));

describe('webSocket', () => {
    let app: express.Express;
    let server: http.Server;
    let wss: ws.Server;
    const serverConfig = config.get<IServerConfig>('server');
    const { port, host } = serverConfig;
    const wsConfig = config.get<IWebSocketConfig>('webSocket');
    const wsPort = wsConfig.port;
    const wsHost = wsConfig.host;

    beforeEach((done) => {
        app = express();
        app.use(bodyParser.urlencoded({
            extended: true,
        }));
        app.use(bodyParser.json());
        server = app.listen(port, host, () => {
            createWebSocketServer(server, '/rooms/connect', new Map(), async () => {}, async () => {})
                .then((result) => {
                    wss = result;
                    done();
                });
        });
    });

    afterEach((done) => {
        server.close(() => {
            wss.close(() => {
                done();
            });
        });
    });

    it('借りる', async () => {
        chai.expect(wss).not.to.be.undefined;
    });

});


