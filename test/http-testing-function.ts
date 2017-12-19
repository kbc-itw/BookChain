import * as chai from 'chai';
import { Server } from 'http';

chai.use(require('chai-http'));

export function testGet(server: Server, path: string): Promise<ChaiHttp.Response> {
    return new Promise<ChaiHttp.Response>((resolve, reject) => {
        chai.request(server)
            .get(path)
            .end((err, res) => {
                resolve(res);
            });
    });
}
