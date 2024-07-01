import fs from 'node:fs';
import path from 'node:path';
import { Util } from './Util';
import { fork } from 'node:child_process';
import type { FNLBConfig } from '../types/FNLBConfig';

export default class FNLB {
    private isLoaded = false

    public async update() {
        if (this.isLoaded) return

        console.log('[FNLB ShardingManager] Checking for updates...')

        const releaseURL = 'https://dist.fnlb.net/packages/zenith/release';
        const response = await fetch(releaseURL);

        if (!response.ok)
            throw new Error(`Failed to check for updates, status code: ${response.status}`);

        const data = (await response.json()) as { hash: string; url: string; version: string };

        const downloadURL = data.url;

        const downloadResponse = await fetch(downloadURL);

        if (!downloadResponse.ok)
            throw new Error(`Failed to download update, status code: ${downloadResponse.status}`);

        const release = await downloadResponse.text();

        const tempFilePath = path.join('zenith.js');

        fs.writeFileSync(tempFilePath, release);

        this.isLoaded = true
    }

    public async start(config: FNLBConfig) {
        await this.update()

        const numberOfShards = config.numberOfShards ?? 1;

        const processes = []

        for (let i = 0; i < numberOfShards; i++) {
            const date = new Date();

            processes.push(this.startShard(
                `${i.toString().padStart(2, '0')}/${date.getDay()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}`
            ));
        }

        return processes
    }

    public async startShard(id: string) {
        await this.update()

        console.log('[FNLB ShardingManager] Starting shard with id:', id)

        const ps = fork('zenith.js', {
            env: {
                ...process.env,
                FORCE_COLOR: '1',
                SHARD_ID: id
            }
        });

        ps.stdout?.on('data', (data) => {
            process.stdout.write(data.toString('utf8'));
        });

        ps.stderr?.on('data', (data) => {
            process.stderr.write(data.toString('utf8'));
        });

        ps.on('close', async (code) => {
            if (code === 0) {
                console.warn('[FNLB ShardingManager] Child process exited with code:', code?.toString() ?? 'none');
            } else {
                console.error('[FNLB ShardingManager] Child process exited with code:', code?.toString() ?? 'none');
            }

            console.info('[FNLB ShardingManager] Trying to restart process...');

            await Util.wait(10_000);

            this.startShard(id);
        });

        return ps
    }
}
