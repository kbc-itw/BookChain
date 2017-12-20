import * as chai from'chai';
import 'mocha';
import { isFQDN, isLocalID, isDisplayName, isLocator, isISBN, isBooleanString, isUUID } from '../app/util';

describe('isFQDN', () => {

    it('一般的なドメイン', () => {
        const fqdn = 'google.com';
        chai.expect(isFQDN(fqdn)).to.be.true;
    });

    it('localhostは特別にOK', () => {
        chai.expect(isFQDN('localhost')).to.be.true;
    });

    it('各ドメイン最初の1文字は英数字である', () => {
        chai.expect(isFQDN('.com')).to.be.false;
        chai.expect(isFQDN('2google.com')).to.be.true;
        chai.expect(isFQDN('drive.2google.com')).to.be.true;
    });

    it('TLDの最後のドットを許容しない', () => {
        chai.expect(isFQDN('google.com.')).to.be.false;
    });

    it('各ドメインの最初と最後以外の文字では、-のみ記号として使用できる', () => {
        chai.expect(isFQDN('go-ogle.com')).to.be.true;
        chai.expect(isFQDN('goo_gle.com')).to.be.false;
    });


    it('TLD以外のドメイン名においては最後のドットが必須', () => {
        chai.expect(isFQDN('google..com')).to.be.false;
        chai.expect(isFQDN('.com')).to.be.false;
        chai.expect(isFQDN('google<>.com')).to.be.false;
        chai.expect(isFQDN('google')).to.be.true;
    });
});

describe('isLocalID', () => {
    it('一般的なLocalID', () => {
        chai.expect(isLocalID('huruikagi')).to.be.true;
    });

    it('4文字以上15文字以下である', () => {
        chai.expect(isLocalID('foo')).to.be.false;
        chai.expect(isLocalID('foob')).to.be.true;
        chai.expect(isLocalID('foobarfoobarfoo')).to.be.true;
        chai.expect(isLocalID('foobarfoobarfoob')).to.be.false;
    });

    it('アルファベットと_を許容', () => {
        chai.expect(isLocalID('f_oo')).to.be.true;
        chai.expect(isLocalID('_foo')).to.be.true;
        chai.expect(isLocalID('2foo')).to.be.false;
        chai.expect(isLocalID('2_foo')).to.be.false;
    });

});

describe('isDisplayName', () => {
    it('一般的なDisplayName', () => {
        chai.expect(isDisplayName('ふるいかぎ')).to.be.true;
    });

    it('1文字以上50文字以下である', () => {
        chai.expect(isDisplayName('')).to.be.false;
        chai.expect(isDisplayName('ふ')).to.be.true;
        chai.expect(isDisplayName('ふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎ')).to.be.true;
        chai.expect(isDisplayName('ふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふるいかぎふ')).to.be.false;
    });
});

describe('isLocator', () => {
    it('一般的なLocator', () => {
        chai.expect(isLocator('huruikagi@kbc-itw.net')).to.be.true;
    });

    it('真ん中に@が必要', () => {
        chai.expect(isLocator('huruikagikbc-itw.net')).to.be.false;
    });

    it('@手前はlocalID, 後ろはhostnameである', () => {
        chai.expect(isLocator('foobarfoobarfoob@kbc-itw.net')).to.be.false;
        chai.expect(isLocator('foobar@kbc-<>itw.net')).to.be.false;
        chai.expect(isLocator('foobarfoobarfoob@kbc-<>itw.net')).to.be.false;
    });
});

describe('isISBN', () => {
    it('一般的なISBN', () => {
        chai.expect(isISBN('9784062639149')).to.be.true;
    });

    it('10桁は通さない', () => {
        chai.expect(isISBN('4062194074')).to.be.false;
        chai.expect(isISBN('4-062194-07-4')).to.be.false;
        
    });

    it('ハイフンを許容しない', () => {
        chai.expect(isISBN('978-4-06-263914-9')).to.be.false;
    });

    it('13桁でもISBNでない数字は通さない', () => {
        chai.expect(isISBN('1234567890123')).to.be.false;
    });

    it('そもそもISBNでない文字列は通さない', () => {
        chai.expect(isISBN('hogehgoe')).to.be.false;
    });
});

describe('isBooleanString', () => {
    it('trueおよびfalse', () => {
        chai.expect(isBooleanString('true')).to.be.true;
        chai.expect(isBooleanString('false')).to.be.true;
    });

    it('大文字は通さない', () => {
        chai.expect(isBooleanString('TRUE')).to.be.false;
        chai.expect(isBooleanString('FALSE')).to.be.false;
    });

    it('そもそもtrueとかfalseでない文字列は通さない', () => {
        chai.expect(isBooleanString('foo')).to.be.false;
    });
});


describe('isUUID', () => {
    it('一般的なUUID', () => {
        chai.expect(isUUID('83022881-e0f9-4e37-b762-682791aa518d')).to.be.true;
    });

    it('要ハイフン', () => {
        chai.expect(isUUID('83022881e0f94e37b762682791aa518d')).to.be.false;
    });

    it('そもそもUUIDでない文字列は通さない', () => {
        chai.expect(isUUID('foofoofoofoofoofoofoofoofoofoofo')).to.be.false;
    });
});

