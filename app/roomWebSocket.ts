import { IWebSocketConfig } from './config/IWSConfig';
import { Router, Application } from 'express';

import ws = require('ws');
import { Server, IncomingMessage } from 'http';
import * as url from 'url';
import { logger } from './logger';
import { isUUID, isRoleString, isLocator, isISBN, isRoomPurpose, UUID, FQDN, RoomPurpose, Locator, RoleString } from './util';
import { ErrorMessages } from './messages';
import { ISBN } from 'isbn-utils';
import * as config from 'config';
import { IServerConfig } from './config/IServerConfig';

const uuidv4 = require('uuid/v4');

export function createWebSocketServer(
    server: Server,
    path: string,
    roomPool: Map<UUID, SocketRoom>,
    queryFunction: (request: ChaincodeQueryRequest) => Promise<any>,
    invokeFunction: (request: ChaincodeInvokeRequest) => Promise<void>,
): Promise<ws.Server> {
    return new Promise<ws.Server>((resolve, reject) => {
        const { port, host } = config.get<IWebSocketConfig>('webSocket');
        const wss = new ws.Server({ server, path, port, host }, () => {
            wss.on('connection', async (socket: ws, req: IncomingMessage) => {
                if (!req.url) {
                    // req.urlはundefinedの可能性がある
                    // パラメタ必須なので、なければソケットを閉じる
                    logger.info('不正なWebSocket接続 req.urlがundefined');
                    await socket.send({ action: 'INVALID_ACTION', data: { youSend: { action: 'connction' }, message: 'req.url is undefined' } });
                    socket.close();
                    return;
                }
            
                const parsedURL = url.parse(req.url);
                const { roomID, locator, role, inviteToken } = parsedURL.query;
                
                const invalidField = validate({ roomID, locator, role, inviteToken });

            
                if (invalidField.size > 0) {
                    logger.info(`webSocket接続時の不正なパラメタ id:${roomID} role:${role} locator:${locator} inviteToken:${inviteToken}`);
                    await socket.send({
                        action: 'INVALID_ACTION',
                        data: {
                            youSend: {
                                roomID,
                                role,
                                locator,
                                inviteToken,
                                action: 'connection',
                            },
                            message: 'invalid parameters',
                        },
                    });
                    socket.close();
                    return;
                }
            
                const room = roomPool.get(roomID);
            
                if (typeof room === 'undefined') {
                    logger.info(`未プールの部屋 ${roomID}`);
                    await socket.send({
                        action: 'INVALID_ACTION',
                        data: {
                            youSend: {
                                roomID,
                            },
                            message: 'room does not exist',
                        },
                    });
                    socket.close();
                    return;
                }
            

                if (role === 'inviter') {

                    room.inviterSocket = socket;

                    socket.on('message', async (data: string) => {
                        const params = JSON.parse(data);
                        switch (params.action) {
                        case 'APPROVE_PROPOSAL':
                            room.inviterApproved = true;
                            if (room.guestApproved) {
                                await commitment(room, queryFunction, invokeFunction);
                            }
                            break;
                        case 'CANCEL_REQUEST':
                            if (room.guestSocket) {
                                await room.guestSocket.send({
                                    action: 'TRANSACTION_CANCELED',
                                    data: 'guest canceled transaction',
                                });
                            }
                            closeRoom(room, invokeFunction);
                            break;
                        }
                    });

                } else {
                    if (room.inviteToken !== inviteToken) {
                        logger.info(`inviteToken不一致 ${inviteToken}`);
                        await socket.send({
                            action: 'INVALID_ACTION',
                            data: {
                                youSend: {
                                    inviteToken,
                                },
                                message: 'inviteToken does not match',
                            },
                        });
                        if (room.inviterSocket) {
                            await room.inviterSocket.send({
                                action: 'GUEST_DISCONNECTED',
                            });
                        }
                        await closeRoom(room, invokeFunction);
                        return;
                    }

                    if (typeof room.inviterSocket === 'undefined') {
                        logger.info(`inviterSocket存在せず roomID:${room.room.id}`);
                        await socket.send({
                            action: 'INVALID_ACTION',
                            data: {
                                message: 'invalid room',
                            },
                        });
                        await closeRoom(room, invokeFunction);
                        return;
                    }

                    room.guestSocket = socket;
                    room.room.guest = locator;

                    await socket.send({
                        action: 'ENTRY_PERMITTED',
                        data: {
                            ...room.room,
                        },
                    });

                    await room.inviterSocket.send({
                        action: 'USER_JOINED',
                        data: locator,
                    });

                    try {
                        await invokeFunction({
                            ...invokeBase,
                            fcn: 'guestJoinedRoom',
                            args:[roomID, locator],
                        });
                    } catch (e) {
                        logger.log(e);
                        closeRoom(room, invokeFunction);
                        return;
                    }

                    socket.on('message', async (data: string) => {
                        const params = JSON.parse(data);
                        switch (params.action) {
                        case 'REQUEST_PROPOSAL':
                            if (!params.data) {
                                await socket.send({
                                    action: 'INVALID_ACTION',
                                    data: {
                                        youSend: {
                                            data: params.data, 
                                        },
                                        message: 'data is required',
                                    },
                                });
                                await closeRoom(room, invokeFunction);
                                break;
                            } else if (params.data && !isISBN(params.data)) {
                                await socket.send({
                                    action: 'INVALID_ACTION',
                                    data: {
                                        youSend: {
                                            data: params.data,
                                        },
                                        message: 'data must be ISBN',
                                    },
                                });
                                await closeRoom(room, invokeFunction);
                                break;
                            }
                            room.isbn = params.data;
                            const proposal = {
                                action: 'PROPOSAL',
                                data: {
                                    owner: room.room.inviter,
                                    borrower: room.room.guest,
                                    isbn: room.isbn,
                                },
                            };

                            if (room.inviterSocket) {
                                await room.inviterSocket.send(proposal);
                            }
                            await socket.send(proposal);
                            break;
                        case 'APPROVE_PROPOSAL':
                            room.guestApproved = true;
                            if (room.inviterApproved) {
                                await commitment(room, queryFunction, invokeFunction);
                            }
                            break;
                        case 'CANCEL_REQUEST':
                            if (room.inviterSocket) {
                                await room.inviterSocket.send({
                                    action: 'TRANSACTION_CANCELED',
                                    data: 'guest canceled transaction',
                                });
                            }
                            closeRoom(room, invokeFunction);
                            break;
                        }
                    });
            
                }
            });
            resolve(wss);
        });
    });
}


