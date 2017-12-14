import * as express from 'express';
import * as smp from 'source-map-support';

smp.install();

const app = express();

app.listen(80, () => {
    console.log('Example app listening on port 80!');
});
