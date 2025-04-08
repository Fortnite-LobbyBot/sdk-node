import { afterEach, describe, expect, it } from 'bun:test';
import { type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { resolve as pathResolve } from 'node:path';

import FNLB from '../src/classes/FNLB';
import { type LogsMessage, LogsMessageFormat } from '../src/types/LogsMessage';
import type { StartConfig } from '../src/types/StartConfig';
import { LogLevel } from '../src/types/StartConfig';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('FNLB', () => {
	let fnlb: FNLB;
	const testDir = pathResolve(process.cwd(), '.fnlb');
	const packageName = `${process.versions['bun'] ? 'zenith-bun' : 'zenith'}`;
	const packagePath = pathResolve(testDir, `${packageName}.mjs`);
	const apiToken = process.env['TEST_API_TOKEN']!;

	if (!apiToken) throw new Error('API Token should be defined');

	afterEach(async () => {
		if (fnlb) {
			await fnlb.stop();
		}

		await sleep(100);
		try {
			if (existsSync(testDir)) {
				await rm(testDir, { recursive: true, force: true });
			}
		} catch (error) {
			console.warn(`[Test Cleanup Warning] Failed to remove ${testDir}:`, error);
		}
	});

	describe('Constructor', () => {
		it('should instantiate without config', () => {
			fnlb = new FNLB();
			expect(fnlb).toBeInstanceOf(FNLB);

			expect(fnlb['config']).toBeUndefined();
		});

		it('should instantiate with config', () => {
			const config = { clusterName: 'test-cluster', disableLogs: true };
			fnlb = new FNLB(config);
			expect(fnlb).toBeInstanceOf(FNLB);

			expect(fnlb['config']).toEqual(config);
		});
	});

	describe('update()', () => {
		it('should download the package if not present', async () => {
			fnlb = new FNLB({ disableLogs: true });
			expect(existsSync(packagePath)).toBe(false);

			await fnlb.update();

			expect(existsSync(packagePath)).toBe(true);

			expect(fnlb['isLoaded']).toBe(true);
		}, 20000);

		it('should use the existing package if already present and up-to-date', async () => {
			fnlb = new FNLB({ disableLogs: true });
			await fnlb.update();
			expect(existsSync(packagePath)).toBe(true);

			const logMessages: LogsMessage[] = [];
			const fnlb2 = new FNLB({
				onLogMessage: (msg) => logMessages.push(msg)
			});

			await fnlb2.update();

			expect(existsSync(packagePath)).toBe(true);

			expect(fnlb2['isLoaded']).toBe(true);

			const successMsg = logMessages.find(
				(m) => m.format === LogsMessageFormat.Success && m.content.includes('is up to date')
			);

			const finishedMsg = logMessages.find(
				(m) => m.format === LogsMessageFormat.Success && m.content.includes('Finished loading FNLB')
			);
			expect(successMsg ?? finishedMsg).toBeDefined();
		}, 30000);
	});

	describe('start() / stop()', () => {
		it('should throw an error if apiToken is missing', async () => {
			fnlb = new FNLB({ disableLogs: true });
			const config = {} as StartConfig;
			expect(fnlb.start(config)).rejects.toThrow('[FNLB ShardingManager] Please provide a FNLB API token.');
		});

		it('should throw an error if apiToken is too short', async () => {
			fnlb = new FNLB({ disableLogs: true });
			const config: StartConfig = { apiToken: 'short' };

			await fnlb.update();

			expect(fnlb.start(config)).rejects.toThrow('[FNLB ShardingManager] Please provide a valid FNLB API token.');
		}, 20000);

		it('should start a single shard process', async () => {
			fnlb = new FNLB({ disableLogs: true });
			const config: StartConfig = { apiToken: apiToken, numberOfShards: 1 };

			await fnlb.start(config);
			await sleep(500);

			expect(fnlb['activeProcesses'].size).toBe(1);

			const process = fnlb['activeProcesses'].values().next().value as ChildProcess;
			expect(process).toBeDefined();
			expect(process.killed).toBe(false);

			await fnlb.stop();
			await sleep(100);

			expect(fnlb['activeProcesses'].size).toBe(0);
		}, 25000);

		it('should start multiple shard processes', async () => {
			fnlb = new FNLB({ disableLogs: true });
			const shardCount = 3;
			const config: StartConfig = { apiToken: apiToken, numberOfShards: shardCount };

			await fnlb.start(config);
			await sleep(1000);

			expect(fnlb['activeProcesses'].size).toBe(shardCount);

			for (const process of fnlb['activeProcesses'].values()) {
				expect(process).toBeDefined();
				expect(process.killed).toBe(false);
			}

			await fnlb.stop();
			await sleep(200);

			expect(fnlb['activeProcesses'].size).toBe(0);
		}, 30000);

		it('should stop processes when stop() is called', async () => {
			fnlb = new FNLB({ disableLogs: true });
			const config: StartConfig = { apiToken: apiToken, numberOfShards: 1 };
			await fnlb.start(config);
			await sleep(500);

			expect(fnlb['activeProcesses'].size).toBe(1);

			const proc = fnlb['activeProcesses'].values().next().value as ChildProcess;

			let stopped = false;
			proc.on('exit', () => {
				stopped = true;
			});

			await fnlb.stop();
			await sleep(500);

			expect(fnlb['activeProcesses'].size).toBe(0);

			expect(fnlb['shouldRestart']).toBe(false);
			expect(stopped).toBe(true);
		}, 25000);
	});

	describe('Restart Logic', () => {
		it('should attempt to restart a shard if it closes unexpectedly', async () => {
			fnlb = new FNLB({
				disableLogs: true,
				disableErrorLogs: true,
				disableSubProcessLogs: true,
				disableSubProcessErrorLogs: true
			});
			const config: StartConfig = { apiToken: apiToken, numberOfShards: 1 };

			await fnlb.start(config);
			await sleep(500);

			expect(fnlb['activeProcesses'].size).toBe(1);

			const initialProcess = fnlb['activeProcesses'].values().next().value;
			const initialPid = initialProcess!.pid;
			const initialId = [...fnlb['activeProcesses'].keys()][0];

			initialProcess!.kill('SIGTERM');

			await sleep(12000);

			const restartedProcess = fnlb['activeProcesses'].get(initialId!);

			expect(restartedProcess).toBeDefined();
			expect(restartedProcess?.pid).not.toBe(initialPid);

			expect(fnlb['activeProcesses'].size).toBe(1);

			await fnlb.stop();
		}, 30000);

		it('should NOT restart a shard if stop() was called', async () => {
			fnlb = new FNLB({
				disableLogs: true,
				disableErrorLogs: true,
				disableSubProcessLogs: true,
				disableSubProcessErrorLogs: true
			});
			const config: StartConfig = { apiToken: apiToken, numberOfShards: 1 };

			await fnlb.start(config);
			await sleep(500);

			expect(fnlb['activeProcesses'].size).toBe(1);

			await fnlb.stop();
			await sleep(100);

			expect(fnlb['shouldRestart']).toBe(false);

			await sleep(11000);

			expect(fnlb['activeProcesses'].size).toBe(0);
		}, 30000);
	});

	describe('Logging Configuration', () => {
		it('should call onLogMessage when logs are enabled', async () => {
			const logMessages: LogsMessage[] = [];
			fnlb = new FNLB({
				onLogMessage: (msg) => logMessages.push(msg),
				disableLogs: false
			});

			await fnlb.update();

			expect(logMessages.length).toBeGreaterThan(0);
			const updateCheckMsg = logMessages.find(
				(m) => m.content.includes('Checking for updates') || m.content.includes('Downloading FNLB')
			);
			expect(updateCheckMsg).toBeDefined();
			expect(updateCheckMsg?.format).toBe(LogsMessageFormat.Neutral);
		}, 20000);

		it('should NOT call onLogMessage when logs are disabled', async () => {
			const logMessages: LogsMessage[] = [];
			fnlb = new FNLB({
				onLogMessage: (msg) => logMessages.push(msg),
				disableLogs: true
			});

			await fnlb.update();
			await fnlb.start({ apiToken: apiToken });
			await fnlb.stop();

			expect(logMessages.length).toBe(0);
		}, 25000);

		it('should call onSubProcessLogMessage (if child outputs)', async () => {
			const subProcessMessages: LogsMessage[] = [];
			fnlb = new FNLB({
				onSubProcessLogMessage: (msg) => subProcessMessages.push(msg),
				disableSubProcessLogs: false,
				disableSubProcessErrorLogs: false,

				disableLogs: true,
				disableErrorLogs: true
			});
			const config: StartConfig = {
				apiToken: apiToken,
				numberOfShards: 1,

				logLevel: LogLevel.Debug
			};

			await fnlb.start(config);

			await sleep(2000);
			await fnlb.stop();

			console.log(`[Test Info] Captured ${subProcessMessages.length} subprocess messages.`);

			if (subProcessMessages.length > 0) {
				expect([LogsMessageFormat.Neutral, LogsMessageFormat.Error]).toContain(subProcessMessages[0]!.format);
			}
		}, 30000);
	});
});
