const calls = [];

process.on('message', (message) => {
	if (!message || message.type !== 'sdk:request') return;

	const { id, method, params = {} } = message;
	const bot = {
		id: 'bot-1',
		nickname: 'Alpha',
		epicId: 'epic-1',
		displayName: 'Alpha',
		ready: true,
		friendsCount: 1,
		party: {
			id: 'party-1',
			playlistId: 'playlist_defaultsolo',
			members: [
				{ id: 'epic-1', displayName: 'Alpha', isLeader: true, outfit: 'CID_001' },
				{ id: 'epic-2', displayName: 'Other', isLeader: false }
			]
		}
	};

	if (method === 'bots.list') {
		process.send({ type: 'sdk:response', id, ok: true, result: [bot] });
		return;
	}

	if (method === 'bots.get') {
		process.send({
			type: 'sdk:response',
			id,
			ok: true,
			result: params.botId === 'bot-1' ? bot : null
		});
		return;
	}

	if (method === 'commands.run') {
		process.send({
			type: 'sdk:response',
			id,
			ok: true,
			result: { content: 'outfit set', format: 1, success: true, botName: 'Alpha' }
		});
		return;
	}

	if (method === 'party.meta.get') {
		process.send({
			type: 'sdk:response',
			id,
			ok: true,
			result: params.key ? 'my-key' : { 'Default:CustomMatchKey_s': 'my-key' }
		});
		return;
	}

	if (method === 'party.meta.set') {
		process.send({ type: 'sdk:response', id, ok: true, result: params.value });
		return;
	}

	if (method === 'chat.send') {
		process.send({ type: 'sdk:response', id, ok: true, result: { ok: true } });
		return;
	}

	if (method === 'fortnite.action') {
		calls.push(params);
		process.send({ type: 'sdk:response', id, ok: true, result: { ok: true } });
		return;
	}

	if (method === 'test.calls') {
		process.send({ type: 'sdk:response', id, ok: true, result: calls });
		return;
	}

	if (method === 'shard.info') {
		process.send({
			type: 'sdk:response',
			id,
			ok: true,
			result: { shardId: process.env.SHARD_ID, version: 'test', protocol: 1, gatewayConnected: true, botCount: 1 }
		});
		return;
	}

	process.send({ type: 'sdk:response', id, ok: false, error: `Unknown method ${method}` });
});

process.send({ type: 'sdk:hello', protocol: 1, shardId: process.env.SHARD_ID });

setTimeout(() => {
	const bot = {
		id: 'bot-1',
		nickname: 'Alpha',
		epicId: 'epic-1',
		displayName: 'Alpha',
		ready: true,
		friendsCount: 1
	};
	process.send({ type: 'sdk:event', shardId: process.env.SHARD_ID, botId: 'bot-1', name: 'ready', data: {}, bot });
	process.send({
		type: 'sdk:event',
		shardId: process.env.SHARD_ID,
		botId: 'bot-1',
		name: 'party:member:message',
		data: { content: '!ping', author: { id: 'user-1', displayName: 'User' } },
		bot
	});
}, 20);
