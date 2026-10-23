import { type ChildProcess, fork } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { resolve as pathResolve } from 'node:path';
import type { ICategoryConfig } from '@fnlb-project/shared/types';
import { AutoUpdater, FNLB_RELEASE_PUBLIC_KEYS, FNLB_TRUSTED_DOWNLOAD_ORIGIN } from '@fnlb-project/shared/updater';
import { RestClient } from '../api/RestClient';
import { Events } from '../events';
import type { SdkEventMessage, SdkMethod } from '../ipc/protocol';
import { isRecord } from '../ipc/protocol';
import { BotManager } from '../managers/BotManager';
import { Collection } from '../structures/Collection';
import { Message } from '../structures/Message';
import type { FNLBConfig } from '../types/FNLBConfig';
import { LogsMessageFormat } from '../types/LogsMessage';
import type { CategoryConfigOverrides, StartConfig } from '../types/StartConfig';
import { type BroadcastResult, Shard } from './Shard';
import { Util } from './Util';

const RELEASE_CHANNELS = ['stable', 'beta', 'dev'] as const;
const RELEASE_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

type SelectionState = {
	categories?: string[];
	bots?: string[];
};

type SelectionSetMessage = {
	type: 'selection:set';
	categories?: string[];
	bots?: string[];
	overrideCategoryConfig?: CategoryConfigOverrides;
};

const normalizeIds = (ids: string[]): string[] => [
	...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))
];

const cloneOverrides = (value?: CategoryConfigOverrides): CategoryConfigOverrides | undefined => {
	if (!value) return undefined;
	const next: CategoryConfigOverrides = {};
	if (value.all) next.all = { ...value.all };
	if (value.categories) next.categories = { ...value.categories };
	if (value.bots) next.bots = { ...value.bots };
	return next.all || next.categories || next.bots ? next : undefined;
};

const mergeOverridesForIds = (
	map: Record<string, Partial<ICategoryConfig>> | undefined,
	ids: string[],
	override: Partial<ICategoryConfig>
): Record<string, Partial<ICategoryConfig>> => {
	const next = { ...(map ?? {}) };
	for (const id of ids) {
		next[id] = { ...(next[id] ?? {}), ...override };
	}
	return next;
};

const omitOverrideKeys = (
	map: Record<string, Partial<ICategoryConfig>> | undefined,
	ids: string[]
): Record<string, Partial<ICategoryConfig>> | undefined => {
	if (!map) return undefined;
	const remove = new Set(ids);
	const next: Record<string, Partial<ICategoryConfig>> = {};
	for (const [id, value] of Object.entries(map)) {
		if (!remove.has(id)) next[id] = value;
	}
	return Object.keys(next).length > 0 ? next : undefined;
};

/**
 * Self-hosted FNLB client.
 *
 * `start()` downloads the FNLB client (shard runtime) and forks one process per shard. Those processes log the bots into Fortnite and push events back over local IPC. Listen with `fnlb.on(Events.PartyMemberMessage, ...)`.
 *
 * `fnlb.bots` is the bots running in this process. `fnlb.api` calls `https://api.fnlb.net` for the same account, including bots that are not running here.
 *
 * @example
 * ```ts
 * import FNLB, { Events } from 'fnlb';
 *
 * const fnlb = new FNLB({ clusterName: 'dev' });
 *
 * fnlb.on(Events.PartyMemberMessage, async (message) => {
 *   if (message.content === '!ping') await message.reply('pong');
 * });
 *
 * await fnlb.start({
 *   token: 'FNLB_...',
 *   categories: ['category-id']
 * });
 * ```
 */
export class FNLB extends EventEmitter {
	private readonly config?: FNLBConfig;
	private readonly activeProcesses: Map<string, ReturnType<typeof fork>> = new Map();
	/** Shard processes spawned by `start()`. Each shard runs up to `botsPerShard` bots. */
	public readonly shards = new Collection<string, Shard>();
	/** Bots currently running in those shards. Empty until a bot emits {@link Events.Ready}. */
	public readonly bots: BotManager;
	private restClient?: RestClient;
	private readonly packageName = `${process.versions['bun'] ? 'zenith-bun' : 'zenith'}`;
	private readonly fnlbDir: string;
	private updater!: AutoUpdater;
	private lastChannel?: string;
	private lastOverrideVersion?: string;
	private selection: SelectionState = {};
	private categoryConfigOverrides?: CategoryConfigOverrides;
	private lastStartConfig?: StartConfig;

