import { fork } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Util } from './Util';

import type { FNLBConfig } from '../types/FNLBConfig';
import type { StartConfig } from '../types/StartConfig';

const defaultEnv = {
	GATEWAY_URL: 'https://gateway.fnlb.net',
	CDN_URL: 'https://cdn.fnlb.net',
	ENIGMA_URL: 'https://void.fnlb.net'
};

export default class FNLB {
	private isLoaded = false;
	private config?: FNLBConfig;

	public constructor(config?: FNLBConfig) {
		this.config = config;
	}

	private log(...message: any[]) {
		if (!this.config?.disableLogs) console.log('[FNLB ShardingManager]', ...message);
	}

	private warn(...message: any[]) {
		if (!this.config?.disableErrorLogs) console.warn('[FNLB ShardingManager]', ...message);
	}

	private error(...message: any[]) {
		if (!this.config?.disableErrorLogs) console.error('[FNLB ShardingManager]', ...message);
	}

	public async update() {
		if (this.isLoaded) return;

		this.log('Checking for updates...');

		const releaseURL = 'https://dist.fnlb.net/packages/zenith/release';
		const response = await fetch(releaseURL);

		if (!response.ok)
			throw new Error(`[FNLB ShardingManager] Failed to check for updates, status code: ${response.status}`);

		const data = (await response.json()) as { hash: string; url: string; version: string };

		const downloadURL = data.url;

		const downloadResponse = await fetch(downloadURL);

		if (!downloadResponse.ok)
			throw new Error(
				`[FNLB ShardingManager] Failed to download update, status code: ${downloadResponse.status}`
			);

		const release = await downloadResponse.text();

		const tempFilePath = path.join('zenith.js');

		fs.writeFileSync(tempFilePath, release);

		this.isLoaded = true;
	}

	public async start(config: StartConfig) {
		if (!config?.apiToken) throw new Error('[FNLB ShardingManager] Please provide a FNLB API token.');

		await this.update();

		const numberOfShards = config.numberOfShards ?? 1;

		const processes = [];

		for (let i = 0; i < numberOfShards; i++) {
			const date = new Date();

			processes.push(
				this.startShard(
					config,
					`${i.toString().padStart(2, '0')}/${date.getDay()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}`
				)
			);
		}

		return processes;
	}

	public async startShard(config: StartConfig, id: string) {
		await this.update();

		if (!config?.apiToken) throw new Error('[FNLB ShardingManager] Please provide a FNLB API token.');

		this.log('Starting shard with id:', id);

		const ps = fork('zenith.js', {
			env: {
				...process.env,
				...defaultEnv,
				FORCE_COLOR: '1',
				SHARD_ID: id,
				API_TOKEN: config.apiToken,
				CATEGORIES: config.categories?.join(','),
				BOTS_PER_SHARD: (config.botsPerShard ?? 1).toString(),
				HIDE_USERNAMES: config.hideUsernames ? 'true' : 'false',
				HIDE_EMAILS: config.hideEmails ? 'true' : 'false',
				DEBUG: config.debug ? 'true' : 'false'
			}
		});

		if (!this.config?.disableSubProcessLogs)
			ps.stdout?.on('data', (data) => {
				process.stdout.write(data.toString('utf8'));
			});

		if (!this.config?.disableSubProcessErrorLogs)
			ps.stderr?.on('data', (data) => {
				process.stderr.write(data.toString('utf8'));
			});

		ps.on('close', async (code) => {
			if (code === 0) {
				this.warn('Child process exited with code:', code?.toString() ?? 'none');
			} else {
				this.error('Child process exited with code:', code?.toString() ?? 'none');
			}

			this.log('Trying to restart process...');

			await Util.wait(10_000);

			this.startShard(config, id);
		});

		return ps;
	}
}
