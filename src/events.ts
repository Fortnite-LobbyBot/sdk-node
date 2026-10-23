/**
 * Names for `fnlb.on` and `fnlb.once`.
 *
 * Party and friend chat arrive as a {@link Message}. `ready` arrives as a {@link Bot}. Other events arrive as `{ bot, ...fields }`. Full party meta is not included. Call `bot.party.meta.get()` when you need it.
 *
 * @example
 * ```ts
 * fnlb.on(Events.Ready, (bot) => {
 *   console.log(bot.displayName);
 * });
 *
 * fnlb.on(Events.PartyMemberMessage, async (message) => {
 *   if (message.content === '!ping') await message.reply('pong');
 * });
 * ```
 */
export enum Events {
	/** The bot finished logging in. Listener: `(bot: Bot) => void`. */
	Ready = 'ready',
	/** The Fortnite client disconnected. Payload includes `isLogout`. */
	Disconnected = 'disconnected',
	/** An Epic friend whispered the bot. Listener receives a {@link Message} with `channel: 'friend'`. */
	FriendMessage = 'friend:message',
	/** Someone sent the bot a friend request. Payload is `{ id, displayName }`. */
	FriendRequest = 'friend:request',
	/** A friend request was accepted and the user is now on the friend list. */
	FriendAdded = 'friend:added',
	/** A user was removed from the friend list. */
	FriendRemoved = 'friend:removed',
	/** A friend came online. */
	FriendOnline = 'friend:online',
	/** A friend went offline. */
	FriendOffline = 'friend:offline',
	/** A friend's presence changed. Payload includes `status`, `isJoinable`, and `partySize`. */
	FriendPresence = 'friend:presence',
	/** The bot was invited to a party. Payload includes `partyId` and `sender`. */
	PartyInvite = 'party:invite',
	/** A friend asked to join the bot's party. Payload includes `partyId` and `sender`. */
	PartyJoinRequest = 'party:joinrequest',
	/** Someone joined the party. Payload is `{ member }` with cosmetic ids, not the full meta schema. */
	PartyMemberJoined = 'party:member:joined',
	/** Someone left the party. */
	PartyMemberLeft = 'party:member:left',
	/** Someone was kicked from the party. */
	PartyMemberKicked = 'party:member:kicked',
	/** A party member sent a chat message. Listener receives a {@link Message}. */
	PartyMemberMessage = 'party:member:message',
	/** A member was promoted to party leader. */
	PartyMemberPromoted = 'party:member:promoted',
	/** A member's party state changed. Cosmetic and matchmaking ticks use this. The payload is a member summary, not the meta schema. */
	PartyMemberUpdated = 'party:member:updated',
	/** A member changed their outfit. Payload includes `member`, `value`, and `previousValue`. */
	PartyMemberOutfitUpdated = 'party:member:outfit:updated',
	/** A member changed their emote, emoji, or jam track. */
	PartyMemberEmoteUpdated = 'party:member:emote:updated',
	/** A member changed their back bling. */
	PartyMemberBackpackUpdated = 'party:member:backpack:updated',
	/** A member changed their pickaxe. */
	PartyMemberPickaxeUpdated = 'party:member:pickaxe:updated',
	/** A member readied up or unreadied. `value` is the new boolean. */
	PartyMemberReadinessUpdated = 'party:member:readiness:updated',
	/** A member's match state changed. */
	PartyMemberMatchStateUpdated = 'party:member:matchstate:updated',
	/** The party itself changed. Payload includes `id`, `size`, and `memberIds`. */
	PartyUpdate = 'party:updated',
	/** The bot created a new party after the previous one was disbanded. */
	PartyRecreated = 'party:recreated',
	/** The bot blocked a user. */
	UserBlocked = 'user:blocked',
	/** The bot unblocked a user. */
	UserUnblocked = 'user:unblocked',
	/** A shard process announced the local SDK bridge and can take IPC calls. Listener: `(shard: Shard) => void`. */
	ShardReady = 'shardReady'
}
