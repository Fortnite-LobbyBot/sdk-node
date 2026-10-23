import { afterEach, describe, expect, test } from 'bun:test';
import { fork } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import FNLB, { Events, PartyPrivacy, Playlist, SDK_BRIDGE_UNAVAILABLE, type SdkMethod } from '../src/index';
import type { Bot } from '../src/structures/Bot';
import type { Message } from '../src/structures/Message';

const fixtureDir = fileURLToPath(new URL('./fixtures/', import.meta.url));
const sdkShard = resolve(fixtureDir, 'sdkShard.mjs');
const silentShard = resolve(fixtureDir, 'silentShard.mjs');

describe('local shard bridge', () => {
	let fnlb: FNLB | undefined;

	afterEach(async () => {
		await fnlb?.stop();
		fnlb = undefined;
	});

	test('caches bots, emits events, and round-trips commands and party meta', async () => {
		fnlb = new FNLB({ disableLogs: true, sdkHelloTimeoutMs: 2000 });
		const messages: Message[] = [];
		fnlb.on(Events.PartyMemberMessage, (message: Message) => {
			messages.push(message);
		});
		const ready = new Promise<Bot>((resolveBot, reject) => {
			const timer = setTimeout(() => reject(new Error('ready timed out')), 2000);
			fnlb?.once(Events.Ready, (readyBot: Bot) => {
				clearTimeout(timer);
				resolveBot(readyBot);
			});
		});

		const child = fork(sdkShard, [], {
			stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
			env: { ...process.env, SHARD_ID: 'shard-1' }
		});
		fnlb.attachShard('shard-1', child);

		const bot = await ready;

		expect(bot.id).toBe('bot-1');
		expect(bot.displayName).toBe('Alpha');
		expect(fnlb.bots.cache.get('bot-1')?.id).toBe('bot-1');

		await new Promise((resolveWait) => setTimeout(resolveWait, 50));
		expect(messages[0]?.content).toBe('!ping');
		await messages[0]?.reply('pong');

		const refreshed = await bot.fetch();
		expect(refreshed.party.id).toBe('party-1');
		expect(await refreshed.party.meta.get()).toEqual({ 'Default:CustomMatchKey_s': 'my-key' });
		expect(await refreshed.party.meta.set('Default:CustomMatchKey_s', 'my-key')).toBe('my-key');
		expect(await refreshed.runCommand('outfit', ['renegade'])).toMatchObject({
			content: 'outfit set',
			success: true
		});
	});

	test('sends lobby, cosmetic, and friend calls across the shard bridge', async () => {
		fnlb = new FNLB({ disableLogs: true, sdkHelloTimeoutMs: 2000 });
		const ready = new Promise<Bot>((resolveBot, reject) => {
			const timer = setTimeout(() => reject(new Error('ready timed out')), 2000);
			fnlb?.once(Events.Ready, (readyBot: Bot) => {
				clearTimeout(timer);
				resolveBot(readyBot);
			});
		});

		const child = fork(sdkShard, [], {
			stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
			env: { ...process.env, SHARD_ID: 'shard-1' }
		});
		fnlb.attachShard('shard-1', child);
		const bot = await ready;
		await bot.fetch();

		await bot.party.setPrivacy(PartyPrivacy.PRIVATE);
		await bot.party.setPlaylist(Playlist.SQUAD, 'NAE');
		await bot.party.setCustomMatchmakingKey('my-key');
		await bot.party.setSquadFill(false);
		await bot.party.setMaxSize(4);
		await bot.party.hideMember('epic-2', true);
		await bot.party.me?.setOutfit('CID_028_Athena_Commando_F', [{ variantIndex: 1 }]);
		await bot.party.setEmote('EID_Wave');
		await bot.party.clearEmote();
		await bot.party.setReady(true);
		await bot.party.setBanner('OtherBanner', 'DefaultColor');
		await bot.addFriend('FriendName');
		await bot.block('epic-9');
		await bot.setStatus('Lobby bot', 'away');
		await bot.join('party-2');
		await bot.requestToJoin('epic-3');

		const other = bot.party.members.get('epic-2');
		await expect(other?.setOutfit('CID_001')).rejects.toThrow('Only this bot can change its own member.');

		const calls = await bot.shard.request<Array<Record<string, unknown>>>('test.calls' as SdkMethod);
		expect(calls.map((call) => call['action'])).toEqual([
			'party.privacy',
			'party.playlist',
			'party.matchKey',
			'party.squadFill',
			'party.maxSize',
			'party.hide',
			'member.outfit',
			'member.emote',
			'member.clearEmote',
			'member.ready',
			'member.banner',
			'friends.add',
			'friends.block',
			'presence.set',
			'party.join',
			'party.joinRequest'
		]);
		expect(calls[0]).toMatchObject({ privacy: 'PRIVATE', botId: 'bot-1' });
		expect(calls[1]).toMatchObject({ playlist: 'playlist_defaultsquad', region: 'NAE' });
		expect(calls[6]).toMatchObject({
			id: 'CID_028_Athena_Commando_F',
			variants: [{ variantIndex: 1 }]
		});
		expect(calls[13]).toMatchObject({ status: 'Lobby bot', onlineType: 'away' });
		expect(calls.some((call) => call['action'] === 'member.outfit' && call['id'] === 'CID_001')).toBe(false);
	});

	test('fails local calls when the shard never says hello', async () => {
		fnlb = new FNLB({ disableLogs: true, sdkHelloTimeoutMs: 200 });
		const child = fork(silentShard, [], {
			stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
			env: { ...process.env, SHARD_ID: 'silent' }
		});
		const shard = fnlb.attachShard('silent', child);
		await expect(shard.request('shard.info')).rejects.toThrow(SDK_BRIDGE_UNAVAILABLE);
	});
});
