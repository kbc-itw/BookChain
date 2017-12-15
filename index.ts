import * as express from 'express';
import * as smp from 'source-map-support';
import { bootstrap } from './app/bootstrap';

smp.install();

bootstrap().listen(80, () => {
    console.log('Example app listening on port 80!');
});
