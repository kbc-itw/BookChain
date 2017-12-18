import * as express from 'express';
import * as smp from 'source-map-support';
import { bootstrap } from './app/bootstrap';
import * as config from 'config';
import { IServerConfig } from './app/config/IServerConfig';
import { configure, Configuration } from 'log4js';
import { logger } from './app/logger';

const serverConfig = config.get<IServerConfig>('server');

smp.install();

bootstrap().listen(serverConfig.port, serverConfig.host, () => {
    logger.trace('Example app listening on port' + serverConfig.port);
});
