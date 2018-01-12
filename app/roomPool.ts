import { UUID, FQDN, RoomPurpose, Locator } from './util';
import * as ws from 'ws';

export const roomPool = new Map<UUID, SocketRoom>();

export interface SocketRoom {
    room: {
        readonly id: UUID;
        readonly host: FQDN;
        readonly purpose: RoomPurpose;
        readonly inviter: Locator;
        guest: Locator | undefined;
        readonly createdAt: Date;
        closedAt: Date | undefined;
    };
    isbn: string;
    inviterApproved: boolean;
    guestApproved: boolean;
    inviteToken: UUID;
    inviterSocket : ws | undefined;
    guestSocket: ws | undefined;
}
