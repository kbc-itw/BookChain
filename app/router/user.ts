import { Router } from 'express';
import { Request, Response } from 'express-serve-static-core';
import { chainCodeQuery } from '../chaincode-connection';
import { isLocalID, isFQDN } from '../util';

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
            res.status(500).json({ error: true });
        }
    });
        
    userRouter.get('/:host/:id', async (req, res) => {
        const host = req.params.host;
        const id = req.params.id;

        if (isFQDN(host) && isLocalID(id)) {
            try {
                const result = await queryFunction({
                    ...queryBase,
                    fcn:'getUser',
                    args: [host, id],
                });
                res.status(200).json(result);
            } catch (e) {
                res.status(500).json({ error: true });
            }
        } else {
            res.status(400).json({ error: true });
        }
    });
    return userRouter;
}

const queryBase = {
    chaincodeId:'user',
    // TODO transactionIDは不要であるはずだ
    txId: {
        getTransactionID(): string {throw new Error('呼ばれないはずだ'); return 'hoge';},
    },
};
