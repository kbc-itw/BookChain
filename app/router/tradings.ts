import { Router, Response, Request } from 'express';
import { isLocator, isISBN, isBooleanString, isUUID } from '../util';
import { logger } from '../logger';
import { ErrorMessages } from '../messages';
import { isAuthenticated } from '../authenticator';



export function createTradingsRouter(
    queryFunction: (request: ChaincodeQueryRequest) => Promise<any>, invokeFunction: (request: ChaincodeInvokeRequest) => Promise<void>,
): Router {

    const router = Router();

    router.get('/', isAuthenticated, async (req: Request, res: Response) => {
        let { owner, borrower, isbn, isreturned, limit, offset } = req.query;
        let invalidFlag = false;
        const invalidRequestMessage = {
            owner: '',
            borrower: '',
            isbn : '',
            isreturned: '',
            limit: '',
            offset: '',
        };

        // 不正であれば400で返す
        if (owner && !isLocator(owner)) {
            invalidRequestMessage.owner = ErrorMessages.MESSAGE_OWNER_INVALID;
            invalidFlag = true;
        }  else {
            owner = owner || '';
        }

        if (borrower && !isLocator(borrower)) {
            invalidRequestMessage.borrower = ErrorMessages.MESSAGE_BORROWER_INVALID;
            invalidFlag = true;
        }  else {
            borrower = borrower || '';
        }

        if (isbn && !isISBN(isbn)) {
            invalidRequestMessage.isbn = ErrorMessages.MESSAGE_ISBN_INVALID;
            invalidFlag = true;
        } else {
            isbn = isbn || '';
        }

        if (isreturned && !isBooleanString(isreturned)) {
            invalidRequestMessage.isreturned = ErrorMessages.MESSAGE_ISRETURNED_INVALID;
            invalidFlag = true;
        } else {
            isreturned = isreturned || '';
        }

        if (limit && (!Number.isInteger(Number(limit)) || limit <= 0)) {
            invalidRequestMessage.limit = ErrorMessages.MESSAGE_LIMIT_INVALID;
            invalidFlag = true;
        } else {
            limit = limit || '';
        }
        if (offset && (!Number.isInteger(Number(offset)) || offset < 0)) {
            invalidRequestMessage.offset = ErrorMessages.MESSAGE_OFFSET_INVALID;
            invalidFlag = true;
        } else {
            offset = offset || '';
        }
        
        if (invalidFlag) {
            logger.info(`/tradingsへの不正なget ${invalidRequestMessage}`);
            res.status(400).json(invalidRequestMessage);
            return;
        }

        try {
            const result = await queryFunction({
                ...queryBase,
                fcn: 'getTradingsList',
                args:[owner, borrower, isbn, isreturned, limit, offset],
            });
            res.status(200).json({ result });
        } catch (e) {
            logger.info(`chaincodeエラー ${e}`);
            res.status(500).json({ error: true });
        }
    });

    router.get('/:uuid', isAuthenticated, async (req: Request, res: Response) => {
        const { uuid } = req.params;
        let invalidFlag = false;
        const invalidRequestMessage = {
            uuid: '',
        };

        if (uuid && !isUUID(uuid)) {
            invalidRequestMessage.uuid = ErrorMessages.MESSAGE_UUID_INVALID;
            invalidFlag = true;
        }

        if (invalidFlag) {
            logger.info(`/tradings/:idへの不正なget uuid:${uuid}`);
            res.status(400).json(invalidRequestMessage);
            return;
        }

        try {
            const result = await queryFunction({
                ...queryBase,
                fcn: 'getTrading',
                args:[uuid],
            });
            res.status(200).json(result);
        } catch (e) {
            logger.info(`chaincodeエラー ${e}`);
            res.status(500).json({error: true});
        }

    });

    logger.trace('createTradingRouter完了');
    return router;
}



const queryBase = {
    chaincodeId:'tradings',
    // TODO transactionIDは不要であるはずだ
    txId: {
        getTransactionID(): string {throw new Error('呼ばれないはずだ'); },
    },
};
