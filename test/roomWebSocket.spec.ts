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
import { connection, client as Client, IMessage } from 'websocket';
import { logger } from '../app/logger';

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

        const inviterMessageProcess = (message: IMessage, connection: connection, resolve: (value?:any) => void, reject: (reason?:any) => void) => {
            if (message.type === 'utf8' && message.utf8Data) {
                const value = JSON.parse(message.utf8Data);
                switch (value['action']) {
                case 'PROPOSAL':
                    connection.send(JSON.stringify({
                        action: 'APPROVE_PROPOSAL',
                        data: isbn,
                    }));
                    break;
                case 'COMMITED':
                    resolve(message.utf8Data);
                    return;
                }
            }
        };

        const guestMessageProcess = (message: IMessage, connection: connection, resolve: (value?:any) => void, reject: (reason?:any) => void) => {
            if (message.type === 'utf8' && message.utf8Data) {
                const value = JSON.parse(message.utf8Data);

                switch (value['action']){
                case 'ENTRY_PERMITTED':
                    connection.sendUTF(JSON.stringify({
                        action: 'REQUEST_PROPOSAL',
                        data: isbn,
                    }));
                    break;
                case 'PROPOSAL':
                    connection.sendUTF(JSON.stringify({
                        action: 'APPROVE_PROPOSAL',
                    }));

                    break;

                case 'COMMITED':
                    resolve(message.utf8Data);
                    return;
                }

            }
        };

        try {
            const values  = await Promise.all<string, string>([inviterConnect(inviterMessageProcess),guestConnect(guestMessageProcess)]);

            const inviterValue = JSON.parse(values[0]);
            const guestValue = JSON.parse(values[1]);

            const validate = {
                action: 'COMMITED',
                data: {
                    isbn,
                    id: inviterValue.data.id,
                    owner: 'inviter@example.com',
                    borrower: 'guest@example.com',
                    lendAt: inviterValue.data.lendAt,
                },
            };
            chai.expect(inviterValue).to.deep.equal(validate, '招待者のコミットメッセージ');
            chai.expect(guestValue).to.deep.equal(validate, 'ゲストのコミットメッセージ');

        } catch (e) {
            logger.fatal(e);
            chai.assert.fail(e);
        }
    });

    function getUniqueStr(): UUID {
        const uuid = uuidv4();
        if (isUUID(uuid)) {
            return uuid;
        }
        throw new Error();
    }

    function inviterConnect(messageProcess: (message: IMessage, connection: connection, resolve: (value?:any) => void, reject: (reason?:any) => void) => void): Promise<string> {
        return new Promise((resolve, reject) => {
            const client = new Client();
            client.on('connectFailed', (error: Error) => {
                reject('Connect Error invite: ' + error.toString());
                reject(error);
            });
            client.on('connect', (connection: connection) => {

                connection.on('message', (message) => {
                    messageProcess(message, connection, resolve, reject);
                });
                connection.on('error', (error) => {
                    reject('Connection Error inviter: ' + error.toString());
                });
                connection.on('close', () => {
                    logger.info('echo-protocol Connection Closed');
                });

            });

            client.connect(`ws://${wsHost}:${wsPort}/rooms/connect?id=${uuid}&role=inviter&locator=${inviter}`, '');
        });
    }

    function guestConnect(messageProcess: (message: IMessage, connection: connection, resolve: (value?:any) => void, reject: (reason?:any) => void) => void): Promise<string> {
        return new Promise((resolve, reject) => {
            const client = new Client();
            client.on('connectFailed', (error: Error) => {
                reject('Connect Error guest: ' + error.toString());
            });
            client.on('connect', (connection: connection) => {

                connection.on('message', (message) => {
                    messageProcess(message, connection, resolve, reject);
                });

                connection.on('error', (error) => {
                    reject('Connection Error guest: ' + error.toString());
                });
                connection.on('close', () => {
                    logger.info('echo-protocol Connection Closed');
                });
                
            });
            client.connect(`ws://${wsHost}:${wsPort}/rooms/connect?id=${uuid}&locator=${guest}&role=guest&inviteToken=${tokenUUID}`);
        });
    }



});

