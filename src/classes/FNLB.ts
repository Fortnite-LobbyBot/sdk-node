import { fork } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve as pathResolve } from 'node:path';
import { Util } from './Util';

import type { FNLBConfig } from '../types/FNLBConfig';
import { LogsMessageFormat } from '../types/LogsMessage';
import type { StartConfig } from '../types/StartConfig';

export default class FNLB {
	private readonly config?: FNLBConfig;
	private readonly activeProcesses: Map<string, ReturnType<typeof fork>> = new Map();
	private readonly packageName = `${process.versions['bun'] ? 'zenith-bun' : 'zenith'}`;

	private isLoaded = false;
	private shouldRestart = true;

	public constructor(config?: FNLBConfig) {
		this.config = config;
	}

	public async start(config: StartConfig) {
		await this.stop();

		this.shouldRestart = true;

		if (!config?.apiToken) throw new Error('[FNLB ShardingManager] Please provide a FNLB API token.');

		await this.update();

		const numberOfShards = config.numberOfShards ?? 1;

		const prefix = (~~(Math.random() * 10000)).toString(36) + 'fnlb' + (~~(Date.now() / 1000)).toString(36);

		for (let i = 0; i < numberOfShards; i++) {
			const id = `${prefix}-${i.toString().padStart(2, '0')}`;
			const process = await this.startShard(config, id);
			this.activeProcesses.set(id, process);
		}
	}

	public async stop() {
		this.shouldRestart = false;

		if (this.activeProcesses.size === 0) return;

		this.log('Stopping all active processes...');

		for (const [id, ps] of this.activeProcesses) {
			this.log(`Stopping process with ID: ${id}`);
			ps.kill();
		}

		this.activeProcesses.clear();

		this.log('All processes stopped.');
	}

	public async startShard(config: StartConfig, id: string) {
		await this.update();

		if (!config?.apiToken || config.apiToken.length < 10)
			throw new Error('[FNLB ShardingManager] Please provide a valid FNLB API token.');

		this.log('Starting shard with ID:', id);

		const ps = fork(`./.fnlb/${this.packageName}.mjs`, [], {
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
				CLUSTER_NAME: this.config?.clusterName?.trim()
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

			if (this.shouldRestart) {
				if (code === 0) {
					this.warn('Child process exited with code:', code?.toString() ?? 'none');
				} else {
					this.error('Child process exited with code:', code?.toString() ?? 'none');
				}
				await Util.wait(10_000);

				const restartedProcess = await this.startShard(config, id);
				this.activeProcesses.set(id, restartedProcess);
			} else {
				this.log(`Child process ${id} stopped.`);
			}
		});

		return ps;
	}

	public async update() {
		if (this.isLoaded) return;

		const filePath = pathResolve(`./.fnlb/${this.packageName}.mjs`);
		const file = await readFile(filePath, 'utf-8').catch(() => null);

		const maxDownloadRetries = this.config?.maxDownloadRetries || Infinity;
		const maxBackoffMs = this.config?.maxBackoffMs || 60000;

		this.log(file ? 'Checking for updates...' : 'Downloading FNLB...');

		const releaseURL = `https://dist.fnlb.net/packages/${this.packageName}/release`;
		let data;
		let attempt = 0;
		let delay = 1000;

		while (attempt < maxDownloadRetries) {
			try {
				const response = await fetch(releaseURL);
				if (!response.ok) throw new Error(`Status code: ${response.status}`);
				data = (await response.json()) as {
					hash: string;
					url: string;
					version: string;
				};
				break;
			} catch (error) {
				const nextDelay = Math.min(delay * 2, maxBackoffMs);
				attempt++;
				this.warn(
					`Check for updates attempt ${attempt} failed: ${(error as Error).message}. Retrying in ${nextDelay >= 60000 ? `${~~(nextDelay / 60000)}m` : `${~~(nextDelay / 1000)}s`}...`
				);
				if (attempt >= maxDownloadRetries) break;
				await new Promise((resolve) => setTimeout(resolve, delay));
				delay = nextDelay;
			}
		}

		if (!data) {
			if (file) {
				this.warn('Failed to check for updates. Using existing local version.');
				this.isLoaded = true;
				this.success('Loaded existing FNLB version');
				return;
			}
			throw new Error(`[FNLB ShardingManager] Failed to check for updates and no local file found.`);
		}

		if (file) {
			const hasher = createHash('sha256').update(file);
			if (hasher.digest('hex') === data.hash) {
				this.success(`FNLB v${data.version} is up to date`);
				this.isLoaded = true;
				this.success(`Finished loading FNLB v${data.version}`);
				return;
			}
			this.log(`Downloading update for FNLB v${data.version}`);
		}

		attempt = 0;
		delay = 1000;

		while (attempt < maxDownloadRetries) {
			try {
				const downloadResponse = await fetch(data.url);
				if (!downloadResponse.ok) throw new Error(`Download failed with status ${downloadResponse.status}`);

				const release = await downloadResponse.text();
				const downloadedHash = createHash('sha256').update(release).digest('hex');

				if (downloadedHash !== data.hash) throw new Error('Downloaded file hash mismatch...');

				await mkdir('.fnlb', { recursive: true });
				await writeFile(filePath, release);

				this.isLoaded = true;
				this.success(`Finished loading FNLB v${data.version}`);
				return;
			} catch (error: any) {
				const nextDelay = Math.min(delay * 2, maxBackoffMs);
				attempt++;
				this.warn(
					`Download attempt ${attempt} failed: ${error.message}. Retrying in ${nextDelay >= 60000 ? `${~~(nextDelay / 60000)}m` : `${~~(nextDelay / 1000)}s`}...`
				);
				await Util.wait(delay);
				delay = nextDelay;
			}
		}

		if (file) {
			this.warn('Max retries reached. Using existing local version.');
			this.isLoaded = true;
			this.success('Loaded existing FNLB version');
			return;
		}

		throw new Error(`[FNLB ShardingManager] Failed to download and verify update after ${attempt} attempts`);
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