async function commitment(room: SocketRoom, queryFunction: (request: ChaincodeQueryRequest) => Promise<any>, invokeFunction: (request: ChaincodeInvokeRequest) => Promise<void>,
): Promise<void> {
    let trading: any;
    try {
        if (room.room.purpose === 'rental') {
            trading = {
                id: uuidv4(),
                owner: room.room.inviter,
                borrower: room.room.guest,
                isbn: room.isbn,
                lendAt: new Date().toISOString(),
            };
            await invokeFunction({
                ...invokeRentalBase,
                fcn: 'createTrading',
                args:[trading.id, trading.owner, trading.borrower, trading.isbn, trading.lendAt],
            });
        } else {
            if (room.room.inviter && room.room.guest) {
                const result = await queryFunction({
                    ...invokeRentalBase,
                    fcn:'getTradingList',
                    args:[room.room.inviter, room.room.guest, room.isbn, 'false'],
                });
                trading = result[0];
                trading.returnedAt = new Date().toISOString();
                await invokeFunction({
                    ...invokeRentalBase,
                    fcn: 'markTradingReturned',
                    args:[trading.id, trading.returnedAt],
                });
            }
        }
    } catch (e) {
        logger.error(e);
        closeRoom(room, invokeFunction);
        return;
    }
    const commitment = {
        action: 'COMMITED',
        data: {
            id: trading.id,
            owner: trading.owner,
            borrower: trading.borrower,
            isbn: trading.isbn,
            lendAt: trading.lendAt,
            returnedAt: trading.returnedAt,
        },
    };
    if (room.inviterSocket) {
        await room.inviterSocket.send(commitment);
    }
    if (room.guestSocket) {
        await room.guestSocket.send(commitment);
    }
    closeRoom(room, invokeFunction);
}

