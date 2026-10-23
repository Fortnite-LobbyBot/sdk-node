import type { ICategoryConfig } from '@fnlb-project/shared/types';

/** A linked Discord, Google, or Epic account on the FNLB user. */
export interface ApiLinkedAccount {
	/** Id of the account on that service. */
	id?: string;
	/** Username on that service. */
	username?: string;
	/** Whether FNLB has verified the link. */
	verified: boolean;
}

/** The authenticated FNLB account. */
export interface ApiUser {
	/** FNLB account id. */
	id: string;
	/** FNLB username. */
	username: string;
	/** Present when `user.get({ includeEmail: true })` is allowed for this token. */
	email?: string;
	/** Account role bitfield. 1 staff, 2 admin, 4 VIP, 8 verified, 16 banned. */
	flags?: number;
	/** Linked Discord, Google, and Epic accounts. OAuth tokens need the `connections` scope. */
	connections?: {
		discord?: ApiLinkedAccount;
		google?: ApiLinkedAccount;
		epic?: ApiLinkedAccount;
	};
}

/** A bot owned by the authenticated account. */
export interface ApiBot {
	/** Bot id. Pass this to `fnlb.bots.fetch` and to `api.bots.commands.run`. */
	id: string;
	/** Name shown in FNLB. */
	nickname: string;
	/** Epic email stored with the bot, when one was saved. */
	email?: string;
	/** Category id, when the bot belongs to one. */
	parent?: string;
	/** Bitfield. 1 disabled, 2 public, 4 invalid auth, 8 prepared. */
	flags: number;
}

/** Body for `api.bots.create`. `deviceAuth` is the Epic device auth used to log the bot in. */
export interface ApiBotCreate {
	/** Name shown in FNLB. 1–16 characters. */
	nickname: string;
	/** Epic device auth. All three values are required. */
	deviceAuth: {
		/** Epic account id. */
		accountId: string;
		/** Epic device id. */
		deviceId: string;
		/** Epic device auth secret. */
		secret: string;
	};
	/** Epic email to store with the bot. */
	email?: string;
	/** Category id this bot should belong to. */
	parent?: string;
}

/** Fields accepted by `api.bots.update`. `parent: null` removes the bot from its category. */
export interface ApiBotUpdate {
	/** New display name. */
	nickname?: string;
	/** Replacement Epic email. */
	email?: string;
	/** Category id. `null` removes the bot from its category. */
	parent?: string | null;
	/** When true, the bot is marked disabled and will not run. */
	disabled?: boolean;
	/** Replacement Epic device auth. All three values are required together. */
	deviceAuth?: ApiBotCreate['deviceAuth'];
}

/** A category owned by the account, including its config. */
export interface ApiCategory {
	/** Category id. Pass this to `start({ categories })`. */
	id: string;
	/** Name shown in FNLB. */
	name: string;
	/** Category bitfield. 1 means disabled. */
	flags?: number;
	/** Lobby behavior: privacy, cosmetics, commands, triggers, and similar settings. */
	config?: Partial<ICategoryConfig>;
}

/** Body for creating a category. `disabled` keeps the category from running bots. */
export interface ApiCategoryWrite {
	/** Name shown in FNLB. */
	name: string;
	/** When true, bots in this category do not run. */
	disabled?: boolean;
	/** Initial lobby settings. Omitted keys use the defaults. */
	config?: Partial<ICategoryConfig>;
}

/** A saved cosmetic preset. Extra keys are the equipped cosmetic ids and variants. */
export interface ApiPreset {
	/** Preset id. */
	id: string;
	/** Name shown in the preset list. */
	name?: string;
	/** Cosmetic slots and variants stored on the preset. */
	[key: string]: unknown;
}

/** Reply from `api.bots.commands.run` or `api.bots.chat.send`. */
export interface ApiCommandResult {
	/** Id of this reply. */
	nonce: string;
	/** Display name of the bot that replied. */
	botName?: string;
	/** Text the bot replied with. */
	content?: string;
	/** How to show the reply. 0 neutral, 1 success, 2 info, 3 warn, 4 error. */
	format: number;
}

/** An Epic friend, or a pending friend request. */
export interface ApiFriend {
	/** Epic account id. */
	id: string;
	/** Epic display name. */
	displayName?: string;
}

/** A friend who is currently online. */
export interface ApiOnlineFriend extends ApiFriend {
	/** Whether the bot can join this friend's party right now. */
	isJoinable: boolean;
	/** Custom status, or "Playing Fortnite" when they have none. */
	status?: string;
}

/** Online and offline friends of a connected bot. */
export interface ApiFriends {
	/** Friends who are online. */
	onlineFriends: ApiOnlineFriend[];
	/** Friends who are offline. */
	offlineFriends: ApiFriend[];
}

/** Incoming and outgoing friend requests for a connected bot. */
export interface ApiPendingFriends {
	/** Requests waiting for this bot to accept. */
	incomingFriends: ApiFriend[];
	/** Requests this bot sent that are still waiting. */
	outgoingFriends: ApiFriend[];
}

/** Counts for public bots or VIP bots on the network. */
export interface ApiBotGroupStats {
	/** Bots in this group. */
	total: number;
	/** Bots that are online. */
	connected: number;
	/** Bots that can be joined. */
	available: number;
	/** Bots that are in use. */
	busy: number;
	/** Matches these bots have played. */
	matches: number;
	/** Bots that are free to join. */
	availableBots: unknown[];
}

/** Global public and VIP bot counts from `api.bots.stats()`. */
export interface ApiBotStats {
	/** Counts for public bots. */
	public: ApiBotGroupStats;
	/** Counts for VIP bots. */
	vip: ApiBotGroupStats;
}

/** One device auth returned by `api.bots.bulkExport`. The secret is the raw Epic secret. */
export interface ApiDeviceAuthExport {
	/** Epic account id. */
	accountId: string;
	/** Epic device id. */
	deviceId: string;
	/** Epic device auth secret. */
	secret: string;
	/** Name shown in FNLB. */
	nickname: string;
}
