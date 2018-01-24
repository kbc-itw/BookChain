export interface ISecrets {
    readonly SESSION_SECRET: string;
    readonly facebook: {
        FACEBOOK_APP_ID: string;
        FACEBOOK_APP_SECRET: string;
    };
}