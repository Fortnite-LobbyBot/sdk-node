import type { Shard } from '../classes/Shard';
import { Events } from '../events';
import type { SdkPartyMember } from '../ipc/protocol';
import type { Bot } from '../structures/Bot';
import type { Message } from '../structures/Message';

/** Epic account id and optional display name on bot-scoped social events. */
export interface FnlbUserRef {
	id: string;
	displayName?: string;
}

/** `{ bot, ...fields }` for events that only need the bot instance. */
export interface FnlbBotEvent {
	bot: Bot;
}

/** Fortnite client disconnected. */
export interface FnlbDisconnectedEvent {
	bot: Bot;
	isLogout: boolean;
}

/** Friend presence tick from the shard. */
export interface FnlbFriendPresenceEvent extends FnlbUserRef {
	bot: Bot;
	status?: string;
	isJoinable?: boolean;
	partySize?: number;
}

/** Party invite or join request. */
export interface FnlbPartyInviteEvent {
	bot: Bot;
	partyId?: string;
	sender: FnlbUserRef;
}

/** Party roster summary. */
export interface FnlbPartyUpdateEvent {
	bot: Bot;
	id?: string;
	size?: number;
	memberIds: string[];
}

/** Party member joined, left, kicked, promoted, or updated. */
export interface FnlbPartyMemberEvent {
	bot: Bot;
	member?: SdkPartyMember;
}

/** Cosmetic or readiness change on a member. */
export interface FnlbPartyMemberValueEvent {
	bot: Bot;
	member?: SdkPartyMember;
	value?: unknown;
	previousValue?: unknown;
}

/** Friend added, removed, online, offline, request, or block list change. */
export interface FnlbFriendUserEvent extends FnlbUserRef {
	bot: Bot;
}

/**
 * Listener signatures for {@link Events} on the FNLB client.
 *
 * @example
 * ```ts
 * fnlb.on(Events.PartyMemberMessage, (message) => {
 *   console.log(message.content);
 * });
 * ```
 */
export interface FnlbClientEvents {
	[Events.Ready]: (bot: Bot) => void;
	[Events.ShardReady]: (shard: Shard) => void;
	[Events.Disconnected]: (event: FnlbDisconnectedEvent) => void;
	[Events.FriendMessage]: (message: Message) => void;
	[Events.PartyMemberMessage]: (message: Message) => void;
	[Events.FriendRequest]: (event: FnlbFriendUserEvent) => void;
	[Events.FriendAdded]: (event: FnlbFriendUserEvent) => void;
	[Events.FriendRemoved]: (event: FnlbFriendUserEvent) => void;
	[Events.FriendOnline]: (event: FnlbFriendUserEvent) => void;
	[Events.FriendOffline]: (event: FnlbFriendUserEvent) => void;
	[Events.FriendPresence]: (event: FnlbFriendPresenceEvent) => void;
	[Events.PartyInvite]: (event: FnlbPartyInviteEvent) => void;
	[Events.PartyJoinRequest]: (event: FnlbPartyInviteEvent) => void;
	[Events.PartyMemberJoined]: (event: FnlbPartyMemberEvent) => void;
	[Events.PartyMemberLeft]: (event: FnlbPartyMemberEvent) => void;
	[Events.PartyMemberKicked]: (event: FnlbPartyMemberEvent) => void;
	[Events.PartyMemberPromoted]: (event: FnlbPartyMemberEvent) => void;
	[Events.PartyMemberUpdated]: (event: FnlbPartyMemberEvent) => void;
	[Events.PartyMemberOutfitUpdated]: (event: FnlbPartyMemberValueEvent) => void;
	[Events.PartyMemberEmoteUpdated]: (event: FnlbPartyMemberValueEvent) => void;
	[Events.PartyMemberBackpackUpdated]: (event: FnlbPartyMemberValueEvent) => void;
	[Events.PartyMemberPickaxeUpdated]: (event: FnlbPartyMemberValueEvent) => void;
	[Events.PartyMemberReadinessUpdated]: (event: FnlbPartyMemberValueEvent) => void;
	[Events.PartyMemberMatchStateUpdated]: (event: FnlbPartyMemberValueEvent) => void;
	[Events.PartyUpdate]: (event: FnlbPartyUpdateEvent) => void;
	[Events.PartyRecreated]: (event: FnlbBotEvent) => void;
	[Events.UserBlocked]: (event: FnlbFriendUserEvent) => void;
	[Events.UserUnblocked]: (event: FnlbFriendUserEvent) => void;
}

/** @hidden */
export type FnlbEventName = keyof FnlbClientEvents;
