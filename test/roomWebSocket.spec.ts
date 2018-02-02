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

        const inviterMessageProcess = (iMessageProcess: IMessageProcess) => {
            if (iMessageProcess.message.type === 'utf8' && iMessageProcess.message.utf8Data) {
                const message = iMessageProcess.message.utf8Data;
                const value = JSON.parse(message);
                switch (value['action']) {
                case 'PROPOSAL':
                    iMessageProcess.connection.sendUTF(JSON.stringify({
                        action: 'APPROVE_PROPOSAL',
                        data: isbn,
                    }));
                    break;
                case 'COMMITED':
                    iMessageProcess.resolve(message);
                    return;
                case 'USER_JOINED':
                    break;
                default:
                    iMessageProcess.reject(message);
                    return;
                }
            }
        };

        const guestMessageProcess = (iMessageProcess: IMessageProcess) => {
            if (iMessageProcess.message.type === 'utf8' && iMessageProcess.message.utf8Data) {
                const message = iMessageProcess.message.utf8Data;
                const value = JSON.parse(message);

                switch (value['action']){
                case 'ENTRY_PERMITTED':
                    iMessageProcess.connection.sendUTF(JSON.stringify({
                        action: 'REQUEST_PROPOSAL',
                        data: isbn,
                    }));
                    break;
                case 'PROPOSAL':
                    iMessageProcess.connection.sendUTF(JSON.stringify({
                        action: 'APPROVE_PROPOSAL',
                    }));

                    break;

                case 'COMMITED':
                    iMessageProcess.resolve(message);
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

    it('招待者が取引相手接続待ちキャンセル', async () => {
        const guestMessageProcess = (iMessageProcess :IMessageProcess) => {
            if (iMessageProcess.message.type === 'utf8' && iMessageProcess.message.utf8Data) {
                const message: string = iMessageProcess.message.utf8Data;
                const value = JSON.parse(message);
                switch (value['action']) {
                case 'TRANSACTION_CANCELED':
                    iMessageProcess.resolve(message);
                    return;
                case 'USER_JOINED' && 'ENTRY_PERMITTED':
                    break;
                default:
                    iMessageProcess.reject(message);
                    return;
                }
            }
        };

        const inviterMessageProcess = (iMessageProcess: IMessageProcess) => {
            if (iMessageProcess.message.type === 'utf8' && iMessageProcess.message.utf8Data) {
                const value = JSON.parse(iMessageProcess.message.utf8Data);
                switch (value['action']) {
                case 'USER_JOINED':
                    iMessageProcess.connection.sendUTF(JSON.stringify({ action: 'CANCEL_REQUEST' }));
                    iMessageProcess.resolve(iMessageProcess.message.utf8Data);
                }
            }
        };

        try {
            const value: [string] = await Promise.all([inviterConnect(inviterMessageProcess),guestConnect(guestMessageProcess)]);

            // const inviter: Map<string, string> = JSON.parse(value[0]);
            const guest: Map<string, string> = JSON.parse(value[1]);

            const validate = {
                action: 'TRANSACTION_CANCELED',
                data: 'inviter canceled transaction',
            };

            chai.expect(guest).to.deep.equal(validate);
        }catch (e) {
            logger.fatal(e);
            chai.assert.fail(e);
        }


    });
    it('取引内容設定待ちキャンセル', async () => {});
    it('双方へ取引内容の確認', async () => {});
    it('双方から取引内容確認待ち', async () => {});

    function getUniqueStr(): UUID {
        const uuid = uuidv4();
        if (isUUID(uuid)) {
            return uuid;
        }
        throw new Error();
    }

    function inviterConnect(
        messageProcess: (iMessageProcess: IMessageProcess) => void): Promise<string> {
        return new Promise((resolve, reject) => {
            const client = new Client();
            client.on('connectFailed', (error: Error) => {
                reject('Connect Error invite: ' + error.toString());
                reject(error);
            });
            client.on('connect', (connection: connection) => {
                connection.on('message', (message) => {
                    const iMessageProcess: IMessageProcess  = {
                        message,
                        connection,
                        resolve,
                        reject,
                    };
                    messageProcess(iMessageProcess);
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

    function guestConnect(messageProcess: (iMessageProcess: IMessageProcess) => void): Promise<string> {
        return new Promise((resolve, reject) => {
            const client = new Client();
            client.on('connectFailed', (error: Error) => {
                reject('Connect Error guest: ' + error.toString());
            });
            client.on('connect', (connection: connection) => {

                connection.on('message', (message) => {
                    const iMessageProcess: IMessageProcess = {
                        message,
                        connection,
                        resolve,
                        reject,
                    };
                    messageProcess(iMessageProcess);
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

interface IMessageProcess {
    message: IMessage;
    connection: connection;
    resolve: (value?:any) => void;
    reject: (reason?:any) => void;
}
