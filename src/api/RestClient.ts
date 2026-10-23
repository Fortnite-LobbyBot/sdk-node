import type {
	ApiBot,
	ApiBotCreate,
	ApiBotStats,
	ApiBotUpdate,
	ApiCategory,
	ApiCategoryWrite,
	ApiCommandResult,
	ApiDeviceAuthExport,
	ApiFriends,
	ApiPendingFriends,
	ApiPreset,
	ApiUser
} from './types';

export const DEFAULT_API_BASE_URL = 'https://api.fnlb.net/v1';

export interface RestFetch {
	(input: string | URL | Request, init?: RequestInit): Promise<Response>;
}

export interface RestOptions {
	token: string;
	baseUrl?: string;
	fetchImpl?: RestFetch;
}

/** Thrown when `fnlb.api` receives a non-2xx response. `status` is the HTTP status and `body` is the parsed error payload. */
export class ApiError extends Error {
	public override readonly name = 'ApiError';

	public constructor(
		public readonly status: number,
		public readonly path: string,
		public readonly body: unknown
	) {
		super(`FNLB API ${status} ${path}`);
	}
}

type Query = Record<string, string | number | boolean | undefined>;

/**
 * HTTP client for `https://api.fnlb.net/v1`.
 *
 * Available as `fnlb.api` after `start()`. Sends the same token in the `Authorization` header. OAuth tokens still need the scope each route requires.
 *
 * Cloud `bots.commands.run` works for any bot on the account. `bot.runCommand` is only for bots running in this process, and it does not round-trip through the API.
 *
 * @example
 * ```ts
 * const bots = await fnlb.api.bots.list();
 * const me = await fnlb.api.user.get({ includeEmail: true });
 * await fnlb.api.bots.commands.run(bots[0].id, {
 *   command: 'outfit',
 *   args: ['renegade']
 * });
 * ```
 */
export class RestClient {
	/** The authenticated FNLB account. `get({ includeEmail: true })` includes the email when the token may read it. */
	public readonly user: {
		get: (query?: { includeEmail?: boolean }) => Promise<ApiUser>;
	};

	/**
	 * Bots on the account. `list` and `get` read them. `create`, `update`, and `delete` change them. `commands.run` runs a command through the cloud. `chat.send` sends the bot a chat line and waits for its reply. `friends` and `party.member` read live state from a connected bot.
	 */
	public readonly bots: {
		list: () => Promise<ApiBot[]>;
		get: (botId: string) => Promise<ApiBot>;
		create: (body: ApiBotCreate) => Promise<{ id: string; created: boolean }>;
		update: (botId: string, body: ApiBotUpdate) => Promise<{ ok: boolean }>;
		delete: (botId: string) => Promise<{ ok: boolean }>;
		stats: () => Promise<ApiBotStats>;
		bulkExport: (body: { deleteAfterExport: boolean }) => Promise<ApiDeviceAuthExport[]>;
		bulkImport: (body: {
			bots: { accountId: string; deviceId: string; secret: string; nickname?: string }[];
			parent?: string;
		}) => Promise<{ ok: boolean }>;
		commands: {
			run: (
				botId: string,
				body: { command: string; args?: string | string[]; locale?: string }
			) => Promise<ApiCommandResult>;
		};
		chat: {
			send: (botId: string, body: { content: string; locale?: string }) => Promise<ApiCommandResult>;
		};
		friends: {
			list: (botId: string) => Promise<ApiFriends>;
			pending: (botId: string) => Promise<ApiPendingFriends>;
		};
		users: {
			search: (botId: string, prefix: string) => Promise<{ id: string; displayName?: string }[]>;
			blocked: (botId: string) => Promise<{ id: string; displayName?: string }[]>;
		};
		party: {
			member: (botId: string, memberId: string) => Promise<Record<string, unknown>>;
		};
	};

	/** Categories on the account. `delete(id, { includeBots: true })` also deletes bots in that category. */
	public readonly categories: {
		list: () => Promise<ApiCategory[]>;
		get: (categoryId: string) => Promise<ApiCategory>;
		create: (body: ApiCategoryWrite) => Promise<{ id: string; ok: boolean }>;
		update: (categoryId: string, body: Partial<ApiCategoryWrite>) => Promise<{ ok: boolean }>;
		delete: (categoryId: string, query?: { includeBots?: boolean }) => Promise<{ ok: boolean }>;
	};

