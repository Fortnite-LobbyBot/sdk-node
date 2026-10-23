import type { SdkCosmeticVariant, SdkPartyMember } from '../ipc/protocol';
import type { Party } from './Party';
import { PartyMeta } from './PartyMeta';

/**
 * Someone in a bot's party, including the bot itself.
 *
 * `meta` reads and writes that member's schema. Only the bot's own member meta can be set. Other members are read-only.
 */
export class PartyMember {
	/** @internal */
	public constructor(
		public readonly party: Party,
		public data: SdkPartyMember
	) {}

	/** Epic account id. */
	public get id(): string {
		return this.data.id;
	}

	/** Epic display name, when Fortnite has sent one. */
	public get displayName(): string | undefined {
		return this.data.displayName;
	}

	/** True when this member is the party leader. */
	public get isLeader(): boolean | undefined {
		return this.data.isLeader;
	}

	/** True when this member has readied up. */
	public get isReady(): boolean | undefined {
		return this.data.isReady;
	}

	/** Equipped outfit cosmetic id. */
	public get outfit(): string | undefined {
		return this.data.outfit;
	}

	/** Emote, emoji, or jam track cosmetic id currently playing. */
	public get emote(): string | undefined {
		return this.data.emote;
	}

	/** Back bling or pet carrier cosmetic id. */
	public get backpack(): string | undefined {
		return this.data.backpack;
	}

	/** Pickaxe cosmetic id. */
	public get pickaxe(): string | undefined {
		return this.data.pickaxe;
	}

	/** Kicks cosmetic id. */
	public get shoes(): string | undefined {
		return this.data.shoes;
	}

	/** Sidekick cosmetic id. */
	public get sidekick(): string | undefined {
		return this.data.sidekick;
	}

	/** True when this member is sitting out. */
	public get isSittingOut(): boolean | undefined {
		return this.data.isSittingOut;
	}

	/** True when this member is in a match. */
	public get isPlaying(): boolean | undefined {
		return this.data.isPlaying;
	}

	/** This member's meta. `set` works only for the bot's own member. */
	public get meta(): PartyMeta {
		return new PartyMeta(this.party.bot, 'member', this.id);
	}

	/** Kick this member. The bot has to be party leader. */
	public async kick(): Promise<{ ok: true }> {
		return await this.party.kick(this.id);
	}

	/** Promote this member to party leader. */
	public async promote(): Promise<{ ok: true }> {
		return await this.party.promote(this.id);
	}

	/** Equip an outfit. Only the bot's own member can do this. */
	public async setOutfit(id: string, variants?: SdkCosmeticVariant[]) {
		return await this.self(() => this.party.setOutfit(id, variants));
	}

	/** Equip a back bling. Only the bot's own member can do this. */
	public async setBackpack(id: string, variants?: SdkCosmeticVariant[], path?: string) {
		return await this.self(() => this.party.setBackpack(id, variants, path));
	}

	/** Equip a pickaxe. Only the bot's own member can do this. */
	public async setPickaxe(id: string, variants?: SdkCosmeticVariant[], path?: string) {
		return await this.self(() => this.party.setPickaxe(id, variants, path));
	}

	/** Equip kicks. Only the bot's own member can do this. */
	public async setShoes(id: string, variants?: SdkCosmeticVariant[], path?: string) {
		return await this.self(() => this.party.setShoes(id, variants, path));
	}

	/** Equip a sidekick. Only the bot's own member can do this. */
	public async setSidekick(id: string, variants?: SdkCosmeticVariant[], path?: string) {
		return await this.self(() => this.party.setSidekick(id, variants, path));
	}

	/** Play an emote. Only the bot's own member can do this. */
	public async setEmote(id: string, path?: string) {
		return await this.self(() => this.party.setEmote(id, path));
	}

	/** Play an emoji. Only the bot's own member can do this. */
	public async setEmoji(id: string, path?: string) {
		return await this.self(() => this.party.setEmoji(id, path));
	}

	/** Play a jam track. Only the bot's own member can do this. */
	public async setTrack(id: string, path?: string) {
		return await this.self(() => this.party.setTrack(id, path));
	}

	/** Stop the current emote, emoji, or jam track. */
	public async clearEmote() {
		return await this.self(() => this.party.clearEmote());
	}

	/** Remove the equipped back bling. */
	public async clearBackpack() {
		return await this.self(() => this.party.clearBackpack());
	}

	/** Remove the equipped kicks. */
	public async clearShoes() {
		return await this.self(() => this.party.clearShoes());
	}

	/** Remove the equipped sidekick. */
	public async clearSidekick() {
		return await this.self(() => this.party.clearSidekick());
	}

	/** Ready up or unready. Only the bot's own member can do this. */
	public async setReady(ready: boolean) {
		return await this.self(() => this.party.setReady(ready));
	}

	/** Sit out, or join the party again. */
	public async setSittingOut(sittingOut: boolean) {
		return await this.self(() => this.party.setSittingOut(sittingOut));
	}

	/** Set this bot's banner. */
	public async setBanner(bannerId: string, color: string) {
		return await this.self(() => this.party.setBanner(bannerId, color));
	}

	/** Set the battle pass ownership and level shown for this bot. */
	public async setBattlePass(purchased: boolean, level: number) {
		return await this.self(() => this.party.setBattlePass(purchased, level));
	}

	/** Set the account level shown for this bot. */
	public async setLevel(level: number) {
		return await this.self(() => this.party.setLevel(level));
	}

	/** Set the crown count and ranked progress shown for this bot. */
	public async setCosmeticStats(crowns: number, ranked: number) {
		return await this.self(() => this.party.setCosmeticStats(crowns, ranked));
	}

	private async self<T>(run: () => Promise<T>): Promise<T> {
		const epicId = this.party.bot.epicId;
		if (epicId && epicId !== this.id) throw new Error('Only this bot can change its own member.');
		return await run();
	}
}
