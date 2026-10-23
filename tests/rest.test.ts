import { describe, expect, test } from 'bun:test';
import { ApiError, RestClient, type RestFetch } from '../src/api/RestClient';

describe('RestClient', () => {
	test('sends the token and routes account calls', async () => {
		const calls: { url: string; method: string; authorization?: string; body?: string }[] = [];
		const fetchImpl: RestFetch = async (input, init) => {
			calls.push({
				url: String(input),
				method: init?.method ?? 'GET',
				authorization: new Headers(init?.headers).get('Authorization') ?? undefined,
				body: typeof init?.body === 'string' ? init.body : undefined
			});
			const url = String(input);
			if (url.endsWith('/bots')) {
				return new Response(JSON.stringify([{ id: 'bot-1', nickname: 'Alpha', flags: 0 }]), { status: 200 });
			}
			if (url.includes('/commands/run')) {
				return new Response(JSON.stringify({ nonce: 'n', content: 'ok', format: 1 }), { status: 200 });
			}
			if (url.endsWith('/user?includeEmail=true')) {
				return new Response(JSON.stringify({ id: 'user-1', username: 'dev', email: 'dev@example.com' }), {
					status: 200
				});
			}
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		};

		const api = new RestClient({ token: 'FNLB_test', baseUrl: 'https://api.example/v1', fetchImpl });
		const user = await api.user.get({ includeEmail: true });
		const bots = await api.bots.list();
		const command = await api.bots.commands.run('bot-1', { command: 'outfit', args: ['renegade'] });

		expect(user.email).toBe('dev@example.com');
		expect(bots[0]?.nickname).toBe('Alpha');
		expect(command.content).toBe('ok');
		expect(calls.every((call) => call.authorization === 'FNLB_test')).toBe(true);
		expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
			'GET https://api.example/v1/user?includeEmail=true',
			'GET https://api.example/v1/bots',
			'POST https://api.example/v1/bots/bot-1/commands/run'
		]);
		expect(JSON.parse(calls[2]?.body ?? '{}')).toEqual({ command: 'outfit', args: ['renegade'] });
	});

	test('throws ApiError when the API rejects the call', async () => {
		const fetchImpl: RestFetch = async () => new Response(JSON.stringify({ error: 'nope' }), { status: 401 });
		const api = new RestClient({ token: 'FNLB_test', fetchImpl });
		await expect(api.categories.list()).rejects.toBeInstanceOf(ApiError);
	});
});
