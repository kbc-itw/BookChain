import 'mocha';
import { expect } from 'chai';
import * as express from 'express';
import * as config from 'config';
import { IServerConfig } from '../app/config/IServerConfig';
import { createTradingsRouter } from '../app/router/tradings';
import{ configureUse } from '../app/bootstrap';
import { Server } from 'http';
import { createWebSocketServer, SocketRoom } from './../app/roomWebSocket';
import { isFQDN, isUUID, isRoleString, isLocator, isISBN, isRoomPurpose, UUID, FQDN, RoomPurpose, Locator, RoleString } from '../app/util';
import { stringify } from 'querystring';
import { String } from 'shelljs';
const uuidv4 = require('uuid/v4');


describe('rental', () => {

    // const { port, host } = serverConfig;
    const uuid: UUID = getUniqueStr();
    const tokenUUID: UUID = getUniqueStr();
    const fqdn = 'example.com';
    const inviter = 'inviter@example.com';
    const guest = 'guest@example.com';
    const roomPurposeRental = 'rental';
    const isbn = '9784274068560';
    let socketRoom: SocketRoom;
    // socketRoomのデフォルトを設定
    if (isFQDN(fqdn) && isLocator(inviter) && isRoomPurpose(roomPurposeRental) && isLocator(guest) && isISBN(isbn) ){
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

    beforeEach(async () => {
    });

    afterEach(async () => {
    });


});

function getUniqueStr(): UUID {
    const uuid = uuidv4();
    if (isUUID(uuid)) {
        return uuid;
    }
    throw new Error();

}
