import 'mocha';
import * as chai from 'chai';
import * as express from 'express';
import * as config from 'config';
import { IServerConfig } from '../app/config/IServerConfig';
import { isFQDN, isUUID, isRoleString, isLocator, isISBN, isRoomPurpose, UUID, FQDN, RoomPurpose, Locator, RoleString } from '../app/util';
import * as http from 'http';
import * as ws from 'ws';
import { IWebSocketConfig } from '../app/config/IWSConfig';
import * as bodyParser from 'body-parser';
import { createWebSocketServer, SocketRoom } from '../app/roomWebSocket';
import * as webSocket from 'websocket';

const uuidv4 = require('uuid/v4');
chai.use(require('chai-as-promised'));

describe('webSocket', () => {
    let app: express.Express;
    let server: http.Server;
    let wss: ws.Server;
    let client: webSocket.client;
    const serverConfig = config.get<IServerConfig>('server');
    const { port, host } = serverConfig;
    const uuid: UUID = getUniqueStr();
    const tokenUUID: UUID = getUniqueStr();
    const fqdn = 'example.com';
    const inviter = 'inviter@example.com';
    const guest = 'guest@example.com';
    const roomPurposeRental = 'rental';
    const isbn = '9784274068560';
    let socketRoom: SocketRoom;
    // socketRoomのデフォルトを設定
    if (isFQDN(fqdn) && isLocator(inviter) && isRoomPurpose(roomPurposeRental) && isLocator(guest) && isISBN(isbn)) {
        socketRoom = {
            isbn,
            room: {
                guest,
                inviter,
                id: uuid,
                host: fqdn,
                purpose: roomPurposeRental,
                createdAt: new Date(),
                closedAt: undefined ,
            },
            inviterApproved: false,
            guestApproved: false,
            inviteToken: tokenUUID,
            inviterSocket: undefined,
            guestSocket: undefined,
        };
    }
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

    function getUniqueStr(): UUID {
        const uuid = uuidv4();
        if (isUUID(uuid)) {
            return uuid;
        }
        throw new Error();
    }

});

