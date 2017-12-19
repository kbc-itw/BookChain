export enum ErrorMessages {
    MESSAGE_OWNER_INVALID = 'ownerにはlocatorを指定します',
    MESSAGE_BORROWER_INVALID = 'borrowerにはlocatorを指定します',
    MESSAGE_ISBN_INVALID = 'isbnには13桁のisbnを指定します',
    MESSAGE_ISRETURNED_INVALID = 'isReturnedにはtrueかfalseを指定します',
    MESSAGE_LIMIT_INVALID = 'limitには0より大きい整数を指定します',
    MESSAGE_OFFSET_INVALID = 'offsetには0以上の整数を指定します',
    MESSAGE_HOST_INVALID = 'ホスト名にはFQDNないしlocalhostを指定します',
    MESSAGE_LOCAL_ID_INVALID = 'ローカルIDにはIDを指定します',
    MESSAGE_OWNER_REQUIRED = 'ownerは必須です',
    MESSAGE_ISBN_REQUIRED = 'isbnは必須です',
    MESSAGE_HOST_REQUIRED = 'ホスト名は必須です',
    MESSAGE_LOCAL_ID_REQUIRED = 'ローカルIDは必須です',
}