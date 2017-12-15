export interface IChainCodeConfig {
    readonly channelName: string;
    readonly userName: string;
    readonly hostName: string;
    readonly peerPort: number;
    readonly ordererPort: number;
    readonly eventHubPort: number;
    readonly pathStoreName: string;
}