	private shouldRestart = true;
	private runId = 0;

	/**
	 * @param config Cluster name, log callbacks, and where the downloaded shard runtime is stored.
	 */
	public constructor(config?: FNLBConfig) {
		super();
		this.config = config;
		this.bots = new BotManager(this);
		this.fnlbDir = config?.fnlbPath ? pathResolve(config?.fnlbPath, '.fnlb') : pathResolve(process.cwd(), '.fnlb');
		this.setupUpdater(config?.channel ?? 'stable', config?.overrideVersion);
	}

	private setupUpdater(channel: string, overrideVersion?: string) {
		if (!RELEASE_CHANNELS.includes(channel as (typeof RELEASE_CHANNELS)[number])) {
			throw new Error(`Invalid release channel "${channel}". Expected one of: ${RELEASE_CHANNELS.join(', ')}.`);
		}

		const normalizedOverrideVersion = overrideVersion?.trim();
		if (normalizedOverrideVersion && !RELEASE_VERSION_PATTERN.test(normalizedOverrideVersion)) {
			throw new Error(
				`Invalid release version "${overrideVersion}". Expected a semantic version such as 2.0.217-xmms.`
			);
		}

		const versionQuery = normalizedOverrideVersion
			? `&version=${encodeURIComponent(normalizedOverrideVersion)}`
			: '';

		this.updater = new AutoUpdater({
			storageDir: this.fnlbDir,
			targetFileName: `${this.packageName}.mjs`,
			displayName: 'FNLB',
			releaseUrl: `https://dist.fnlb.net/packages/${this.packageName}/release?channel=${encodeURIComponent(channel)}${versionQuery}`,
			currentVersion: normalizedOverrideVersion,
			releasePublicKeys: FNLB_RELEASE_PUBLIC_KEYS,
			trustedDownloadOrigin: FNLB_TRUSTED_DOWNLOAD_ORIGIN,
			maxDownloadRetries: this.config?.maxDownloadRetries ?? Infinity,
			maxBackoffMs: this.config?.maxBackoffMs ?? 60_000,
			staleMs: this.config?.updateIntervalMs ?? 3_600_000,
			log: (...m) => this.log(...m),
			success: (...m) => this.success(...m),
			warn: (...m) => this.warn(...m),
			error: (...m) => this.error(...m)
		});
		this.lastChannel = channel;
		this.lastOverrideVersion = normalizedOverrideVersion;
	}

	/**
	 * Download the shard runtime if needed, fork the shards, and open the HTTP client with this token.
	 *
	 * Calling `start()` again stops the shards from the previous call first.
	 *
	 * @param config Token plus which categories or bot ids to run, and how to split them across shards.
	 * @returns Resolves when every shard process has been spawned. Bots are ready later, on {@link Events.Ready}.
	 * @example
	 * ```ts
	 * await fnlb.start({
	 *   token: 'FNLB_...',
	 *   categories: ['category-id'],
	 *   numberOfShards: 2,
	 *   botsPerShard: 10
	 * });
	 * ```
	 */
	public async start(config: StartConfig) {
		await this.stop();
		this.shouldRestart = true;
		this.runId++;
		const currentRunId = this.runId;

		const authToken = this.resolveAuthToken(config);
		if (!authToken) throw new Error('[FNLB ShardingManager] Please provide an auth token.');
		this.restClient = new RestClient({
			token: authToken,
			...(this.config?.apiBaseUrl ? { baseUrl: this.config.apiBaseUrl } : {})
		});

		const channel = config.channel ?? this.config?.channel ?? 'stable';
		const overrideVersion = config.overrideVersion ?? this.config?.overrideVersion;
		if (channel !== this.lastChannel || overrideVersion !== this.lastOverrideVersion) {
			this.setupUpdater(channel, overrideVersion);
			await this.update(true);
		} else {
			await this.update();
		}

		this.selection = {
			categories: config.categories?.length ? normalizeIds(config.categories) : undefined,
			bots: config.bots?.length ? normalizeIds(config.bots) : undefined
		};
		this.categoryConfigOverrides = cloneOverrides(config.overrideCategoryConfig);
		this.lastStartConfig = {
			...config,
			categories: this.selection.categories,
			bots: this.selection.bots,
			overrideCategoryConfig: this.categoryConfigOverrides
		};

		const numberOfShards = config.numberOfShards ?? 1;
		const prefix = (~~(Math.random() * 10000)).toString(36) + 'fnlb' + (~~(Date.now() / 1000)).toString(36);

		for (let i = 0; i < numberOfShards; i++) {
			const id = `${prefix}-${i.toString().padStart(2, '0')}`;
			const processInstance = await this.startShard(this.lastStartConfig, id, currentRunId, authToken);
			this.activeProcesses.set(id, processInstance);
		}
	}

