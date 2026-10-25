import type { SdkCosmeticVariant, SdkPartyMember, SdkPartyPrivacy, SdkPartySnapshot } from '../ipc/protocol';
import type { Bot } from './Bot';
import { Collection } from './Collection';
import { fortniteAction, loadout } from './fortniteAction';
import { PartyMember } from './PartyMember';
import { PartyMeta } from './PartyMeta';

/**
 * The Fortnite party a {@link Bot} is currently in.
 *
 * `meta` is the party schema (playlist, privacy, custom key). Cosmetic and matchmaking data lives on each member: `party.me.meta` or `member.meta`.
 *
 * `get()` with no key returns the parsed schema. Keys ending in `j` are objects, `b` are booleans, and `U` are numbers. `set()` writes one key and sends only that patch.
 */
export class Party {
	/** Epic party id. */
	public id?: string;
	/** Island or playlist link id currently selected, lowercased. */
	public playlistId?: string;
	/** Members in the party, keyed by Epic account id. Includes the bot. */
	public readonly members = new Collection<string, PartyMember>();

	/** @internal */
	public constructor(public readonly bot: Bot) {}

	/** Party-level meta. Use `me.meta` for the bot's own member meta. */
	public get meta(): PartyMeta {
		return new PartyMeta(this.bot, 'party');
	}

	/** The bot's own party member, once `bot.epicId` is known. */
	public get me(): PartyMember | undefined {
		const epicId = this.bot.epicId;
		if (!epicId) return undefined;
		return this.members.get(epicId);
	}

	/** @internal */
	public apply(snapshot?: SdkPartySnapshot): void {
		this.id = snapshot?.id;
		this.playlistId = snapshot?.playlistId;
		this.members.clear();
		for (const member of snapshot?.members ?? []) {
			this.members.set(member.id, new PartyMember(this, member));
		}
	}

	/**
	 * Reload members from the shard and replace `party.members`.
	 */
	public async fetchMembers(): Promise<Collection<string, PartyMember>> {
		const members = await fortniteAction<SdkPartyMember[]>(this.bot, 'party.members');
		this.members.clear();
		for (const member of members) this.members.set(member.id, new PartyMember(this, member));
		return this.members;
	}

	/**
	 * Send a party chat message from this bot.
	 *
	 * @param content Text to send.
	 */
	public async send(content: string): Promise<{ ok: true }> {
		return await fortniteAction(this.bot, 'chat.send', { channel: 'party', content });
	}

	/**
	 * Invite a friend into this party. The bot must already be friends with them.
	 *
	 * @param targetId Epic account id or display name.
	 */
	public async invite(targetId: string): Promise<{ ok: true }> {
		return await loadout.invite(this.bot, targetId);
	}

	/**
	 * Kick a member. The bot has to be party leader.
	 *
	 * @param targetId Epic account id or display name.
	 */
	public async kick(targetId: string): Promise<{ ok: true }> {
		return await loadout.kick(this.bot, targetId);
	}

	/**
	 * Promote a member to party leader.
	 *
	 * @param targetId Epic account id or display name.
	 */
	public async promote(targetId: string): Promise<{ ok: true }> {
		return await loadout.promote(this.bot, targetId);
	}

	/**
	 * Leave the party. By default the bot creates a new party afterwards.
	 *
	 * @param createNew When false, the bot stays without a party.
	 */
	public async leave(createNew = true): Promise<{ ok: true }> {
		return await loadout.leave(this.bot, createNew);
	}

	/**
	 * Set party privacy. The bot has to be party leader.
	 *
	 * @param privacy One of {@link PartyPrivacy}. `PUBLIC` is an open party. `PRIVATE` is invite-only.
	 */
	public async setPrivacy(privacy: SdkPartyPrivacy): Promise<{ ok: true }> {
		return await loadout.setPrivacy(this.bot, privacy);
	}

	/**
	 * Select a playlist or island. The bot has to be party leader.
	 *
	 * @param playlist Link id, such as {@link Playlist.SQUAD} or an island code.
	 * @param region Matchmaking region, such as `NAE`. Omit it to keep the current region.
	 */
	public async setPlaylist(playlist: string, region?: string): Promise<{ ok: true }> {
		return await loadout.setPlaylist(this.bot, playlist, region);
	}

	/**
	 * Set the custom matchmaking key. Pass an empty string to clear it. The bot has to be party leader.
	 *
	 * @param key Key other parties must match to land in the same game.
	 */
	public async setCustomMatchmakingKey(key = ''): Promise<{ ok: true }> {
		return await loadout.setCustomMatchmakingKey(this.bot, key);
	}

	/**
	 * Turn squad fill on or off. The bot has to be party leader.
	 *
	 * @param fill When true, the party fills with other players.
	 */
	public async setSquadFill(fill = true): Promise<{ ok: true }> {
		return await loadout.setSquadFill(this.bot, fill);
	}

