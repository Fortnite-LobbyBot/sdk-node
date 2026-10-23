import type FNLB from '../classes/FNLB';
import type { Shard } from '../classes/Shard';
import type { SdkBotSnapshot, SdkCommandResult, SdkPresence } from '../ipc/protocol';
import { loadout } from './fortniteAction';
import { Party } from './Party';

/**
 * A bot running inside a shard this client spawned.
 *
 * Read it from `fnlb.bots.cache` after {@link Events.Ready}, or `await fnlb.bots.fetch(id)`. Party, chat, and commands on this object talk to that local shard. They throw if the local FNLB client does not support the SDK bridge.
 *
 * @example
 * ```ts
 * const bot = await fnlb.bots.fetch('bot-id');
 * await bot.party.meta.set('Default:CustomMatchKey_s', 'my-key');
 * const reply = await bot.runCommand('outfit', ['renegade']);
 * ```
 */
export class Bot {
	/** FNLB bot id. Same id as `api.bots.list()`. */
	public readonly id: string;
	/** Name shown for this bot in FNLB. */
	public nickname: string;
	/** Epic account id of the logged-in bot. Present after the bot is ready. */
	public epicId?: string;
	/** Epic display name. */
	public displayName?: string;
	/** Category id, when the bot belongs to one. */
	public parent?: string;
	/** Bot bitfield from the API. 1 disabled, 2 public, 4 invalid auth, 8 prepared. */
	public flags?: number;
	/** True after the Fortnite client has logged in. */
	public ready: boolean;
	/** Friends currently on the bot's Epic friend list. */
	public friendsCount: number;
	/** Last presence status string reported by Fortnite. */
	public presenceStatus?: string;
	/** Shard process that owns this bot. */
	public shard: Shard;
	/** Party the bot is in. Meta and chat calls throw until a party exists. */
	public readonly party: Party;

	/** @internal */
	public constructor(
		public readonly client: FNLB,
		shard: Shard,
		snapshot: SdkBotSnapshot
	) {
		this.shard = shard;
		this.id = snapshot.id;
		this.nickname = snapshot.nickname;
		this.ready = snapshot.ready;
		this.friendsCount = snapshot.friendsCount;
		this.party = new Party(this);
		this.apply(snapshot, shard);
	}

	/** @internal */
	public apply(snapshot: SdkBotSnapshot, shard: Shard): void {
		this.shard = shard;
		this.nickname = snapshot.nickname;
		this.epicId = snapshot.epicId;
		this.displayName = snapshot.displayName;
		this.parent = snapshot.parent;
		this.flags = snapshot.flags;
		this.ready = snapshot.ready;
		this.friendsCount = snapshot.friendsCount;
		this.presenceStatus = snapshot.presenceStatus;
		this.party.apply(snapshot.party);
	}

	/**
	 * Ask the owning shard for a fresh snapshot and update this object.
	 *
	 * @returns The same bot, with party members and presence replaced.
	 */
	public async fetch(): Promise<Bot> {
		return await this.client.bots.fetch(this.id);
	}

	/**
	 * Run a bot command on this shard, as the account owner. The command name has no prefix.
	 *
	 * This does not go through the cloud API. For a bot that is not running here, use `fnlb.api.bots.commands.run`.
	 *
	 * @param command Command id or name, such as `outfit` or `emote`.
	 * @param args Arguments after the command name.
	 * @param locale Reply language. Defaults to the bot's locale.
	 * @returns The text the command would have sent back, plus whether it succeeded.
	 * @example
	 * ```ts
	 * const reply = await bot.runCommand('outfit', ['renegade']);
	 * console.log(reply.content, reply.success);
	 * ```
	 */
	public async runCommand(command: string, args?: string | string[], locale?: string): Promise<SdkCommandResult> {
		return await this.shard.request('commands.run', {
			botId: this.id,
			command,
			...(args !== undefined ? { args } : {}),
			...(locale ? { locale } : {})
		});
	}

	/**
	 * Send a message in this bot's party chat.
	 *
	 * @param content Text to send.
	 */
	public async send(content: string): Promise<{ ok: true }> {
		return await this.party.send(content);
	}

	/**
	 * Whisper an Epic friend.
	 *
	 * @param recipientId Friend's Epic account id or display name.
	 * @param content Text to send.
	 */
	public async whisper(recipientId: string, content: string): Promise<{ ok: true }> {
		return await this.shard.request('chat.send', {
			botId: this.id,
			channel: 'friend',
			recipientId,
			content
		});
	}

	/**
	 * Friends on this bot, split into online and offline.
	 *
	 * Online entries include `isJoinable` and the current status text.
	 */
	public async friends() {
		return await this.shard.request<import('../api/types').ApiFriends>('friends.list', { botId: this.id });
	}

	/** Incoming and outgoing Epic friend requests. */
	public async pendingFriends() {
		return await this.shard.request<import('../api/types').ApiPendingFriends>('friends.pending', {
			botId: this.id
		});
	}

	/**
	 * Accept an incoming friend request.
	 *
	 * @param targetId Epic account id from `pendingFriends()`.
	 */
	public async acceptFriend(targetId: string): Promise<{ ok: true }> {
		return await this.shard.request('friends.accept', { botId: this.id, targetId });
	}

	/**
	 * Decline an incoming friend request, or cancel an outgoing one.
	 *
	 * @param targetId Epic account id from `pendingFriends()`.
	 */
	public async declineFriend(targetId: string): Promise<{ ok: true }> {
		return await this.shard.request('friends.decline', { botId: this.id, targetId });
	}

	/**
	 * Send a friend request. `targetId` is an Epic account id or display name.
	 *
	 * @param targetId Account to add.
	 */
	public async addFriend(targetId: string): Promise<{ ok: true }> {
		return await loadout.addFriend(this, targetId);
	}

	/**
	 * Remove a friend, or cancel a pending request.
	 *
	 * @param targetId Epic account id or display name.
	 */
	public async removeFriend(targetId: string): Promise<{ ok: true }> {
		return await loadout.removeFriend(this, targetId);
	}

	/**
	 * Block an Epic account.
	 *
	 * @param targetId Epic account id or display name.
	 */
	public async block(targetId: string): Promise<{ ok: true }> {
		return await loadout.block(this, targetId);
	}

	/**
	 * Unblock an Epic account that is on this bot's block list.
	 *
	 * @param targetId Epic account id or display name.
	 */
	public async unblock(targetId: string): Promise<{ ok: true }> {
		return await loadout.unblock(this, targetId);
	}

	/**
	 * Set the status friends see.
	 *
	 * @param status Status text. Omit it to keep the current text.
	 * @param onlineType Presence such as `online`, `away`, or `dnd`. See {@link PresenceOnlineType}.
	 */
	public async setStatus(status?: string, onlineType?: SdkPresence): Promise<{ ok: true }> {
		return await loadout.setStatus(this, status, onlineType);
	}

	/**
	 * Leave the current party and join another one.
	 *
	 * @param partyId Epic party id.
	 */
	public async join(partyId: string): Promise<{ ok: true }> {
		return await loadout.join(this, partyId);
	}

	/**
	 * Ask to join a friend's party. They have to accept before the bot is invited.
	 *
	 * @param targetId Friend's Epic account id or display name.
	 */
	public async requestToJoin(targetId: string): Promise<{ ok: true }> {
		return await loadout.requestToJoin(this, targetId);
	}
}