	/**
	 * HTTP API for the account that called `start()`. Throws if `start()` has not been called.
	 *
	 * Use this for bots that are not running in this process. Use `bot.runCommand` for bots in `fnlb.bots`.
	 */
	public get api(): RestClient {
		if (!this.restClient) {
			throw new Error('[FNLB] Call start() before using the API client.');
		}
		return this.restClient;
	}

	/**
	 * Send one local IPC call to every running shard. A shard that fails is returned with `ok: false` instead of rejecting the whole call.
	 *
	 * @param method Bridge method, such as `bots.list` or `shard.info`.
	 * @param params Arguments for that method. Bot methods also need `botId`.
	 */
	public async broadcast<T>(method: SdkMethod, params: Record<string, unknown> = {}): Promise<BroadcastResult<T>[]> {
		if (this.shards.size === 0) {
			throw new Error('[FNLB ShardingManager] No shards are running. Call start() first.');
		}

		return await Promise.all(
			[...this.shards.values()].map(async (shard) => {
				try {
					const result = await shard.request<T>(method, params);
					return { shardId: shard.id, ok: true, result };
				} catch (error) {
					return {
						shardId: shard.id,
						ok: false,
						error: error instanceof Error ? error.message : String(error)
					};
				}
			})
		);
	}

	/**
	 * Version, gateway connection, and bot count for each shard this client spawned.
	 */
	public async fetchShardInfo() {
		return await this.broadcast<import('../ipc/protocol').SdkShardInfo>('shard.info');
	}

	/** @internal */
	public attachShard(id: string, child: ChildProcess): Shard {
		const existing = this.shards.get(id);
		existing?.dispose('Shard replaced.');

		const shard = new Shard(this, id, child, this.config?.sdkHelloTimeoutMs ?? 15_000);
		this.shards.set(id, shard);
		this.activeProcesses.set(id, child);
		child.on('message', (message: unknown) => {
			shard.handleMessage(message);
		});
		return shard;
	}

	/** @internal */
	public handleShardHello(shard: Shard): void {
		this.emit(Events.ShardReady, shard);
	}

	/** @internal */
	public handleSdkEvent(shard: Shard, event: SdkEventMessage): void {
		const bot = event.bot ? this.bots.upsert(shard, event.bot) : this.bots.placeholder(shard, event.botId);
		const data = isRecord(event.data) ? event.data : {};

		if (event.name === Events.Ready) {
			bot.ready = true;
			this.emit(Events.Ready, bot);
			return;
		}

		if (event.name === Events.PartyMemberMessage || event.name === Events.FriendMessage) {
			const author = isRecord(data['author']) ? data['author'] : {};
			const message = new Message(
				bot,
				event.name === Events.FriendMessage ? 'friend' : 'party',
				typeof data['content'] === 'string' ? data['content'] : '',
				{
					id: typeof author['id'] === 'string' ? author['id'] : '',
					...(typeof author['displayName'] === 'string' ? { displayName: author['displayName'] } : {})
				}
			);
			this.emit(event.name, message);
			return;
		}

		if (event.name === Events.Disconnected) {
			bot.ready = false;
			this.emit(Events.Disconnected, { bot, isLogout: data['isLogout'] === true });
			return;
		}

		this.emit(event.name, { bot, ...data });
	}

	/**
	 * Stop every shard this client started and clear `fnlb.bots`. The HTTP client stays usable.
	 */
	public async stop() {
		this.shouldRestart = false;
		this.runId++;

		for (const shard of this.shards.values()) shard.dispose('Shard stopped.');
		this.shards.clear();
		this.bots.clear();

		if (this.activeProcesses.size === 0) return;

		this.log('Stopping all active shards...');

		for (const [id, ps] of this.activeProcesses) {
			this.log(`Stopping shard with ID: ${id}`);
			ps.kill();
		}

		this.activeProcesses.clear();

		this.log('All shards stopped.');
	}

