import * as nano from 'nano';
import { ISecrets } from './config/ISecrets';
import { DisplayName, LocalID } from './util';
import { Profile as FacebookProfile } from 'passport-facebook';


const {
    USER_NAME,
    USER_PASSWORD,
    HOST,
    PORT,
    AUTH_DB_NAME,
} = (require('../config/secrets.json') as ISecrets).couch;


const authDb = nano(`http://${USER_NAME}:${USER_PASSWORD}@${HOST}:${PORT}/${AUTH_DB_NAME}`) as nano.DocumentScope<IUserAuth>;


/**
 * ユーザーの認証情報を表すインターフェース
 */
export interface IUserAuth {
    localId?: LocalID;
    displayName?: DisplayName;
    auth: {
        facebook: {
            accessToken: string;
            refreshToken: string;
            profile: FacebookProfile;
        };
    };
}


export enum Strategy {
    FACEBOOK = 'facebook',
}


/**
 * ユーザー認証情報の関数群をまとめたもの
 */
export namespace AuthDb {


    export function insertWithPromise(auth: IUserAuth, id?: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {

            const handleResponse = (error: Error, response: nano.DocumentInsertResponse) => {
                if (error) reject(error);
                else resolve(response.id);
            };

            if (id) {
                authDb.insert(auth, id, handleResponse);
            } else {
                authDb.insert(auth, handleResponse);
            }

        });
    }


    function findWithPromise(query: nano.MangoQuery): Promise<nano.MangoResponse<IUserAuth>> {
        return new Promise<nano.MangoResponse<IUserAuth>>((resolve, reject) => {
            authDb.find(query, (error, response) => {
                if (error) reject(error);
                else resolve(response);
            });
        });
    }

    export async function registerLocalInfo(strategy: Strategy, auth: IUserAuth): Promise<string> {
        let query = {
            selector: {}, 
            fields: [''],
        };
        switch (strategy) {
        case Strategy.FACEBOOK:
            query = {
                selector: {
                    localId: auth.localId,
                },
                fields: [
                    '_id',
                    'auth',
                ],
            };
            break;
        default:
            throw new Error();
        }
        try {
            const response = await findWithPromise(query);
            if (response.docs.length >= 1) {
                throw new Error('localIdが重複');
            }
            return await insertWithPromise(auth, auth._id);
        } catch (e) {
            throw e;
        }
    }

    function createFindQuery(strategy: Strategy, id: string): nano.MangoQuery {

        switch (strategy) {
            case Strategy.FACEBOOK:
                return {
                    selector: {
                        facebook: {
                            profile: { id }
                        }
                    },
                    fields: [
                        // ※'_rev' を引っ張ってこないようにする。
                        '_id',
                        'auth',
                    ],
                    limit: 2,
                };
            default:
                throw new Error();
        }

    }


    /**
     * facebook用のやつ
     */
    export namespace facebook {

        export async function upsert(accessToken: string, refreshToken: string, profile: FacebookProfile): Promise<IUserAuth> {

            const facebook = {
                accessToken,
                refreshToken,
                profile,
            };

            const query = createFindQuery(Strategy.FACEBOOK, profile.id);

            const response = await findWithPromise(query);

            let auth: IUserAuth & nano.MaybeDocument;

            if (response.docs.length === 0) {
                // 未登録ユーザーだったとき
                auth = { auth: { facebook } };
                auth._id = await insertWithPromise(auth);

            } else if (response.docs.length === 1) {
                // 既存のユーザーだったとき
                auth = {
                    ...response.docs[0],
                    facebook,
                };
                await insertWithPromise(auth, auth._id);

            } else {
                // 複数ユーザーが見つかったとき
                throw new Error(`multiply user-auth data found. facebook id: ${profile.id}`);
            }

            return auth;
        }
    }


    export function get(id: string): Promise<IUserAuth> {
        return new Promise((resolve, reject) => {
            authDb.get(id, (error, response) => {
                if (error) reject(error);
                else resolve(response);
            });
        });
    }


}
