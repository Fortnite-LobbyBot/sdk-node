import type { FNLB } from '../classes/FNLB';
import type { Shard } from '../classes/Shard';
import type { SdkBotSnapshot } from '../ipc/protocol';
import { Bot } from '../structures/Bot';
import { Collection } from '../structures/Collection';

/**
 * Bots running in this client. `cache` updates as events arrive. `fetch` and `fetchAll` ask the shards for a fresh snapshot.
 */
export class BotManager {
	/** Bots keyed by FNLB bot id. */
	public readonly cache = new Collection<string, Bot>();

	/** @internal */
	public constructor(private readonly client: FNLB) {}

	/** The cached bot, if this process has seen it. Does not call the shard. */
	public get(id: string): Bot | undefined {
		return this.cache.get(id);
	}

	/** @internal */
	public clear(): void {
		this.cache.clear();
	}

	/** @internal */
	public upsert(shard: Shard, snapshot: SdkBotSnapshot): Bot {
		const existing = this.cache.get(snapshot.id);
		if (existing) {
			existing.apply(snapshot, shard);
			return existing;
		}

		const bot = new Bot(this.client, shard, snapshot);
		this.cache.set(bot.id, bot);
		return bot;
	}

	/** @internal */
	public placeholder(shard: Shard, id: string): Bot {
		return (
			this.cache.get(id) ??
			this.upsert(shard, {
				id,
				nickname: id,
				ready: false,
				friendsCount: 0
			})
		);
	}

	/** @internal */
	public ingestList(shard: Shard, snapshots: SdkBotSnapshot[]): Bot[] {
		const ids = new Set(snapshots.map((snapshot) => snapshot.id));
		for (const [id, bot] of this.cache) {
			if (bot.shard.id === shard.id && !ids.has(id)) this.cache.delete(id);
		}
		return snapshots.map((snapshot) => this.upsert(shard, snapshot));
	}

	/**
	 * Refresh one bot from the shard that owns it.
	 *
	 * @param id FNLB bot id.
	 * @throws If that bot is not running in this process.
	 */
	public async fetch(id: string): Promise<Bot> {
		const known = this.cache.get(id);
		if (known) {
			const snapshot = await known.shard.request<SdkBotSnapshot | null>('bots.get', { botId: id });
			if (!snapshot) {
				this.cache.delete(id);
				throw new Error(`Bot ${id} is not running on this client.`);
			}
			return this.upsert(known.shard, snapshot);
		}

		const listed = await this.client.broadcast<SdkBotSnapshot | null>('bots.get', { botId: id });
		for (const entry of listed) {
			if (!entry.ok || !entry.result) continue;
			const shard = this.client.shards.get(entry.shardId);
			if (!shard) continue;
			return this.upsert(shard, entry.result);
		}

		throw new Error(`Bot ${id} is not running on this client.`);
	}

	/** Ask every shard which bots it is running and replace the cache with that list. */
	public async fetchAll(): Promise<Bot[]> {
		const listed = await this.client.broadcast<SdkBotSnapshot[]>('bots.list');
		const bots: Bot[] = [];
		for (const entry of listed) {
			const shard = this.client.shards.get(entry.shardId);
			if (!entry.ok || !shard || !Array.isArray(entry.result)) continue;
			bots.push(...this.ingestList(shard, entry.result));
		}
		return bots;
	}
}