	/** Saved cosmetic presets. Creating and listing presets requires a VIP account, or staff. */
	public readonly presets: {
		list: () => Promise<ApiPreset[]>;
		get: (presetId: string) => Promise<ApiPreset>;
		create: (body: Record<string, unknown>) => Promise<ApiPreset | { id: string; ok?: boolean }>;
		update: (presetId: string, body: Record<string, unknown>) => Promise<ApiPreset | { ok: boolean }>;
		delete: (presetId: string) => Promise<{ ok: boolean }>;
	};

	private readonly baseUrl: string;
	private readonly fetchImpl: RestFetch;

	public constructor(private readonly options: RestOptions) {
		this.baseUrl = (options.baseUrl ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');
		this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));

		this.user = {
			get: (query) => this.request('GET', '/user', undefined, query)
		};

		this.bots = {
			list: () => this.request('GET', '/bots'),
			get: (botId) => this.request('GET', `/bots/${encodeURIComponent(botId)}`),
			create: (body) => this.request('POST', '/bots', body),
			update: (botId, body) => this.request('PATCH', `/bots/${encodeURIComponent(botId)}`, body),
			delete: (botId) => this.request('DELETE', `/bots/${encodeURIComponent(botId)}`),
			stats: () => this.request<ApiBotStats>('GET', '/bots/stats'),
			bulkExport: (body) => this.request('POST', '/bots/bulk-export', body),
			bulkImport: (body) => this.request('POST', '/bots/bulk-import', body),
			commands: {
				run: (botId, body) => this.request('POST', `/bots/${encodeURIComponent(botId)}/commands/run`, body)
			},
			chat: {
				send: (botId, body) => this.request('POST', `/bots/${encodeURIComponent(botId)}/chat/messages`, body)
			},
			friends: {
				list: (botId) => this.request('GET', `/bots/${encodeURIComponent(botId)}/friends`),
				pending: (botId) => this.request('GET', `/bots/${encodeURIComponent(botId)}/friends/pending`)
			},
			users: {
				search: (botId, prefix) =>
					this.request('GET', `/bots/${encodeURIComponent(botId)}/users/search`, undefined, { prefix }),
				blocked: (botId) => this.request('GET', `/bots/${encodeURIComponent(botId)}/users/blocked`)
			},
			party: {
				member: (botId, memberId) =>
					this.request(
						'GET',
						`/bots/${encodeURIComponent(botId)}/party/members/${encodeURIComponent(memberId)}`
					)
			}
		};

		this.categories = {
			list: () => this.request('GET', '/categories'),
			get: (categoryId) => this.request('GET', `/categories/${encodeURIComponent(categoryId)}`),
			create: (body) => this.request('POST', '/categories', body),
			update: (categoryId, body) => this.request('PATCH', `/categories/${encodeURIComponent(categoryId)}`, body),
			delete: (categoryId, query) =>
				this.request('DELETE', `/categories/${encodeURIComponent(categoryId)}`, undefined, query)
		};

		this.presets = {
			list: () => this.request('GET', '/presets'),
			get: (presetId) => this.request('GET', `/presets/${encodeURIComponent(presetId)}`),
			create: (body) => this.request('POST', '/presets', body),
			update: (presetId, body) => this.request('PATCH', `/presets/${encodeURIComponent(presetId)}`, body),
			delete: (presetId) => this.request('DELETE', `/presets/${encodeURIComponent(presetId)}`)
		};
	}

	/**
	 * Call one REST route. Throws {@link ApiError} when the status is not 2xx.
	 *
	 * @param method HTTP method.
	 * @param path Path beginning with `/`, such as `/bots`.
	 * @param body JSON body. Omit it for GET and DELETE.
	 * @param query Query string values. `undefined` entries are skipped.
	 */
	public async request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
		const url = `${this.baseUrl}${withQuery(path, query)}`;
		const headers: Record<string, string> = {
			Authorization: this.options.token,
			Accept: 'application/json'
		};
		if (body !== undefined) headers['Content-Type'] = 'application/json';

		const response = await this.fetchImpl(url, {
			method,
			headers,
			...(body !== undefined ? { body: JSON.stringify(body) } : {})
		});

		const text = await response.text();
		const parsed = text.length > 0 ? parseJson(text) : undefined;
		if (!response.ok) throw new ApiError(response.status, path, parsed);
		return parsed as T;
	}
}

function withQuery(path: string, query?: Query): string {
	if (!query) return path;
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value === undefined) continue;
		params.set(key, String(value));
	}
	const text = params.toString();
	return text.length > 0 ? `${path}?${text}` : path;
}

function parseJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}
