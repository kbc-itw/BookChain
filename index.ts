import * as express from 'express';
import * as smp from 'source-map-support';
import { bootstrap } from './app/bootstrap';
import * as config from 'config';
import { IServerConfig } from './app/config/IServerConfig';
import { configure, Configuration } from 'log4js';
import { logger } from './app/logger';
import { SocketRoom, createWebSocketServer } from './app/roomWebSocket';
import { UUID } from './app/util';
import { chainCodeQuery, chainCodeInvoke } from './app/chaincode-connection';

const serverConfig = config.get<IServerConfig>('server');

smp.install();
const map = new Map<UUID, SocketRoom>();
const server = bootstrap(map).listen(serverConfig.port, serverConfig.host, () => {
    logger.trace('Example app listening on port' + serverConfig.port);
    createWebSocketServer(server, 'rooms/connect', map, chainCodeQuery, chainCodeInvoke)
    .then(() => {
        logger.trace('websocket Server started');
    });
});
