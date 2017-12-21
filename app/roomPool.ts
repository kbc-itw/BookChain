import { UUID, FQDN, RoomPurpose, Locator } from './util';
import * as ws from 'ws';

export const roomPool = new Map<UUID, SocketRoom>();

interface SocketRoom {
    room: {
        readonly id: UUID;
        readonly host: FQDN;
        readonly purpose: RoomPurpose;
        readonly inviter: Locator;
        readonly guest: Locator | undefined;
        readonly createdAt: Date;
        readonly closedAt: Date | undefined;
    };
    inviterSocket : ws | undefined;
    guestSocket: ws | undefined;
}
