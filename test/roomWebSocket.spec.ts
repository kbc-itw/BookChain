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
import { createWebSocketServer, SocketRoom , validate } from '../app/roomWebSocket';
import { connection, client as Client, IMessage } from 'websocket';
import { logger } from '../app/logger';
import { ErrorMessages } from '../app/messages';

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
    let createTradingFail: boolean = false;

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
                createWebSocketServer(server, '/rooms/connect', roomMap, async () => {}, async (query) => {
                    socketRoom.room.closedAt = date;
                    switch (query.fcn) {
                        case 'createTrading':
                            if (createTradingFail) throw new Error('commitがエラー');
                        default:

                    }
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

        const inviterConnectProcess = (iConnectProcess: IConnectProcess) => {
            iConnectProcess.connection.on('message', (message) => {
                if (message.type === 'utf8' && message.utf8Data) {
                    const value = JSON.parse(message.utf8Data);
                    switch (value['action']) {
                    case 'PROPOSAL':
                        iConnectProcess.connection.sendUTF(JSON.stringify({
                            action: 'APPROVE_PROPOSAL',
                            data: isbn,
                        }));
                        break;
                    case 'COMMITED':
                        iConnectProcess.resolve(message.utf8Data);
                        return;
                    case 'USER_JOINED':
                        break;
                    default:
                        iConnectProcess.reject(message.utf8Data);
                        return;
                    }
                }
            });
        };

        const guestConnectProcess = (iConnectProcess: IConnectProcess) => {
            iConnectProcess.connection.on('message', (message) => {
                if (message.type === 'utf8' && message.utf8Data) {
                    const value = JSON.parse(message.utf8Data);

                    switch (value['action']){
                    case 'ENTRY_PERMITTED':
                        iConnectProcess.connection.sendUTF(JSON.stringify({
                            action: 'REQUEST_PROPOSAL',
                            data: isbn,
                        }));
                        break;
                    case 'PROPOSAL':
                        iConnectProcess.connection.sendUTF(JSON.stringify({
                            action: 'APPROVE_PROPOSAL',
                        }));

                        break;

                    case 'COMMITED':
                        iConnectProcess.resolve(message.utf8Data);
                        return;
                    }

                }
            });
        };

        try {
            const values  = await Promise.all<string, string>([inviterConnect(inviterConnectProcess),guestConnect(guestConnectProcess)]);

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

    it('不正パラメタ', async () => {

        function validateCheck(id: any, locator: any, role: any, inviteToken: any): Map<string, string> {
            return validate({ id, locator, role, inviteToken });
        }

        const allOk = validateCheck(uuid, inviter, 'inviter', uuid);

        const allFail = validateCheck('fail', 'fail', 'fail', 'fail');
        const validateAllFail = new Map([
            ['id', ErrorMessages.MESSAGE_UUID_INVALID],
            ['locator', ErrorMessages.MESSAGE_LOCATOR_INVALID],
            ['role', ErrorMessages.MESSAGE_ROLE_INVALID],
            ['inviteToken', ErrorMessages.MESSAGE_UUID_INVALID],
        ]);

        const allUndefined = validateCheck(undefined, undefined, undefined, undefined);
        const validateAllUndefined = new Map([
            ['id', ErrorMessages.MESSAGE_UUID_INVALID],
            ['locator', ErrorMessages.MESSAGE_LOCATOR_REQUIRED],
            ['role', ErrorMessages.MESSAGE_ROLE_REQUIRED],
        ]);

        const inviteToken = validateCheck(uuid, guest, 'guest', undefined);
        const validateInviterToken = new Map([['inviteToken', ErrorMessages.MESSAGE_INVITETOKEN_REQUIRED]]);


        try {

            chai.expect(allFail).to.deep.equal(validateAllFail, 'すべて不正パラメタ');
            chai.expect(allOk).to.deep.equal(new Map(), '正しいパラメータ');
            chai.expect(allUndefined).to.deep.equal(validateAllUndefined, 'すべてUndefined');
            chai.expect(inviteToken).to.deep.equal(validateInviterToken, 'ゲストでトークンIDを持っていない');

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

            iConnectProcess.connection.on('message', (message) => {
                if (message.type === 'utf8') iConnectProcess.reject(new Error(message.utf8Data));
            });

            iConnectProcess.connection.on('close', () => {
                iConnectProcess.resolve('close');
            });
        };

        const guestConnectProcess = (iConnectProcess: IConnectProcess) => {
            iConnectProcess.connection.on('message', (message) => {
                if (message.type === 'utf8' && message.utf8Data) {
                    const value = JSON.parse(message.utf8Data);
                    switch (value['action']) {
                    case 'INVALID_ACTION':
                        iConnectProcess.resolve(message.utf8Data);
                        break;
                    default:
                        iConnectProcess.reject(message.utf8Data);
                    }
                }
            });
        };

        try {

            const inviteString: string = await inviterConnect(inviterConnectProcess);
            const guestString: string = await guestConnect(guestConnectProcess);

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

        const guestConnectProcess = (iConnectProcess :IConnectProcess) => {
            iConnectProcess.connection.on('message', (message) => {
                if (message.type === 'utf8' && message.utf8Data) {
                    const value = JSON.parse(message.utf8Data);
                    switch (value['action']) {
                    case 'TRANSACTION_CANCELED':
                        iConnectProcess.resolve(message.utf8Data);
                        return;
                    case 'USER_JOINED':
                    case 'ENTRY_PERMITTED':
                        break;
                    default:
                        iConnectProcess.reject(message.utf8Data);
                        return;
                    }
                }
            });
        };

        const inviterConnectProcess = (iConnectProcess: IConnectProcess) => {
            iConnectProcess.connection.on('message', (message) => {
                if (message.type === 'utf8' && message.utf8Data) {
                    const value = JSON.parse(message.utf8Data);
                    switch (value['action']) {
                    case 'USER_JOINED':
                        iConnectProcess.connection.sendUTF(JSON.stringify({ action: 'CANCEL_REQUEST' }));
                        iConnectProcess.resolve(message.utf8Data);
                    }
                }
            });

        };

        try {
            const value: [string] = await Promise.all([inviterConnect(inviterConnectProcess),guestConnect(guestConnectProcess)]);

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

        const inviterConnectProcess = (iConnectProcess: IConnectProcess) => {
            iConnectProcess.connection.on('message', (message) => {
                if (message.type === 'utf8' && message.utf8Data) {
                    const value = JSON.parse(message.utf8Data);
                    switch (value['action']) {
                    case 'PROPOSAL':
                        iConnectProcess.connection.sendUTF(JSON.stringify({
                            action: 'APPROVE_PROPOSAL',
                            data: isbn,
                        }));
                        break;
                    case 'TRANSACTION_CANCELED':
                        iConnectProcess.resolve(message.utf8Data);
                        return;
                    case 'USER_JOINED':
                        break;
                    default:
                        iConnectProcess.reject(message.utf8Data);
                        return;
                    }
                }
            });
        };

        const guestConnectProcess = (iConnectProcess: IConnectProcess) => {
            iConnectProcess.connection.on('message', (message) => {
                if (message.type === 'utf8' && message.utf8Data) {
                    const value = JSON.parse(message.utf8Data);

                    switch (value['action']){
                    case 'ENTRY_PERMITTED':
                        iConnectProcess.connection.sendUTF(JSON.stringify({
                            action: 'REQUEST_PROPOSAL',
                            data: isbn,
                        }));
                        break;
                    case 'PROPOSAL':
                        iConnectProcess.connection.sendUTF(JSON.stringify({
                            action: 'CANCEL_REQUEST',
                        }));
                        iConnectProcess.resolve(message.utf8Data);
                        break;
                    default:
                        iConnectProcess.reject(message.utf8Data);
                    }

                }
            });

        };

        try {
            const values  = await Promise.all<string, string>([inviterConnect(inviterConnectProcess),guestConnect(guestConnectProcess)]);

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

    it('取引内容確定失敗', async () => {

        createTradingFail = true;
        let inviteFail: boolean = false;
        let guestFail: boolean = false;

        const inviterConnectProcess = (iConnectProcess: IConnectProcess) => {
            iConnectProcess.connection.on('message', (message) => {
                if (message.type === 'utf8' && message.utf8Data) {
                    const value = JSON.parse(message.utf8Data);
                    switch (value['action']) {
                    case 'PROPOSAL':
                        iConnectProcess.connection.sendUTF(JSON.stringify({
                            action: 'APPROVE_PROPOSAL',
                            data: isbn,
                        }));
                        inviteFail = true;
                        break;
                    case 'USER_JOINED':
                        break;
                    case 'TRANSACTION_CANCELED':
                        iConnectProcess.resolve(message.utf8Data);
                        return;
                    default:
                        iConnectProcess.reject('inviter' + message.utf8Data);
                        return;
                    }
                }
            });

            
            iConnectProcess.connection.on('close', () => {
                iConnectProcess.resolve(true);
            });

        };

        const guestConnectProcess = (iConnectProcess: IConnectProcess) => {

            iConnectProcess.connection.on('message', (message) => {
                if (message.type === 'utf8' && message.utf8Data) {
                    const value = JSON.parse(message.utf8Data);

                    switch (value['action']){
                    case 'ENTRY_PERMITTED':
                        iConnectProcess.connection.sendUTF(JSON.stringify({
                            action: 'REQUEST_PROPOSAL',
                            data: isbn,
                        }));
                        break;
                    case 'PROPOSAL':
                        iConnectProcess.connection.sendUTF(JSON.stringify({
                            action: 'APPROVE_PROPOSAL',
                            data: isbn,
                        }));
                        guestFail = true;
                        break;
                    default:
                        iConnectProcess.reject('guest' + message.utf8Data);
                    }

                }
            });

            iConnectProcess.connection.on('close', () => {
                iConnectProcess.resolve(`${guestFail}`);
            });

        };

        try {
            const values  = await Promise.all<string, string>([inviterConnect(inviterConnectProcess),guestConnect(guestConnectProcess)]);

            const inviterValue = JSON.parse(values[0]);
            const guestValue = JSON.parse(values[1]);

            chai.expect(inviterValue).to.deep.equal(true, '招待者の結果');
            chai.expect(guestValue).to.deep.equal(true, 'ゲストの結果');

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

    function inviterConnect(
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

    function guestConnect(connectProcess: (iConnectProcess: IConnectProcess) => void): Promise<string> {
        return new Promise((resolve, reject) => {
            const client = new Client();
            client.on('connectFailed', (error: Error) => {
                reject('Connect Error guest: ' + error.toString());
            });
            client.on('connect', (connection: connection) => {
                const iConnectProcess:IConnectProcess = {
                    connection,
                    resolve,
                    reject,
                };
                connectProcess(iConnectProcess);
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

interface IConnectProcess {
    connection: connection;
    resolve: (value?:any) => void;
    reject: (reason?:any) => void;
}
