import { MESSAGE_HOST_INVALID, MESSAGE_HOST_REQUIRED, MESSAGE_LOCAL_ID_INVALID, MESSAGE_LOCAL_ID_REQUIRED } from './../messages';
import { Router } from 'express';
import { Request, Response } from 'express-serve-static-core';
import { chainCodeQuery } from '../chaincode-connection';
import { isLocalID, isFQDN } from '../util';
import { logger } from '../logger';

export function createUserRouter(
    queryFunction: (request: ChaincodeQueryRequest) => Promise<any>, invokeFunction: (request: ChaincodeInvokeRequest) => Promise<void>
): Router {
    const userRouter = Router();
    userRouter.get('/', async (req: Request, res: Response) => {
        try {
            const result = await queryFunction({
                ...queryBase,
                fcn:'getUsersList',
                args: [],
            });
            res.json(result);
        } catch (e) {
            logger.error(`chaincodeエラー ${e}`);
            res.status(500).json({ error: true });
        }
    });
        
    userRouter.get('/:host/:id', async (req, res) => {
        const { host, id } = req.params;
        let invalidFlag = false;
        const invalidRequestMessage = {
            host: '',
            id: '',
        };

        if (host && !isFQDN(host)) {
            invalidRequestMessage.host = MESSAGE_HOST_INVALID;
            invalidFlag = true;
        } else if (host === '') {
            invalidRequestMessage.host = MESSAGE_HOST_REQUIRED;
            invalidFlag = true;
        }

        if (id && !isLocalID(id)) {
            invalidRequestMessage.id = MESSAGE_LOCAL_ID_INVALID;
            invalidFlag = true;
        } else if (id === '') {
            invalidRequestMessage.id = MESSAGE_LOCAL_ID_REQUIRED;
            invalidFlag = true;
        }

        if (invalidFlag) {
            logger.info('/:host/:idへの不正なリクエスト host:${host} id:${id}');
            res.status(400).json(invalidRequestMessage);
            return;
        }
        try {
            const result = await queryFunction({
                ...queryBase,
                fcn:'getUser',
                args: [host, id],
            });
            res.status(200).json(result);
        } catch (e) {
            logger.error(`chaincodeエラー ${e}`);
            res.status(500).json({ error: true });
        }
    });

    logger.trace('createUserRouter完了');
    return userRouter;
}

const queryBase = {
    chaincodeId:'user',
    // TODO transactionIDは不要であるはずだ
    txId: {
        getTransactionID(): string {throw new Error('呼ばれないはずだ'); return 'hoge';},
    },
};