	/**
	 * Category ids the running shards may use. `undefined` means every category on the account.
	 */
	public getCategories(): string[] | undefined {
		return this.selection.categories ? [...this.selection.categories] : undefined;
	}

	/**
	 * Bot ids the running shards may use. `undefined` means bots are not filtered by id.
	 */
	public getBots(): string[] | undefined {
		return this.selection.bots ? [...this.selection.bots] : undefined;
	}

	/**
	 * Add category ids to the running include list without restarting shards. Bots that no longer match are stopped and replaced from the new pool.
	 *
	 * @param ids Category ids from the bot page or `api.categories.list()`.
	 * @param override Category settings applied only to these ids for this process.
	 */
	public addCategories(ids: string[], override?: Partial<ICategoryConfig>) {
		this.assertRunning();
		const toAdd = normalizeIds(ids);
		if (toAdd.length === 0) return;

		this.selection.categories = this.selection.categories
			? normalizeIds([...this.selection.categories, ...toAdd])
			: toAdd;

		if (override) {
			this.categoryConfigOverrides = {
				...(this.categoryConfigOverrides ?? {}),
				categories: mergeOverridesForIds(this.categoryConfigOverrides?.categories, toAdd, override)
			};
		}

		this.syncSelectionToStartConfig();
		this.broadcastSelection();
	}

	/**
	 * Remove category ids from the running include list. Removing the last id makes categories unrestricted again.
	 *
	 * @param ids Category ids to drop.
	 */
	public removeCategories(ids: string[]) {
		this.assertRunning();
		if (!this.selection.categories) return;

		const toRemove = normalizeIds(ids);
		if (toRemove.length === 0) return;

		const removeSet = new Set(toRemove);
		const next = this.selection.categories.filter((id) => !removeSet.has(id));
		this.selection.categories = next.length > 0 ? next : undefined;
		this.categoryConfigOverrides = {
			...(this.categoryConfigOverrides ?? {}),
			categories: omitOverrideKeys(this.categoryConfigOverrides?.categories, toRemove)
		};
		if (
			!this.categoryConfigOverrides.all &&
			!this.categoryConfigOverrides.categories &&
			!this.categoryConfigOverrides.bots
		) {
			this.categoryConfigOverrides = undefined;
		}

		this.syncSelectionToStartConfig();
		this.broadcastSelection();
	}

	/**
	 * Replace the category include list. Omit `ids` to allow every category on the account.
	 *
	 * @param ids Category ids to keep, or omit to clear the filter.
	 * @param override Category settings applied to every id in the new list.
	 */
	public setCategories(ids?: string[], override?: Partial<ICategoryConfig>) {
		this.assertRunning();
		const next = ids?.length ? normalizeIds(ids) : undefined;
		const previous = this.selection.categories ?? [];
		this.selection.categories = next;

		if (next) {
			const keep = new Set(next);
			const removed = previous.filter((id) => !keep.has(id));
			let categoriesMap = omitOverrideKeys(this.categoryConfigOverrides?.categories, removed);
			if (override) categoriesMap = mergeOverridesForIds(categoriesMap, next, override);
			this.categoryConfigOverrides = {
				...(this.categoryConfigOverrides ?? {}),
				categories: categoriesMap
			};
		} else if (override) {
			this.warn(
				'setCategories(undefined, override) ignored override; unrestricted categories have no id targets.'
			);
		}

		if (
			this.categoryConfigOverrides &&
			!this.categoryConfigOverrides.all &&
			!this.categoryConfigOverrides.categories &&
			!this.categoryConfigOverrides.bots
		) {
			this.categoryConfigOverrides = undefined;
		}

		this.syncSelectionToStartConfig();
		this.broadcastSelection();
	}

	/**
	 * Add bot ids to the running include list. The gateway still assigns each id to only one shard.
	 *
	 * @param ids Bot ids from the bot page or `api.bots.list()`.
	 * @param override Category settings applied only to these bots for this process.
	 */
	public addBots(ids: string[], override?: Partial<ICategoryConfig>) {
		this.assertRunning();
		const toAdd = normalizeIds(ids);
		if (toAdd.length === 0) return;

		this.selection.bots = this.selection.bots ? normalizeIds([...this.selection.bots, ...toAdd]) : toAdd;

		if (override) {
			this.categoryConfigOverrides = {
				...(this.categoryConfigOverrides ?? {}),
				bots: mergeOverridesForIds(this.categoryConfigOverrides?.bots, toAdd, override)
			};
		}

		this.syncSelectionToStartConfig();
		this.broadcastSelection();
	}

