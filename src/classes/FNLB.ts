import { fork } from 'node:child_process';
import { resolve as pathResolve } from 'node:path';
import { AutoUpdater } from '@fnlb-project/shared/updater';
import type { FNLBConfig } from '../types/FNLBConfig';
import { LogsMessageFormat } from '../types/LogsMessage';
import type { StartConfig } from '../types/StartConfig';
import { Util } from './Util';

export default class FNLB {
	private readonly config?: FNLBConfig;
	private readonly activeProcesses: Map<string, ReturnType<typeof fork>> = new Map();
	private readonly packageName = `${process.versions['bun'] ? 'zenith-bun' : 'zenith'}`;
	private readonly fnlbDir: string;
	private readonly updater: AutoUpdater;

	private shouldRestart = true;
	private runId = 0;

	public constructor(config?: FNLBConfig) {
		this.config = config;
		this.fnlbDir = config?.fnlbPath ? pathResolve(config?.fnlbPath, '.fnlb') : pathResolve(process.cwd(), '.fnlb');
		this.updater = new AutoUpdater({
			storageDir: this.fnlbDir,
			targetFileName: `${this.packageName}.mjs`,
			displayName: 'FNLB',
			releaseUrl: `https://dist.fnlb.net/packages/${this.packageName}/release`,
			maxDownloadRetries: this.config?.maxDownloadRetries ?? Infinity,
			maxBackoffMs: this.config?.maxBackoffMs ?? 60_000,
			staleMs: 3_600_000,
			log: (...m) => this.log(...m),
			success: (...m) => this.success(...m),
			warn: (...m) => this.warn(...m),
			error: (...m) => this.error(...m)
		});
	}

	public async start(config: StartConfig) {
		await this.stop();
		this.shouldRestart = true;
		this.runId++;
		const currentRunId = this.runId;

		if (!config?.apiToken) throw new Error('[FNLB ShardingManager] Please provide a FNLB API token.');

		await this.update();

		const numberOfShards = config.numberOfShards ?? 1;
		const prefix = (~~(Math.random() * 10000)).toString(36) + 'fnlb' + (~~(Date.now() / 1000)).toString(36);

		for (let i = 0; i < numberOfShards; i++) {
			const id = `${prefix}-${i.toString().padStart(2, '0')}`;
			const processInstance = await this.startShard(config, id, currentRunId);
			this.activeProcesses.set(id, processInstance);
		}
	}

	public async stop() {
		this.shouldRestart = false;
		this.runId++;

		if (this.activeProcesses.size === 0) return;

		this.log('Stopping all active shards...');

		for (const [id, ps] of this.activeProcesses) {
			this.log(`Stopping shard with ID: ${id}`);
			ps.kill();
		}

		this.activeProcesses.clear();

		this.log('All shards stopped.');
	}

	public async startShard(config: StartConfig, id: string, currentRunId: number) {
		await this.update();

		if (!config?.apiToken || config.apiToken.length < 10)
			throw new Error('[FNLB ShardingManager] Please provide a valid FNLB API token.');

		this.log('Starting shard with ID:', id);

		const ps = fork(pathResolve(this.fnlbDir, `${this.packageName}.mjs`), [], {
			env: {
				...process.env,
				FORCE_COLOR: '1',
				SHARD_ID: id,
				API_TOKEN: config.apiToken,
				CATEGORIES: config.categories?.join(','),
				BOTS_PER_SHARD: (config.botsPerShard ?? 1).toString(),
				HIDE_USERNAMES: config.hideUsernames ? 'true' : 'false',
				HIDE_EMAILS: config.hideEmails ? 'true' : 'false',
				LOG_LEVEL: config.logLevel,
				CLUSTER_ID:
					this.config?.clusterName
						?.trim()
						.replace(/ +(?= )/g, '')
						.toLowerCase()
						.replaceAll(' ', '-') ?? 'unknown',
				CLUSTER_NAME: this.config?.clusterName?.trim(),
				FNLB_DIR: this.fnlbDir
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

		ps.on('close', async (code) => {
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
				const restartedProcess = await this.startShard(config, id, currentRunId);
				this.activeProcesses.set(id, restartedProcess);
			} else {
				this.log(`Shard ${id} stopped.`);
			}
		});

		return ps;
	}

	public async update(force?: true) {
		await this.updater.ensureUpToDate(force);
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
