import { Router } from 'express';
import { Request, Response } from 'express-serve-static-core';
import { isLocalID, isFQDN, isDisplayName } from '../util';
import { logger } from '../logger';
import { ErrorMessages } from '../messages';
import { isAuthenticated } from '../authenticator';
import { AuthDb, IUserAuth, Strategy } from '../auth-db';

export function createRegisterRouter(

): Router {
    const userRouter = Router();
    userRouter.post('/', isAuthenticated, async (req: Request, res: Response) => {
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
            const result = await AuthDb.registerLocalInfo(Strategy.FACEBOOK, req.user);
            res.status(200).send();
        } catch (e) {
            res.status(400).send('something happend');
        }

    });

    logger.trace('createRegisterRouter');
    return userRouter;
}
