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
    facebook: {
        accessToken: string;
        refreshToken: string;
        profile: FacebookProfile;
    };
}


export enum Strategy {
    FACEBOOK = 'facebook',
}


/**
 * ユーザー認証情報の関数群をまとめたもの
 */
export namespace AuthDb {


    export function insertWithPromise(auth: IUserAuth): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            authDb.insert(auth, (error, response) => {
                if (error) resolve(response.id);
                else reject(error);
            });
        });
    }


    function findWithPromise(query: nano.MangoQuery): Promise<nano.MangoResponse<IUserAuth>> {
        return new Promise<nano.MangoResponse<IUserAuth>>((resolve, reject) => {
            authDb.find(query, (err, response) => {
                if (err) reject(err);
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
            return Promise.reject(new Error());
        }
        try {
            const response = await findWithPromise(query);
            if (response.docs.length >= 1) {
                return Promise.reject(new Error('localIdが重複'));
            }
            return insertWithPromise(auth);
        } catch (e) {
            return Promise.reject(e);
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
                        'auth'
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
                auth = { facebook };

            } else if (response.docs.length === 1) {
                // 既存のユーザーだったとき
                auth = {
                    ...response.docs[0],
                    facebook
                };

            } else {
                // 複数ユーザーが見つかったとき
                throw new Error(`multiply user-auth data found. facebook id: ${profile.id}`);
            }

            auth._id = await insertWithPromise(auth);

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