	/**
	 * Remove bot ids from the running include list. Removing the last id clears the bot filter.
	 *
	 * @param ids Bot ids to drop.
	 */
	public removeBots(ids: string[]) {
		this.assertRunning();
		if (!this.selection.bots) return;

		const toRemove = normalizeIds(ids);
		if (toRemove.length === 0) return;

		const removeSet = new Set(toRemove);
		const next = this.selection.bots.filter((id) => !removeSet.has(id));
		this.selection.bots = next.length > 0 ? next : undefined;
		this.categoryConfigOverrides = {
			...(this.categoryConfigOverrides ?? {}),
			bots: omitOverrideKeys(this.categoryConfigOverrides?.bots, toRemove)
		};
		if (
			!this.categoryConfigOverrides.all &&
			!this.categoryConfigOverrides.categories &&
			!this.categoryConfigOverrides.bots
		) {
			this.categoryConfigOverrides = undefined;
		}

		this.syncSelectionToStartConfig();
		this.broadcastSelection();
	}

	/**
	 * Replace the bot include list. Omit `ids` to stop filtering by bot id.
	 *
	 * @param ids Bot ids to keep, or omit to clear the filter.
	 * @param override Category settings applied to every id in the new list.
	 */
	public setBots(ids?: string[], override?: Partial<ICategoryConfig>) {
		this.assertRunning();
		const next = ids?.length ? normalizeIds(ids) : undefined;
		const previous = this.selection.bots ?? [];
		this.selection.bots = next;

		if (next) {
			const keep = new Set(next);
			const removed = previous.filter((id) => !keep.has(id));
			let botsMap = omitOverrideKeys(this.categoryConfigOverrides?.bots, removed);
			if (override) botsMap = mergeOverridesForIds(botsMap, next, override);
			this.categoryConfigOverrides = {
				...(this.categoryConfigOverrides ?? {}),
				bots: botsMap
			};
		} else if (override) {
			this.warn('setBots(undefined, override) ignored override; unrestricted bots have no id targets.');
		}

		if (
			this.categoryConfigOverrides &&
			!this.categoryConfigOverrides.all &&
			!this.categoryConfigOverrides.categories &&
			!this.categoryConfigOverrides.bots
		) {
			this.categoryConfigOverrides = undefined;
		}

		this.syncSelectionToStartConfig();
		this.broadcastSelection();
	}

	/** @internal */
	public async startShard(config: StartConfig, id: string, currentRunId: number, authToken?: string) {
		const resolvedAuthToken = authToken ?? this.resolveAuthToken(config);
		if (!resolvedAuthToken || resolvedAuthToken.length < 10) {
			throw new Error('[FNLB ShardingManager] Please provide a valid auth token.');
		}

		const channel = config.channel ?? this.config?.channel ?? 'stable';
		const overrideVersion = config.overrideVersion ?? this.config?.overrideVersion;
		const categories = this.selection.categories ?? config.categories;
		const bots = this.selection.bots ?? config.bots;
		const overrideCategoryConfig = this.categoryConfigOverrides ?? config.overrideCategoryConfig;

		this.log('Starting shard with ID:', id);

		const ps = fork(pathResolve(this.fnlbDir, `${this.packageName}.mjs`), [], {
			env: {
				...process.env,
				FORCE_COLOR: '1',
				SHARD_ID: id,
				API_TOKEN: resolvedAuthToken,
				...(categories?.length ? { CATEGORIES: categories.join(',') } : {}),
				...(bots?.length ? { BOTS: bots.join(',') } : {}),
				BOTS_PER_SHARD: (config.botsPerShard ?? 1).toString(),
				HIDE_USERNAMES: config.hideUsernames ? 'true' : 'false',
				HIDE_EMAILS: config.hideEmails ? 'true' : 'false',
				LOG_LEVEL: config.logLevel,
				CHANNEL: channel,
				...(overrideVersion ? { OVERRIDE_VERSION: overrideVersion } : {}),
				...(overrideCategoryConfig ? { OVERRIDE_CATEGORY_CONFIG: JSON.stringify(overrideCategoryConfig) } : {}),
				CLUSTER_ID:
					this.config?.clusterName
						?.trim()
						.replace(/ +(?= )/g, '')
						.toLowerCase()
						.replaceAll(' ', '-') ?? 'unknown',
				CLUSTER_NAME: this.config?.clusterName?.trim(),
				FNLB_DIR: this.fnlbDir,
				...config.extraEnv,
				SDK_BRIDGE: '1'
			},
			stdio: ['inherit', 'pipe', 'pipe', 'ipc']
		});

		if (!this.config?.disableSubProcessLogs)
			ps.stdout?.on('data', (data) => {
				const log = data.toString('utf8');
				process.stdout.write(log);
				this.config?.onSubProcessLogMessage?.({
					timestamp: Date.now(),
					content: log,
					format: LogsMessageFormat.Neutral
				});
			});

		if (!this.config?.disableSubProcessErrorLogs)
			ps.stderr?.on('data', (data) => {
				const log = data.toString('utf8');
				process.stderr.write(log);
				this.config?.onSubProcessLogMessage?.({
					timestamp: Date.now(),
					content: log,
					format: LogsMessageFormat.Error
				});
			});

		const shard = this.attachShard(id, ps);

		ps.on('close', async (code) => {
			shard.dispose('Shard stopped.');
			this.shards.delete(id);
			this.activeProcesses.delete(id);
			if (this.shouldRestart && currentRunId === this.runId) {
				if (code === 0) {
					this.warn('Shard exited with code:', code);
				} else {
					this.error('Shard exited with code:', code?.toString() ?? 'none');
				}

				this.log('Trying to restart shard...');

				await this.update(true);
				await Util.wait(10_000);
				const restartConfig = this.lastStartConfig ?? config;
				const restartedProcess = await this.startShard(restartConfig, id, currentRunId, resolvedAuthToken);
				this.activeProcesses.set(id, restartedProcess);
			} else {
				this.log(`Shard ${id} stopped.`);
			}
		});

		return ps;
	}

