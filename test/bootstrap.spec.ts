import * as chai from 'chai';
import 'mocha';
import { bootstrap } from '../app/bootstrap';
import { Server } from 'http';

chai.use(require('chai-http'));

describe('bootstrap', () => {

    let server: Server;

    before((done) => {
        server = bootstrap().listen(5000, () => done());
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
