import type { FortniteAction, SdkCosmeticVariant, SdkPartyPrivacy, SdkPresence } from '../ipc/protocol';
import type { Bot } from './Bot';

export async function fortniteAction(
	bot: Bot,
	action: FortniteAction,
	params: Record<string, unknown> = {}
): Promise<{ ok: true }> {
	return await bot.shard.request('fortnite.action', { botId: bot.id, action, ...params });
}

function cosmetic(id: string, variants?: SdkCosmeticVariant[], path?: string): Record<string, unknown> {
	return {
		id,
		...(variants?.length ? { variants } : {}),
		...(path ? { path } : {})
	};
}

export const loadout = {
	setOutfit: (bot: Bot, id: string, variants?: SdkCosmeticVariant[]) =>
		fortniteAction(bot, 'member.outfit', cosmetic(id, variants)),
	setBackpack: (bot: Bot, id: string, variants?: SdkCosmeticVariant[], path?: string) =>
		fortniteAction(bot, 'member.backpack', cosmetic(id, variants, path)),
	setPickaxe: (bot: Bot, id: string, variants?: SdkCosmeticVariant[], path?: string) =>
		fortniteAction(bot, 'member.pickaxe', cosmetic(id, variants, path)),
	setShoes: (bot: Bot, id: string, variants?: SdkCosmeticVariant[], path?: string) =>
		fortniteAction(bot, 'member.shoes', cosmetic(id, variants, path)),
	setSidekick: (bot: Bot, id: string, variants?: SdkCosmeticVariant[], path?: string) =>
		fortniteAction(bot, 'member.sidekick', cosmetic(id, variants, path)),
	setEmote: (bot: Bot, id: string, path?: string) =>
		fortniteAction(bot, 'member.emote', cosmetic(id, undefined, path)),
	setEmoji: (bot: Bot, id: string, path?: string) =>
		fortniteAction(bot, 'member.emoji', cosmetic(id, undefined, path)),
	setTrack: (bot: Bot, id: string, path?: string) =>
		fortniteAction(bot, 'member.track', cosmetic(id, undefined, path)),
	clearEmote: (bot: Bot) => fortniteAction(bot, 'member.clearEmote'),
	clearBackpack: (bot: Bot) => fortniteAction(bot, 'member.clearBackpack'),
	clearShoes: (bot: Bot) => fortniteAction(bot, 'member.clearShoes'),
	clearSidekick: (bot: Bot) => fortniteAction(bot, 'member.clearSidekick'),
	setReady: (bot: Bot, ready: boolean) => fortniteAction(bot, 'member.ready', { ready }),
	setSittingOut: (bot: Bot, sittingOut: boolean) => fortniteAction(bot, 'member.sittingOut', { sittingOut }),
	setBanner: (bot: Bot, bannerId: string, color: string) => fortniteAction(bot, 'member.banner', { bannerId, color }),
	setBattlePass: (bot: Bot, purchased: boolean, level: number) =>
		fortniteAction(bot, 'member.battlePass', { purchased, level }),
	setLevel: (bot: Bot, level: number) => fortniteAction(bot, 'member.level', { level }),
	setCosmeticStats: (bot: Bot, crowns: number, ranked: number) =>
		fortniteAction(bot, 'member.stats', { crowns, ranked }),
	setPrivacy: (bot: Bot, privacy: SdkPartyPrivacy) => fortniteAction(bot, 'party.privacy', { privacy }),
	setPlaylist: (bot: Bot, playlist: string, region?: string) =>
		fortniteAction(bot, 'party.playlist', { playlist, ...(region ? { region } : {}) }),
	setCustomMatchmakingKey: (bot: Bot, key = '') => fortniteAction(bot, 'party.matchKey', { key }),
	setSquadFill: (bot: Bot, fill = true) => fortniteAction(bot, 'party.squadFill', { fill }),
	setMaxSize: (bot: Bot, maxSize: number) => fortniteAction(bot, 'party.maxSize', { maxSize }),
	hideMembers: (bot: Bot, hide = true) => fortniteAction(bot, 'party.hide', { hide }),
	hideMember: (bot: Bot, targetId: string, hide = true) => fortniteAction(bot, 'party.hide', { targetId, hide }),
	join: (bot: Bot, partyId: string) => fortniteAction(bot, 'party.join', { partyId }),
	requestToJoin: (bot: Bot, targetId: string) => fortniteAction(bot, 'party.joinRequest', { targetId }),
	addFriend: (bot: Bot, targetId: string) => fortniteAction(bot, 'friends.add', { targetId }),
	removeFriend: (bot: Bot, targetId: string) => fortniteAction(bot, 'friends.remove', { targetId }),
	block: (bot: Bot, targetId: string) => fortniteAction(bot, 'friends.block', { targetId }),
	unblock: (bot: Bot, targetId: string) => fortniteAction(bot, 'friends.unblock', { targetId }),
	setStatus: (bot: Bot, status?: string, onlineType?: SdkPresence) =>
		fortniteAction(bot, 'presence.set', {
			...(status ? { status } : {}),
			...(onlineType ? { onlineType } : {})
		})
};
