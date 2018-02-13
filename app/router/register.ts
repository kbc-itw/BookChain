import { Router } from 'express';
import { Request, Response } from 'express-serve-static-core';
import { isLocalID, isFQDN, isDisplayName } from '../util';
import { logger } from '../logger';
import { ErrorMessages } from '../messages';
import { isAuthenticated } from '../authenticator';
import { AuthDb, IUserAuth, Strategy } from '../auth-db';
import { MaybeDocument } from 'nano';
import * as config from 'config';
import { IServerConfig } from '../config/IServerConfig';

const host = config.get<IServerConfig>('server').host;

export function createRegisterRouter(
    invokeFunction: (request: ChaincodeInvokeRequest) => Promise<void>,
    registerLocalInfo(auth: IUserAuth & MaybeDocument) => Promise<string>,
): Router {
    const registerRouter = Router();
    registerRouter.post('/', isAuthenticated, async (req: Request, res: Response) => {
        const { localId, displayName } = req.body;
        let invalidFlag = false;
        const invalidRequestMessage = {
            localId: '',
            displayName: '',
        };

        if (!localId) {
            invalidRequestMessage.localId = ErrorMessages.MESSAGE_LOCAL_ID_REQUIRED;
            invalidFlag = true;
        }

        if (localId && !isLocalID(localId)) {
            invalidRequestMessage.localId = ErrorMessages.MESSAGE_LOCAL_ID_INVALID;
            invalidFlag = true;
        }

        if (!displayName) {
            invalidRequestMessage.displayName = ErrorMessages.MESSAGE_DISPLAY_NAME_REQUIRED;
            invalidFlag = true;
        }

        if (displayName && !isDisplayName(displayName)) {
            invalidRequestMessage.displayName = ErrorMessages.MESSAGE_DISPLAY_NAME_INVALID;
            invalidFlag = true;
        }

        if (invalidFlag) {
            logger.info(`/registerへの不正なリクエスト localid:${localId} displayName:${displayName}`);
            res.status(400).json(invalidRequestMessage);
            return;
        }

        try {
            req.user.localId = localId;
            req.user.displayName = displayName;
            await registerLocalInfo(req.user);
            await invokeFunction({
                ...queryBase,
                fcn: 'createUser',
                args:[localId, host, displayName],
            });
            res.status(200).send();
        } catch (e) {
            logger.info('登録失敗');
            res.status(400).send(e.toString());
        }

    });

    logger.trace('createRegisterRouter');
    return registerRouter;
}

const queryBase = {
    chaincodeId:'user',
    // TODO transactionIDは不要であるはずだ
    txId: {
        getTransactionID(): string {throw new Error('呼ばれないはずだ'); },
    },
};
