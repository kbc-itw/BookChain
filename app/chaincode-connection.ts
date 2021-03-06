import fabricClient = require('fabric-client');
import * as path from 'path';
import * as config from 'config';
import * as appRootPath from 'app-root-path';
import { IChainCodeConfig } from './config/IChainCodeConfig';

const chainCodeConfig = config.get<IChainCodeConfig>('chaincode');
const { channelName, hostName, peerPort, ordererPort, userName, eventHubPort } = chainCodeConfig;

const client = new fabricClient();
const channel = client.newChannel(channelName);
const peer = client.newPeer(`grpc://${hostName}:${peerPort}`, {});
const orderer = client.newOrderer(`grpc://${hostName}:${ordererPort}`, {});
const storePath = path.join(appRootPath.path, 'hfc-key-store');

channel.addPeer(peer);
channel.addOrderer(orderer);

async function prepareConnection(): Promise<void> {
    const stateStore = await fabricClient.newDefaultKeyValueStore({ path: storePath });
    client.setStateStore(stateStore);
    const cryptoSuite = fabricClient.newCryptoSuite() as AESCryptoSuite;
    const cryptoStore = fabricClient.newCryptoKeyStore({ path: storePath });
    cryptoSuite.setCryptoKeyStore(cryptoStore);
    client.setCryptoSuite(cryptoSuite);
    const userFromStore = await client.getUserContext(userName, true);

    // 型定義が間違っており、if (!userFromStore || !userFromStore.isEnrolled())で判定しようとすると右辺がnever扱いされる
    if (userFromStore && userFromStore.isEnrolled()) {

    } else {
        throw new Error(`Failed to get ${chainCodeConfig.userName}`);
    }

}

/**
 * chainCodeに対しクエリを実行する。
 * @param request クエリ用リクエスト
 * @returns 投げたクエリに対応する関数が返す値で解決されるPromise
 */
export async function chainCodeQuery(request: ChaincodeQueryRequest): Promise<any> {

    await prepareConnection();

    const response = await channel.queryByChaincode(request);
    
    if (response && response.length === 1) {

        // サンプルにこれが書かれているが、これが正しいとするならqueryByChaincodeの型定義が間違っている
        if (response[0] instanceof Error) {
            throw new Error('Response is Error');
        } else {
            return JSON.parse(response[0].toString());
        }
    }
}


/**
 * chainCodeに対しトランザクションを実行する。
 * @param requestForProposal トランザクション実行用リクエスト
 * @returns トランザクションが成功した場合に解決されるPromise
 */
export async function chainCodeInvoke(requestForProposal: ChaincodeInvokeRequest): Promise<any> {
    await prepareConnection();

    const transactionID = client.newTransactionID();
    const transactionIDString = transactionID.getTransactionID();
    
    requestForProposal.txId = transactionID;

    const proposalResults = await channel.sendTransactionProposal(requestForProposal);

    const proposalResponses = proposalResults[0];
    const proposal = proposalResults[1];

    if (proposalResponses && proposalResponses[0].response && proposalResponses[0].response.status === 200) {

    } else {
        throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
    }

    const request = {
        proposalResponses,
        proposal,
    };

    const promises:Promise<any>[] = [];
    promises.push(channel.sendTransaction(request));

    const eventHub = client.newEventHub();
    eventHub.setPeerAddr(`grpc://${hostName}:${eventHubPort}`, {});

    promises.push(new Promise((resolve, reject) => {
        // const handle = setTimeout(() => {
        //     eventHub.disconnect();
        //     resolve({ eventStatus : 'TIMEOUT' });
        // });
        eventHub.connect();
        eventHub.registerTxEvent(transactionIDString, (transaction, code) => {
            // clearTimeout(handle);
            eventHub.unregisterTxEvent(transactionIDString);
            eventHub.disconnect();
            resolve({ event_status : code, transactionID: transactionIDString });
        }, (err) => {
            reject(new Error('something goes wrong with eventhub ' + err));
        });
    }));

    const results = await Promise.all(promises);

    // 反転させると右辺never
    if (results && results[0] && results[0].status === 'SUCCESS') {
    } else {
        throw new Error('Failed to order the transaction. Error code: ' + results[0].status);
    }

    // 反転させると右辺never
    if (results[1] && results[1].event_status === 'VALID') {
    } else {
        throw new Error('Transaction failed to be committed to the ledger due to :' + results[1].event_status);
    }
    return results;
}

interface AESCryptoSuite extends ICryptoSuite {
    setCryptoKeyStore(cryptoStore: ICryptoKeyStore): void;
}



