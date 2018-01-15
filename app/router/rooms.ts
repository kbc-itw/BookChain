import { Router, Response, Request } from 'express';
import { isLocator, isISBN, isRoomPurpose } from '../util';
import { logger } from '../logger';
import { ErrorMessages } from '../messages';
import { IServerConfig } from '../config/IServerConfig';
import * as config from 'config';
import { isAuthenticated } from '../authenticator';

const uuidv4 = require('uuid/v4');

export function createRoomsRouter(
    queryFunction: (request: ChaincodeQueryRequest) => Promise<any>, invokeFunction: (request: ChaincodeInvokeRequest) => Promise<any>,
): Router {
    const router = Router();

    router.post('/', isAuthenticated, async(req: Request, res: Response) => {
        const { purpose, inviter } = req.body;
        const serverConfig = config.get<IServerConfig>('server');
        let invalidFlag = false;
        const invalidRequestMessage = {
            purpose: '',
            inviter:  '',
        };

        // 不正ないし存在しなければ400
        if (inviter && !isLocator(inviter)) {
            invalidRequestMessage.inviter = ErrorMessages.MESSAGE_INVITER_INVALID;
            invalidFlag = true;
        } else if (!inviter) {
            invalidRequestMessage.inviter = ErrorMessages.MESSAGE_INVITER_REQUIRED;
            invalidFlag = true;
        }

        if (purpose && !isRoomPurpose(purpose)) {
            invalidRequestMessage.purpose = ErrorMessages.MESSAGE_ROOM_PURPOSE_INVALID;
            invalidFlag = true;
        } else if (!purpose) {
            invalidRequestMessage.purpose = ErrorMessages.MESSAGE_ROOM_PURPOSE_REQUIRED;
            invalidFlag = true;
        }

        if (invalidFlag) {
            logger.info(`/roomsへの不正なpost inviter:${inviter} purpose:${purpose}`);
            res.status(400).json(invalidRequestMessage);
            return;
        }

        try {
            const result = await invokeFunction({
                ...invokeBase,
                fcn: 'createRoom',
                args: [uuidv4(), purpose, inviter, serverConfig.host, new Date().toISOString()],

            });
            res.status(201).json(result);
        } catch (e) {
            logger.error(`chaincodeエラー ${e}`);
            res.status(500).json({ error: true });
        }

    });

    logger.trace('createRoomRouter完了');
    return router;
}

const invokeBase = {
    chaincodeId: 'room',
    txId: {
        getTransactionID(): string {throw new Error('呼ばれないはずだ'); return 'hoge'; },
    },
};