	/**
	 * Set how many members the party can hold, from 1 to 16. The bot has to be party leader.
	 *
	 * @param maxSize New member cap. It has to be at least the current member count.
	 */
	public async setMaxSize(maxSize: number): Promise<{ ok: true }> {
		return await loadout.setMaxSize(this.bot, maxSize);
	}

	/**
	 * Hide every other member in the squad list, or show them again. The bot has to be party leader.
	 *
	 * @param hide When false, members are shown again.
	 */
	public async hideMembers(hide = true): Promise<{ ok: true }> {
		return await loadout.hideMembers(this.bot, hide);
	}

	/**
	 * Hide or show one member in the squad list. The bot has to be party leader.
	 *
	 * @param targetId Epic account id or display name.
	 * @param hide When false, that member is shown again.
	 */
	public async hideMember(targetId: string, hide = true): Promise<{ ok: true }> {
		return await loadout.hideMember(this.bot, targetId, hide);
	}

	/** Equip an outfit on this bot. Same as `party.me.setOutfit`. */
	public async setOutfit(id: string, variants?: SdkCosmeticVariant[]): Promise<{ ok: true }> {
		return await loadout.setOutfit(this.bot, id, variants);
	}

	/** Equip a back bling on this bot. `clearBackpack()` removes it. */
	public async setBackpack(id: string, variants?: SdkCosmeticVariant[], path?: string): Promise<{ ok: true }> {
		return await loadout.setBackpack(this.bot, id, variants, path);
	}

	/** Equip a pickaxe on this bot. */
	public async setPickaxe(id: string, variants?: SdkCosmeticVariant[], path?: string): Promise<{ ok: true }> {
		return await loadout.setPickaxe(this.bot, id, variants, path);
	}

	/** Equip kicks on this bot. */
	public async setShoes(id: string, variants?: SdkCosmeticVariant[], path?: string): Promise<{ ok: true }> {
		return await loadout.setShoes(this.bot, id, variants, path);
	}

	/** Equip a sidekick on this bot. */
	public async setSidekick(id: string, variants?: SdkCosmeticVariant[], path?: string): Promise<{ ok: true }> {
		return await loadout.setSidekick(this.bot, id, variants, path);
	}

	/** Play an emote. */
	public async setEmote(id: string, path?: string): Promise<{ ok: true }> {
		return await loadout.setEmote(this.bot, id, path);
	}

	/** Play an emoji. */
	public async setEmoji(id: string, path?: string): Promise<{ ok: true }> {
		return await loadout.setEmoji(this.bot, id, path);
	}

	/** Play a jam track. */
	public async setTrack(id: string, path?: string): Promise<{ ok: true }> {
		return await loadout.setTrack(this.bot, id, path);
	}

	/** Stop the current emote, emoji, or jam track. */
	public async clearEmote(): Promise<{ ok: true }> {
		return await loadout.clearEmote(this.bot);
	}

	/** Remove the equipped back bling. */
	public async clearBackpack(): Promise<{ ok: true }> {
		return await loadout.clearBackpack(this.bot);
	}

	/** Remove the equipped kicks. */
	public async clearShoes(): Promise<{ ok: true }> {
		return await loadout.clearShoes(this.bot);
	}

	/** Remove the equipped sidekick. */
	public async clearSidekick(): Promise<{ ok: true }> {
		return await loadout.clearSidekick(this.bot);
	}

	/**
	 * Ready up or unready.
	 *
	 * @param ready When true, the bot reads up.
	 */
	public async setReady(ready: boolean): Promise<{ ok: true }> {
		return await loadout.setReady(this.bot, ready);
	}

	/**
	 * Sit out of the party, or join it again.
	 *
	 * @param sittingOut When true, the bot sits out.
	 */
	public async setSittingOut(sittingOut: boolean): Promise<{ ok: true }> {
		return await loadout.setSittingOut(this.bot, sittingOut);
	}

	/**
	 * Set the banner shown on this bot.
	 *
	 * @param bannerId Banner icon id.
	 * @param color Banner color id.
	 */
	public async setBanner(bannerId: string, color: string): Promise<{ ok: true }> {
		return await loadout.setBanner(this.bot, bannerId, color);
	}

	/**
	 * Set battle pass ownership and level shown on this bot.
	 *
	 * @param purchased Whether the pass is owned.
	 * @param level Pass level.
	 */
	public async setBattlePass(purchased: boolean, level: number): Promise<{ ok: true }> {
		return await loadout.setBattlePass(this.bot, purchased, level);
	}

	/**
	 * Set the account level shown on this bot.
	 *
	 * @param level Account level.
	 */
	public async setLevel(level: number): Promise<{ ok: true }> {
		return await loadout.setLevel(this.bot, level);
	}

	/**
	 * Set the crown count and ranked progress shown on this bot.
	 *
	 * @param crowns Crown count.
	 * @param ranked Ranked progression value.
	 */
	public async setCosmeticStats(crowns: number, ranked: number): Promise<{ ok: true }> {
		return await loadout.setCosmeticStats(this.bot, crowns, ranked);
	}
}
