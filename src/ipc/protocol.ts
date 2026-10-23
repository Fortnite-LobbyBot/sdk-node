export const SDK_PROTOCOL_VERSION = 1;

export const SDK_METHODS = [
	'shard.info',
	'bots.list',
	'bots.get',
	'commands.run',
	'party.meta.get',
	'party.meta.set',
	'party.members',
	'party.invite',
	'party.kick',
	'party.promote',
	'party.leave',
	'chat.send',
	'friends.list',
	'friends.pending',
	'friends.accept',
	'friends.decline',
	'fortnite.action'
] as const;

/**
 * Named calls on the live Fortnite client. `bot.party`, `bot.party.me`, and `bot` methods send one of these.
 * Named calls on the live Fortnite client used by `bot.party` and `bot` helpers.
 */
export const FORTNITE_ACTIONS = [
	'party.privacy',
	'party.playlist',
	'party.matchKey',
	'party.squadFill',
	'party.maxSize',
	'party.hide',
	'party.join',
	'party.joinRequest',
	'member.outfit',
	'member.backpack',
	'member.pickaxe',
	'member.shoes',
	'member.sidekick',
	'member.emote',
	'member.emoji',
	'member.track',
	'member.clearEmote',
	'member.clearBackpack',
	'member.clearShoes',
	'member.clearSidekick',
	'member.ready',
	'member.sittingOut',
	'member.banner',
	'member.battlePass',
	'member.level',
	'member.stats',
	'friends.add',
	'friends.remove',
	'friends.block',
	'friends.unblock',
	'presence.set'
] as const;

export type FortniteAction = (typeof FORTNITE_ACTIONS)[number];

/** Party privacy presets for `party.setPrivacy`. */
export const PartyPrivacy = {
	PUBLIC: 'PUBLIC',
	FRIENDS_ALLOW_FRIENDS_OF_FRIENDS: 'FRIENDS_ALLOW_FRIENDS_OF_FRIENDS',
	FRIENDS: 'FRIENDS',
	PRIVATE_ALLOW_FRIENDS_OF_FRIENDS: 'PRIVATE_ALLOW_FRIENDS_OF_FRIENDS',
	PRIVATE: 'PRIVATE'
} as const;

export type SdkPartyPrivacy = (typeof PartyPrivacy)[keyof typeof PartyPrivacy];

/** Built-in playlist link ids for `party.setPlaylist`. */
export const Playlist = {
	SOLO: 'playlist_defaultsolo',
	DUO: 'playlist_defaultduo',
	TRIOS: 'playlist_trios',
	SQUAD: 'playlist_defaultsquad',
	CREATIVE: 'playlist_playgroundv2',
	LEGO: 'playlist_juno',
	ROCKET_RACING: 'playlist_delmar',
	FESTIVAL: 'playlist_sparksrhythm'
} as const;

export type SdkPlaylist = (typeof Playlist)[keyof typeof Playlist];

/** Presence online type for `bot.setStatus`. */
export const PresenceOnlineType = {
	ONLINE: 'online',
	CHAT: 'chat',
	AWAY: 'away',
	EXTENDED_AWAY: 'xa',
	DO_NOT_DISTURB: 'dnd'
} as const;

export type SdkPresence = (typeof PresenceOnlineType)[keyof typeof PresenceOnlineType];

/** One cosmetic style slot. `variantIndex` is the style index, starting at 0. */
export interface SdkCosmeticVariant {
	variantIndex: number;
}

export type SdkMethod = (typeof SDK_METHODS)[number];

/** `party` for party schema, `member` for one member's schema. */
export type SdkMetaScope = 'party' | 'member';

/** Where `chat.send` delivers a message. */
export type SdkChatChannel = 'party' | 'friend';

/** A party member summary. Cosmetic ids only. The meta schema is not included. */
export interface SdkPartyMember {
	/** Epic account id. */
	id: string;
	/** Epic display name. */
	displayName?: string;
	/** Whether this member leads the party. */
	isLeader?: boolean;
	/** Whether this member has readied up. */
	isReady?: boolean;
	/** Whether this member is sitting out. */
	isSittingOut?: boolean;
	/** Whether this member is in a match. */
	isPlaying?: boolean;
	/** Outfit cosmetic id. */
	outfit?: string;
	/** Emote, emoji, or jam track cosmetic id. */
	emote?: string;
	/** Back bling or pet carrier cosmetic id. */
	backpack?: string;
	/** Pickaxe cosmetic id. */
	pickaxe?: string;
	/** Kicks cosmetic id. */
	shoes?: string;
	/** Sidekick cosmetic id. */
	sidekick?: string;
}

/** Party id, playlist, and member summaries for one bot. */
export interface SdkPartySnapshot {
	id?: string;
	playlistId?: string;
	members: SdkPartyMember[];
}

/** A bot as reported by its shard: identity, friend count, presence, and party summary. */
export interface SdkBotSnapshot {
	id: string;
	nickname: string;
	epicId?: string;
	displayName?: string;
	parent?: string;
	flags?: number;
	ready: boolean;
	friendsCount: number;
	presenceStatus?: string;
	party?: SdkPartySnapshot;
}

/** One shard process: runtime version, whether the gateway socket is connected, and how many bots it holds. */
export interface SdkShardInfo {
	shardId: string;
	version: string;
	protocol: number;
	gatewayConnected: boolean;
	botCount: number;
}

/**
 * Text returned by `bot.runCommand`.
 *
 * `format` matches log formatting: 0 neutral, 1 success, 2 info, 3 warn, 4 error. `success` is false when the command replied with an error.
 */
export interface SdkCommandResult {
	content: string;
	format: number;
	success: boolean;
	botName?: string;
}

/** @internal */
export interface SdkHelloMessage {
	type: 'sdk:hello';
	protocol: number;
	shardId: string;
}

/** @internal */
export interface SdkRequestMessage {
	type: 'sdk:request';
	id: string;
	method: SdkMethod;
	params?: Record<string, unknown>;
}

/** @internal */
export interface SdkResponseMessage {
	type: 'sdk:response';
	id: string;
	ok: boolean;
	result?: unknown;
	error?: string;
}

/** @internal */
export interface SdkEventMessage {
	type: 'sdk:event';
	shardId: string;
	botId: string;
	name: string;
	data: unknown;
	bot?: SdkBotSnapshot;
}

/** @internal */
export type SdkParentMessage = SdkRequestMessage;

/** @internal */
export type SdkChildMessage = SdkHelloMessage | SdkResponseMessage | SdkEventMessage;

export const SDK_BRIDGE_UNAVAILABLE = 'This FNLB client does not support the SDK bridge. Update FNLB and try again.';

/** @internal */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** @internal */
export function isSdkHello(message: unknown): message is SdkHelloMessage {
	return isRecord(message) && message['type'] === 'sdk:hello' && typeof message['protocol'] === 'number';
}

/** @internal */
export function isSdkResponse(message: unknown): message is SdkResponseMessage {
	return isRecord(message) && message['type'] === 'sdk:response' && typeof message['id'] === 'string';
}

/** @internal */
export function isSdkEvent(message: unknown): message is SdkEventMessage {
	return (
		isRecord(message) &&
		message['type'] === 'sdk:event' &&
		typeof message['botId'] === 'string' &&
		typeof message['name'] === 'string'
	);
}

/** @internal */
export function isSdkRequest(message: unknown): message is SdkRequestMessage {
	return (
		isRecord(message) &&
		message['type'] === 'sdk:request' &&
		typeof message['id'] === 'string' &&
		typeof message['method'] === 'string'
	);
}
