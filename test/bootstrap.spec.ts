import * as chai from 'chai';
import 'mocha';
import { bootstrap } from '../app/bootstrap';
import { Server } from 'http';
import * as config from 'config';
import { IServerConfig } from '../app/config/IServerConfig';

chai.use(require('chai-http'));

describe('bootstrap', () => {
    const serverConfig = config.get<IServerConfig>('server');

    let server: Server;

    before((done) => {
        server = bootstrap().listen(serverConfig.port, serverConfig.host, () => done());
    });

    after((done) => {
        server.close(() => done());
    });

    it('サーバ起動に成功する', () => {
        chai.request(server)
            .get('/')
            .end((err, res) => {
                chai.expect(res).to.be.a('Object');
            });
    });
});