async function closeRoom(room: SocketRoom, invokeFunction: (request: ChaincodeInvokeRequest) => Promise<void>): Promise<void> {
    try {
        await invokeFunction({
            ...invokeBase,
            fcn: 'createRoom',
            args: [room.room.id, new Date().toISOString()],
        });
    } catch (e) {
        logger.error(e);
    } finally {
        if (room.inviterSocket) {
            room.inviterSocket.close();
        }
        if (room.guestSocket) {
            room.guestSocket.close();
        }
    }
}

function validate(validateObject: ValidateObject):Map<string, string> {
    const errorMessages = new Map<string, string>();

    if (validateObject.roomID && !isUUID(validateObject.roomID)) {
        errorMessages.set('roomID', ErrorMessages.MESSAGE_UUID_INVALID);
    } else if (!validateObject.roomID) {
        errorMessages.set('roomID', ErrorMessages.MESSAGE_UUID_INVALID);
    }

    if (validateObject.locator && isLocator(validateObject.locator)) {
        errorMessages.set('locator', ErrorMessages.MESSAGE_LOCATOR_INVALID);
    } else if (!validateObject.locator) {
        errorMessages.set('locator', ErrorMessages.MESSAGE_LOCATOR_REQUIRED);
    }

    if (validateObject.role && isRoleString(validateObject.role)) {
        errorMessages.set('role', ErrorMessages.MESSAGE_ROLE_INVALID);
    } else if (!validateObject.role) {
        errorMessages.set('role', ErrorMessages.MESSAGE_ROLE_REQUIRED);
    }

    if (validateObject.inviteToken && isUUID(validateObject.inviteToken)) {
        errorMessages.set('inviteToken', ErrorMessages.MESSAGE_UUID_INVALID);
    } else if (validateObject.role === 'guest' && !validateObject.inviteToken) {
        errorMessages.set('inviteToken', ErrorMessages.MESSAGE_INVITETOKEN_REQUIRED);
    }
    return errorMessages;
}


interface ValidateObject {
    readonly roomID: UUID;
    readonly locator: Locator;
    readonly role: RoleString;
    readonly inviteToken: UUID;
}

async function commitRental(room: SocketRoom, isbn: string, invokeFunction: (request: ChaincodeInvokeRequest) => Promise<void>): Promise<void> {
    try {
        await invokeFunction({
            ...invokeRentalBase,
            fcn: 'createTrading',
            args:[uuidv4(), room.room.inviter, room.room.guest, isbn, new Date().toISOString()],
        });
    } catch (e) {
        logger.error(e);
        throw e;
    }
}

const invokeBase = {
    chaincodeId: 'room',
    txId: {
        getTransactionID(): string {throw new Error('呼ばれないはずだ'); },
    },
};

const invokeRentalBase = {
    chaincodeId: 'trading',
    txId: {
        getTransactionID(): string {throw new Error('呼ばれないはずだ'); },
    },
};

export interface SocketRoom {
    room: {
        readonly id: UUID;
        readonly host: FQDN;
        readonly purpose: RoomPurpose;
        readonly inviter: Locator;
        guest: Locator | undefined;
        readonly createdAt: Date;
        closedAt: Date | undefined;
    };
    isbn: string;
    inviterApproved: boolean;
    guestApproved: boolean;
    inviteToken: UUID;
    inviterSocket : ws | undefined;
    guestSocket: ws | undefined;
}
