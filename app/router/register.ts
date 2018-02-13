import { Router } from 'express';
import { Request, Response } from 'express-serve-static-core';
import { isLocalID, isFQDN, isDisplayName } from '../util';
import { logger } from '../logger';
import { ErrorMessages } from '../messages';
import { isAuthenticated } from '../authenticator';
import { AuthDb, IUserAuth, Strategy } from '../auth-db';
import { MaybeDocument } from 'nano';

export function createRegisterRouter(
    registerLocalInfo:(auth: IUserAuth & MaybeDocument) => Promise<string>,
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
            res.status(200).send();
        } catch (e) {
            logger.info('登録失敗');
            logger.error(`${e.tostring()}`);
            res.status(400).send(e.toString());
        }

    });

    logger.trace('createRegisterRouter');
    return registerRouter;
}