	/**
	 * Download a newer shard runtime if the current channel has one. `start()` already does this.
	 *
	 * @param force Check even if the last check was recent.
	 */
	public async update(force?: true) {
		await this.updater.ensureUpToDate(force);
	}

	private assertRunning() {
		if (this.activeProcesses.size === 0) {
			throw new Error('[FNLB ShardingManager] No shards are running. Call start() first.');
		}
	}

	private syncSelectionToStartConfig() {
		if (!this.lastStartConfig) return;
		this.lastStartConfig = {
			...this.lastStartConfig,
			categories: this.selection.categories,
			bots: this.selection.bots,
			overrideCategoryConfig: this.categoryConfigOverrides
		};
	}

	private broadcastSelection() {
		const message: SelectionSetMessage = {
			type: 'selection:set',
			categories: this.selection.categories,
			bots: this.selection.bots,
			overrideCategoryConfig: this.categoryConfigOverrides
		};

		for (const [id, ps] of this.activeProcesses) {
			if (!ps.connected) {
				this.warn(`Skipping selection sync for disconnected shard ${id}`);
				continue;
			}
			ps.send(message);
		}
	}

	private resolveAuthToken(config: StartConfig): string | undefined {
		const token = config.token ?? config.apiToken;
		return token?.trim() || undefined;
	}

	private log(...message: any[]) {
		if (!this.config?.disableLogs) {
			console.log('[FNLB ShardingManager]', ...message);
			this.config?.onLogMessage?.({
				timestamp: Date.now(),
				content: message.join(' '),
				format: LogsMessageFormat.Neutral
			});
		}
	}

	private success(...message: any[]) {
		if (!this.config?.disableLogs) {
			console.log('[FNLB ShardingManager] [OK]', ...message);
			this.config?.onLogMessage?.({
				timestamp: Date.now(),
				content: message.join(' '),
				format: LogsMessageFormat.Success
			});
		}
	}

	private warn(...message: any[]) {
		if (!this.config?.disableErrorLogs) {
			console.warn('[FNLB ShardingManager] [WRN]', ...message);
			this.config?.onLogMessage?.({
				timestamp: Date.now(),
				content: message.join(' '),
				format: LogsMessageFormat.Warn
			});
		}
	}

	private error(...message: any[]) {
		if (!this.config?.disableErrorLogs) {
			console.error('[FNLB ShardingManager] [ERR]', ...message);
			this.config?.onLogMessage?.({
				timestamp: Date.now(),
				content: message.join(' '),
				format: LogsMessageFormat.Error
			});
		}
	}
}
