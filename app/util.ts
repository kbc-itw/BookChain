import * as ISBN from 'isbn-utils';

export type FQDN = 'FQDN　特別にlocalhostも可';
export type LocalID = '英数字とアンダーバーのみ利用可、4文字以上15文字以下';
export type DisplayName = '1文字以上50文字以内の任意の文字列';
export type Locator = '(UserID)@(FQDN)';
export type ISBN = '13桁のISBN（ハイフンなし）';
export type BooleanString = 'trueまたはfalse';
export type UUID = 'ハイフンが必要';

const isDomainName = require('is-domain-name');

export function isFQDN(fqdn: string): fqdn is FQDN {
    return isDomainName(fqdn, false) || fqdn === 'localhost';
}

export function isLocalID(id : string): id is LocalID {
    return /^[a-zA-Z_]{4,15}$/.test(id);
}

export function isDisplayName(displayName: string): displayName is DisplayName {
    return /^.{1,50}$/.test(displayName);
}

export function isLocator(locator: string): locator is Locator {
    const separatedStrings = locator.split('@');
    if (separatedStrings.length !== 2) {
        return false;
    }
    
    return isLocalID(separatedStrings[0]) && isFQDN(separatedStrings[1]);
}

export function isISBN(isbn: string): isbn is ISBN {
    const parsed = ISBN.parse(isbn);
    if (parsed !== null) {
        if (parsed.codes.source.match(/-/)) {
            return false;
        }
        return parsed.isIsbn13();
    }
    return false;
}

export function isBooleanString(bool: string): bool is BooleanString {
    return bool === 'true' || bool === 'false'; 
}

export function isUUID(uuid: string): uuid is UUID {
    return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(uuid);
}
