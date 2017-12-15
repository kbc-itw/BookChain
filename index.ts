import * as express from 'express';
import * as smp from 'source-map-support';
import { bootstrap } from './app/bootstrap';
import * as config from 'config';
import { IServerConfig } from './app/conig/IServerConfig';

const serverConfig = config.get<IServerConfig>('server');

smp.install();

bootstrap().listen(serverConfig.port, serverConfig.host, () => {
    console.log('Example app listening on port' + serverConfig.port);
});
