import { MESSAGE_ISBN_INVALID, MESSAGE_LIMIT_INVALID, MESSAGE_OFFSET_INVALID, MESSAGE_ISBN_REQUIRED, MESSAGE_OWNER_REQUIRED, MESSAGE_OWNER_INVALID } from './../messages';
import { Router, Response, Request } from 'express';
import { isLocator, isISBN } from '../util';
import { logger } from '../logger';


export function createOwnershipRouter(
    queryFunction: (request: ChaincodeQueryRequest) => Promise<any>, invokeFunction: (request: ChaincodeInvokeRequest) => Promise<void>,
): Router {
    const router = Router();

    router.get('/', async (req: Request, res: Response) => {
        let { owner, isbn, limit, offset } = req.query;
        let invalidFlag = false;
        const invalidRequestMessage = {
            owner: '',
            isbn : '',
            limit: '',
            offset: '',
        };

        // 不正であれば400で返す
        if (owner && !isLocator(owner)) {
            invalidRequestMessage.owner = MESSAGE_OWNER_INVALID;
            invalidFlag = true;
        }  else {
            owner = owner || '';
        }
        if (isbn && !isISBN(isbn)) {
            invalidRequestMessage.isbn = MESSAGE_ISBN_INVALID;
            invalidFlag = true;
        } else {
            isbn = isbn || '';
        }
        if (limit && (!Number.isInteger(Number(limit)) || limit <= 0)) {
            invalidRequestMessage.limit = MESSAGE_LIMIT_INVALID;
            invalidFlag = true;
        } else {
            limit = limit || '';
        }
        if (offset && (!Number.isInteger(Number(offset)) || offset < 0)) {
            invalidRequestMessage.offset = MESSAGE_OFFSET_INVALID;
            invalidFlag = true;
        } else {
            offset = offset || '';
        }
        
        if (invalidFlag) {
            logger.info(`ownershipへの不正なget ${invalidRequestMessage}`);
            res.status(400).json(invalidRequestMessage);
            return;
        }

        try {
            const result = await queryFunction({
                ...queryBase,
                fcn: 'getOwnerShipList  ',
                args:[owner, isbn, limit, offset],
            });
            res.status(200).json({ result });
        } catch (e) {
            logger.info(`chaincodeエラー ${e}`);
            res.status(500).json({ error: true });
        }
    });

    router.post('/', async(req: Request, res: Response) => {
        const { owner, isbn } = req.body;
        let invalidFlag = false;
        const invalidRequestMessage = {
            owner: '',
            isbn:  '',
        };

        // 不正ないし存在しなければ400
        if (owner && !isLocator(owner)) {
            invalidRequestMessage.owner = MESSAGE_OWNER_INVALID;
            invalidFlag = true;
        } else if (!owner) {
            invalidRequestMessage.owner = MESSAGE_OWNER_REQUIRED;
            invalidFlag = true;
        }

        if (isbn && !isISBN(isbn)) {
            invalidRequestMessage.isbn = MESSAGE_ISBN_INVALID;
            invalidFlag = true;
        } else if (!isbn) {
            invalidRequestMessage.isbn = MESSAGE_ISBN_REQUIRED;
            invalidFlag = true;
        }

        if (invalidFlag) {
            logger.info(`/ownershipへの不正なpost owner:${owner} isbn:${isbn}`);
            res.status(400).json(invalidRequestMessage);
            return;
        }

        try {
            const result = await invokeFunction({
                ...invokeBase,
                fcn: 'createOwnerShip',
                args: [owner, isbn, new Date().toISOString()],

            });
            res.status(201).end();
        } catch (e) {
            logger.info(`chaincodeエラー ${e}`);
            res.status(500).json({ error: true });
        }

    });

    router.delete('/', async(req: Request, res: Response) => {
        const { owner, isbn } = req.body;
        let invalidFlag = false;
        const invalidRequestMessage = {
            owner: '',
            isbn:  '',
        };

        // 不正ないし存在しなければ400
        if (owner && !isLocator(owner)) {
            invalidRequestMessage.owner = MESSAGE_OWNER_INVALID;
            invalidFlag = true;
        } else if (!owner) {
            invalidRequestMessage.owner = MESSAGE_OWNER_REQUIRED;
            invalidFlag = true;
        }

        if (isbn && !isISBN(isbn)) {
            invalidRequestMessage.isbn = MESSAGE_ISBN_INVALID;
            invalidFlag = true;
        } else if (!isbn) {
            invalidRequestMessage.isbn = MESSAGE_ISBN_REQUIRED;
            invalidFlag = true;
        }

        if (invalidFlag) {
            logger.info(`/ownershipへの不正なdelete owner:${owner} isbn:${isbn}`);
            res.status(400).json(invalidRequestMessage);
            return;
        }

        try {
            const result = await invokeFunction({
                ...invokeBase,
                fcn: 'deleteOwnerShip',
                args: [owner, isbn],

            });
            res.status(200).end();
        } catch (e) {
            logger.info(`chaincodeエラー ${e}`);
            res.status(500).json({ error: true });
        }

    });

    logger.trace('createOwnershipRouter完了');
    return router;
}

const queryBase = {
    chaincodeId:'ownership',
    // TODO transactionIDは不要であるはずだ
    txId: {
        getTransactionID(): string {throw new Error('呼ばれないはずだ'); return 'hoge';},
    },
};

const invokeBase = {
    chaincodeId: 'ownership',
    txId: {
        getTransactionID(): string {throw new Error('呼ばれないはずだ'); return 'hoge'; },
    },
};
