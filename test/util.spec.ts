import * as chai from'chai';
import 'mocha';
import { isFQDN, isLocalID, isDisplayName, isLocator, isISBN } from '../app/util';

describe('isFQDN', () => {

    it('一般的なドメイン', () => {
        const fqdn = 'google.com';
        chai.expect(isFQDN(fqdn)).to.equal(true);
    });

    it('localhostは特別にOK', () => {
        chai.expect(isFQDN('localhost')).to.equal(true);
    });

    it('各ドメイン最初の1文字は英数字である', () => {
        chai.expect(isFQDN('.com')).to.equal(false);
        chai.expect(isFQDN('2google.com')).to.equal(true);
        chai.expect(isFQDN('drive.2google.com')).to.equal(true);
    });

    it('TLDの最後のドットを許容しない', () => {
        chai.expect(isFQDN('google.com.')).to.equal(false);
    });

    it('各ドメインの最初と最後以外の文字では、-のみ記号として使用できる', () => {
        chai.expect(isFQDN('go-ogle.com')).to.equal(true);
        chai.expect(isFQDN('goo_gle.com')).to.equal(false);
    });


    it('TLD以外のドメイン名においては最後のドットが必須', () => {
        chai.expect(isFQDN('google..com')).to.equal(false);
        chai.expect(isFQDN('.com')).to.equal(false);
        chai.expect(isFQDN('google<>.com')).to.equal(false);
        chai.expect(isFQDN('google')).to.equal(true);
    });
});

describe('isLocalID', () => {
    it('一般的なLocalID', () => {
        chai.expect(isLocalID('huruikagi')).to.equal(true);
    });

    it('4文字以上15文字以下である', () => {
        chai.expect(isLocalID('foo')).to.equal(false);
        chai.expect(isLocalID('foob')).to.equal(true);
        chai.expect(isLocalID('foobarfoobarfoo')).to.equal(true);
        chai.expect(isLocalID('foobarfoobarfoob')).to.equal(false);
    });

    it('アルファベットと_を許容', () => {
        chai.expect(isLocalID('f_oo')).to.equal(true);
        chai.expect(isLocalID('_foo')).to.equal(true);
        chai.expect(isLocalID('2foo')).to.equal(false);
        chai.expect(isLocalID('2_foo')).to.equal(false);
    });

});

describe('isDisplayName', () => {
    it('一般的なDisplayName', () => {
        chai.expect(isDisplayName('ふるいかぎ')).to.equal(true);
    });

    it('1文字以上50文字以下である', () => {
        chai.expect(isDisplayName('')).to.equal(false);
        chai.expect(isDisplayName('ふ')).to.equal(true);
        chai.expect(isDisplayName('ふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎ')).to.equal(true);
        chai.expect(isDisplayName('ふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふ')).to.equal(false);
    });
});

describe('isLocator', () => {
    it('一般的なLocator', () => {
        chai.expect(isLocator('huruikagi@kbc-itw.net')).to.equal(true);
    });

    it('真ん中に@が必要', () => {
        chai.expect(isLocator('huruikagikbc-itw.net')).to.equal(false);
    });

    it('@手前はlocalID, 後ろはhostnameである', () => {
        chai.expect(isLocator('foobarfoobarfoob@kbc-itw.net')).to.equal(false);
        chai.expect(isLocator('foobar@kbc-<>itw.net')).to.equal(false);
        chai.expect(isLocator('foobarfoobarfoob@kbc-<>itw.net')).to.equal(false);
    });
});

describe('isISBN', () => {
    it('一般的なISBN', () => {
        chai.expect(isISBN('978-4-06-263914-9')).to.equal(true);
        chai.expect(isISBN('9784062639149')).to.equal(true);
    });

    it('10桁は通さない', () => {
        chai.expect(isISBN('4062194074')).to.equal(false);
        chai.expect(isISBN('4-062194-07-4')).to.equal(false);
        
    });

    it('13桁でもISBNでない数字は通さない', () => {
        chai.expect(isISBN('1234567890123')).to.equal(false);
    });

    it('そもそもISBNでない文字列は通さない', () => {
        chai.expect(isISBN('hogehgoe')).to.equal(false);
    });
});
