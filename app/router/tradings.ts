import { Router, Response, Request } from 'express';
import { isLocator, isISBN } from '../util';
import { logger } from '../logger';
import { ErrorMessages } from '../messages';



export function createTradingsRouter(
    queryFunction: (request: ChaincodeQueryRequest) => Promise<any>, invokeFunction: (request: ChaincodeInvokeRequest) => Promise<void>,
): Router {

    const router = Router();

    router.get('/', async (req: Request, res: Response) => {
        let { owner, borrower, isbn, isReturned, limit, offset } = req.query;
        let invalidFlag = false;
        const invalidRequestMessage = {
            owner: '',
            borrower: '',
            isbn : '',
            isReturned: '',
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

        if (isReturned && !isISBN(isReturned)) {
            invalidRequestMessage.isReturned = ErrorMessages.MESSAGE_ISRETURNED_INVALID;
            invalidFlag = true;
        } else {
            isReturned = isReturned || '';
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
                args:[owner, borrower, isbn, isReturned, limit, offset],
            });
            res.status(200).json({ result });
        } catch (e) {
            logger.info(`chaincodeエラー ${e}`);
            res.status(500).json({ error: true });
        }
    });

    logger.trace('createTradingRouter完了');
    return router;
}


const queryBase = {
    chaincodeId:'tradings',
    // TODO transactionIDは不要であるはずだ
    txId: {
        getTransactionID(): string {throw new Error('呼ばれないはずだ'); return 'hoge';},
    },
};

const invokeBase = {
    chaincodeId: 'tradings',
    txId: {
        getTransactionID(): string {throw new Error('呼ばれないはずだ'); return 'hoge'; },
    },
};
