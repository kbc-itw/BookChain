import { Router, Response, Request } from 'express';
import { isLocator, isISBN } from '../util';
import { logger } from '../logger';


const ownerInvalidMessage = 'ownerにはlocatorを指定します';
const isbnInvalidMessage = 'isbnには13桁のisbnを指定します';
const limitInvalidMessage = 'limitには0より大きい整数を指定します';
const offsetInvalidMessage = 'offsetには0以上の整数を指定します';
const ownerRequiredMessage = 'ownerは必須です';
const isbnRequiredMessage = 'isbnは必須です';

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
            invalidRequestMessage.owner = ownerInvalidMessage;
            invalidFlag = true;
        }  else {
            owner = owner || '';
        }
        if (isbn && !isISBN(isbn)) {
            invalidRequestMessage.isbn = isbnInvalidMessage;
            invalidFlag = true;
        } else {
            isbn = isbn || '';
        }
        if (limit && (!Number.isInteger(Number(limit)) || limit <= 0)) {
            invalidRequestMessage.limit = limitInvalidMessage;
            invalidFlag = true;
        } else {
            limit = limit || '';
        }
        if (offset && (!Number.isInteger(Number(offset)) || offset < 0)) {
            invalidRequestMessage.offset = offsetInvalidMessage;
            invalidFlag = true;
        } else {
            offset = offset || '';
        }
        
        if (invalidFlag) {
            logger.info(`ownershipへの不正なリクエスト ${invalidRequestMessage}`);
            res.status(400).json(invalidRequestMessage);
            return;
        }

        try {
            const result = await queryFunction({
                ...queryBase,
                fcn: 'getOwnerShipList',
                args:[owner, isbn, limit, offset],
            });
            res.status(200).json({ result });
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
