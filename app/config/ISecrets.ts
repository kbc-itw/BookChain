export interface ISecrets {
    readonly SESSION_SECRET: string;
    readonly facebook: {
        readonly FACEBOOK_APP_ID: string;
        readonly FACEBOOK_APP_SECRET: string;
    };
}
