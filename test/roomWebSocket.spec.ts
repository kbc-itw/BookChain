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
import { connection, client } from 'websocket';

const uuidv4 = require('uuid/v4');
chai.use(require('chai-as-promised'));

describe('webSocket', () => {
    let app: express.Express;
    let server: http.Server;
    let wss: ws.Server;
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
        const roomMap = new Map<UUID, SocketRoom>();
        roomMap.set(uuid, socketRoom);
        app = express();
        app.use(bodyParser.urlencoded({
            extended: true,
        }));
        app.use(bodyParser.json());
        server = app.listen(port, host, () => {
            createWebSocketServer(server, '/rooms/connect', roomMap, async () => {}, async () => {})
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
        // webSocketClientの立ち上げ
        try {
            const inviterConnection = await inviterConnect();
            const guestConnection = await guestConnect();
        } catch (e) {
            chai.assert.fail(e);
        }
        // chai.expect(wss).not.to.be.undefined;
    });

    function getUniqueStr(): UUID {
        const uuid = uuidv4();
        if (isUUID(uuid)) {
            return uuid;
        }
        throw new Error();
    }

    function inviterConnect(): Promise<connection | Error> {
        return new Promise((resolve, reject) => {
            const connection = new client();
            connection.on('connectFailed', (error: Error) => {
                console.log('Connect Error invite: ' + error.toString());
                reject(error);
            });
            connection.on('connect', (connection: connection) => {
                console.log('WebSocket inviterClient Connected');
                resolve(connection);

                connection.on('message', (message) => {
                    if (message.type === 'utf8') {
                        console.log('Received: ' + message.utf8Data);
                    }
                });

                connection.on('error', (error) => {
                    console.log('Connection Error: ' + error.toString());
                });
                connection.on('close', () => {
                    console.log('echo-protocol Connection Closed');
                });

            });

            connection.connect(`ws://localhost:3001/rooms/connect?roomID=${uuid}&role=inviter&locator=${inviter}`, '');
        });
    }

    function guestConnect(): Promise<connection | Error> {
        return new Promise((resolve, reject) => {
            const connection = new client();
            connection.on('connectFailed', (error: Error) => {
                console.log('Connect Error guest: ' + error.toString());
                reject(error);
            });
            connection.on('connect', (connection: connection) => {
                console.log('WebSocket guestClient Connected');
                resolve(connection);

                connection.on('message', (message) => {
                    if (message.type === 'utf8' && message.utf8Data) {
                        const val = JSON.parse(message.utf8Data);
                        console.log('guest');
                        console.log(message);
                    }
                });

                connection.on('error', (error) => {
                    console.log('Connection Error: ' + error.toString());
                });
                connection.on('close', () => {
                    console.log('echo-protocol Connection Closed');
                });
                
            });
            connection.connect(`ws://localhost:3001/rooms/connect?roomID=${uuid}&locator=${guest}&role=guest&inviteToken=${tokenUUID}`);
        });
    }



});

