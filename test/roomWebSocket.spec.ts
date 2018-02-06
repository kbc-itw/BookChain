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
    const fqdn: string = 'example.com';
    const inviter: string = 'inviter@example.com';
    const guest: string = 'guest@example.com';
    const roomPurposeRental: string = 'rental';
    const isbn: string = '9784274068560';
    const date: Date =  new Date(2018,1,1,0,0,0,0);
    const wsConfig = config.get<IWebSocketConfig>('webSocket');
    const wsPort = wsConfig.port;
    const wsHost = wsConfig.host;

    function getSocketRoom(): SocketRoom {

        if (isFQDN(fqdn) && isLocator(inviter) && isRoomPurpose(roomPurposeRental) && isLocator(guest) && isISBN(isbn)) {

            return  {
                isbn,
                room: {
                    guest,
                    inviter,
                    id: uuid,
                    host: fqdn,
                    purpose: roomPurposeRental,
                    createdAt: date,
                    closedAt: undefined,
                },
                inviterApproved: false,
                guestApproved: false,
                inviteToken: tokenUUID,
                inviterSocket: undefined,
                guestSocket: undefined,
            };
        }

        throw new Error('SocketRoomがきちんと作成できない');
    }
    beforeEach((done) => {

        try {
            const socketRoom: SocketRoom = getSocketRoom();

            const roomMap = new Map<UUID, SocketRoom>();
            roomMap.set(uuid, socketRoom);
            app = express();
            app.use(bodyParser.urlencoded({
                extended: true,
            }));
            app.use(bodyParser.json());
            server = app.listen(port, host, () => {
                createWebSocketServer(server, '/rooms/connect', roomMap, async () => {}, async () => {
                    socketRoom.room.closedAt = date;
                })
                    .then((result) => {
                        wss = result;
                        done();
                    });
            });
        } catch (e) {
            chai.assert.fail(e);
        }


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

        const inviterConnectionProcess = (iConnectionProcess: IConnectProcess) => {};


        try {
            const values  = await Promise.all<string, string>([inviterConnect(inviterMessageProcess, inviterConnectionProcess),guestConnect(guestMessageProcess)]);

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

        const inviterConnectProcess = (iConnectProcess: IConnectProcess) => {
            iConnectProcess.connection.sendUTF(JSON.stringify({
                action: 'CANCEL_REQUEST',
            }));

            iConnectProcess.connection.on('close', () => {
                iConnectProcess.resolve('close');
            });
        };
        const inviterMessageProcess = (iMessageProcess: IMessageProcess) => {
            if (iMessageProcess.message.type === 'utf8') iMessageProcess.reject(new Error(iMessageProcess.message.utf8Data));
        };
        const guestMessageProcess = (iMessageProcess: IMessageProcess) => {
            if (iMessageProcess.message.type === 'utf8' && iMessageProcess.message.utf8Data) {
                const message: string = iMessageProcess.message.utf8Data;
                const value = JSON.parse(message);
                switch (value['action']) {
                case 'INVALID_ACTION':
                    iMessageProcess.resolve(message);
                    break;
                default:
                    iMessageProcess.reject(message);
                }
            }
        };

        try {

            const inviteString: string = await inviterConnect(inviterMessageProcess, inviterConnectProcess);
            const guestString: string = await guestConnect(guestMessageProcess);

            const guestValue = JSON.parse(guestString);
            const validate = {
                action:'INVALID_ACTION',
                data: {
                    youSend: {
                        id: uuid,
                    },
                    message: 'room is already closed',
                },
            };
            chai.expect(inviteString).to.eq('close', '招待者の戻り値チェック');
            chai.expect(guestValue).to.deep.equal(validate, 'ゲストの戻り値チェック');
        }catch (e) {
            logger.fatal(e);
            chai.assert.fail(e);
        }

    });

    it('取引内容設定待ちキャンセル', async () => {
        const guestMessageProcess = (iMessageProcess :IMessageProcess) => {
            if (iMessageProcess.message.type === 'utf8' && iMessageProcess.message.utf8Data) {
                const message: string = iMessageProcess.message.utf8Data;
                const value = JSON.parse(message);
                switch (value['action']) {
                case 'TRANSACTION_CANCELED':
                    iMessageProcess.resolve(message);
                    return;
                case 'USER_JOINED':
                case 'ENTRY_PERMITTED':
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

        const inviterConnectionProcess = (iConnectionProcess: IConnectProcess) => {};

        try {
            const value: [string] = await Promise.all([inviterConnect(inviterMessageProcess,inviterConnectionProcess),guestConnect(guestMessageProcess)]);

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

    it('双方へ取引内容の確認時にキャンセル', async () => {

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
                case 'TRANSACTION_CANCELED':
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
                        action: 'CANCEL_REQUEST',
                    }));
                    iMessageProcess.resolve(message);
                    break;
                default:
                    iMessageProcess.reject(message);
                }

            }
        };

        const inviterConnectionProcess = (iConnectionProcess: IConnectProcess) => {};

        try {
            const values  = await Promise.all<string, string>([inviterConnect(inviterMessageProcess, inviterConnectionProcess),guestConnect(guestMessageProcess)]);

            const inviterValue = JSON.parse(values[0]);
            const guestValue = JSON.parse(values[1]);

            const inviteValidate = {
                action: 'TRANSACTION_CANCELED',
                data: 'guest canceled transaction',
            };

            const guestValidate = {
                action: 'PROPOSAL',
                data: {
                    isbn,
                    owner: inviter,
                    borrower: guest,
                },
            };
            chai.expect(inviterValue).to.deep.equal(inviteValidate, '招待者のコミットメッセージ');
            chai.expect(guestValue).to.deep.equal(guestValidate, 'ゲストのコミットメッセージ');

        } catch (e) {
            logger.fatal(e);
            chai.assert.fail(e);
        }

    });

    it('双方から取引内容検証失敗', async () => {});

    function getUniqueStr(): UUID {
        const uuid = uuidv4();
        if (isUUID(uuid)) {
            return uuid;
        }
        throw new Error();
    }

    function inviterConnect(
        messageProcess: (iMessageProcess: IMessageProcess) => void,
        connectProcess: (iConnectProcess: IConnectProcess) => void,
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const client = new Client();
            client.on('connectFailed', (error: Error) => {
                reject('Connect Error invite: ' + error.toString());
                reject(error);
            });
            client.on('connect', (connection: connection) => {
                const iConnectionProcess: IConnectProcess = {
                    connection,
                    resolve,
                    reject,
                };
                connectProcess(iConnectionProcess);

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

interface IConnectProcess {
    connection: connection;
    resolve: (value?:any) => void;
    reject: (reason?:any) => void;
}
