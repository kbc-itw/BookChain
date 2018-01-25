export interface ISecrets {
    readonly SESSION_SECRET: string;
    readonly facebook: {
        readonly FACEBOOK_APP_ID: string;
        readonly FACEBOOK_APP_SECRET: string;
    };
    readonly couch: {
        readonly USER_NAME: string;
        readonly USER_PASSWORD: string;
        readonly AUTH_DB_NAME: string;
        readonly SESSION_DB_NAME: string;
        readonly HOST: string;
        readonly PORT: number;
    };
}
