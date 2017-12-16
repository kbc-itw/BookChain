export type FQDN = 'FQDN　特別にlocalhostも可';
export type LocalID = '英数字とアンダーバーのみ利用可、4文字以上15文字以下';
export type DisplayName = '1文字以上50文字以内の任意の文字列';
export type Locator = '(UserID)@(FQDN)';

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
