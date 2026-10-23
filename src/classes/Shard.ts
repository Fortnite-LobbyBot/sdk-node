import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
	isSdkEvent,
	isSdkHello,
	isSdkResponse,
	SDK_BRIDGE_UNAVAILABLE,
	type SdkEventMessage,
	type SdkMethod
} from '../ipc/protocol';

const REQUEST_TIMEOUT_MS = 30_000;

export interface ShardHost {
	handleSdkEvent(shard: Shard, event: SdkEventMessage): void;
	handleShardHello(shard: Shard): void;
}

interface PendingRequest {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

interface HelloWaiter {
	resolve: () => void;
	reject: (error: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

/** Result of `fnlb.broadcast`. A failed shard is `ok: false` and does not reject the whole call. */
export interface BroadcastResult<T> {
	/** Shard id this result came from. */
	shardId: string;
	/** False when that shard threw or never announced the SDK bridge. */
	ok: boolean;
	/** Value returned by the shard. Absent when `ok` is false. */
	result?: T;
	/** Error message from that shard. */
	error?: string;
}

/**
 * One shard process spawned by `fnlb.start()`.
 *
 * `fnlb.shards` holds these. `request` sends a local IPC call. Prefer `fnlb.bots` for bot, party, and command calls. Use the shard when you want `shard.info` or a method that is not on `Bot`.
 */
export class Shard {
	/** SDK bridge protocol version announced by the process. Absent until the shard says hello. */
	public protocol?: number;
	private readonly pending = new Map<string, PendingRequest>();
	private helloWaiters: HelloWaiter[] = [];
	private sawHello = false;
	private disposed = false;

	/** @internal */
	public constructor(
		private readonly host: ShardHost,
		/** Id assigned when the process was spawned, such as `abfnlb1a-00`. */
		public readonly id: string,
		public readonly child: ChildProcess,
		private readonly helloTimeoutMs: number
	) {}

	/** True after the shard has announced the SDK bridge and the IPC channel is still open. */
	public get connected(): boolean {
		return this.sawHello && !this.disposed && !!this.child.connected;
	}

	/** @internal */
	public handleMessage(message: unknown): void {
		if (this.disposed) return;

		if (isSdkHello(message)) {
			if (message.protocol < 1) return;
			this.protocol = message.protocol;
			this.sawHello = true;
			const waiters = this.helloWaiters;
			this.helloWaiters = [];
			for (const waiter of waiters) {
				clearTimeout(waiter.timer);
				waiter.resolve();
			}
			this.host.handleShardHello(this);
			return;
		}

		if (isSdkResponse(message)) {
			const pending = this.pending.get(message.id);
			if (!pending) return;
			clearTimeout(pending.timer);
			this.pending.delete(message.id);
			if (message.ok) pending.resolve(message.result);
			else pending.reject(new Error(message.error || 'SDK request failed.'));
			return;
		}

		if (isSdkEvent(message)) this.host.handleSdkEvent(this, message);
	}

	/**
	 * Send one IPC call to this shard and wait for the reply.
	 *
	 * Throws if the shard never announces the bridge, or if the call takes longer than 30 seconds.
	 *
	 * @param method Bridge method, such as `bots.list`, `commands.run`, or `fortnite.action`.
	 * @param params Arguments for that method.
	 */
	public async request<T>(method: SdkMethod, params: Record<string, unknown> = {}): Promise<T> {
		if (this.disposed) throw new Error('Shard stopped.');
		await this.waitForHello();
		if (this.disposed) throw new Error('Shard stopped.');

		const id = randomUUID();
		return await new Promise<T>((resolve, reject) => {
			let settled = false;
			const finish = (fn: () => void) => {
				if (settled) return;
				settled = true;
				fn();
			};

			const timer = setTimeout(() => {
				this.pending.delete(id);
				finish(() => reject(new Error(`SDK request ${method} timed out.`)));
			}, REQUEST_TIMEOUT_MS);

			this.pending.set(id, {
				resolve: (value) => finish(() => resolve(value as T)),
				reject: (error) => finish(() => reject(error)),
				timer
			});

			const sent = this.child.send({ type: 'sdk:request', id, method, params }, (error) => {
				if (!error) return;
				clearTimeout(timer);
				this.pending.delete(id);
				finish(() => reject(error instanceof Error ? error : new Error(String(error))));
			});

			if (sent === false) {
				clearTimeout(timer);
				this.pending.delete(id);
				finish(() => reject(new Error('Shard IPC channel is closed.')));
			}
		});
	}

	/** Version, gateway connection, and bot count for this shard. */
	public async fetchInfo() {
		return await this.request<import('../ipc/protocol').SdkShardInfo>('shard.info');
	}

	/** @internal */
	public dispose(reason = 'Shard stopped.'): void {
		if (this.disposed) return;
		this.disposed = true;

		for (const pending of this.pending.values()) {
			clearTimeout(pending.timer);
			pending.reject(new Error(reason));
		}
		this.pending.clear();

		for (const waiter of this.helloWaiters) {
			clearTimeout(waiter.timer);
			waiter.reject(new Error(reason));
		}
		this.helloWaiters = [];
	}

	private waitForHello(): Promise<void> {
		if (this.sawHello) return Promise.resolve();

		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.helloWaiters = this.helloWaiters.filter((waiter) => waiter.timer !== timer);
				reject(new Error(SDK_BRIDGE_UNAVAILABLE));
			}, this.helloTimeoutMs);
			this.helloWaiters.push({ resolve, reject, timer });
		});
	}
}
