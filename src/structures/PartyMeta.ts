import type { SdkMetaScope } from '../ipc/protocol';
import type { Bot } from './Bot';
import { fortniteAction } from './fortniteAction';

/**
 * Party schema or one member's schema.
 *
 * Call `get()` with no key for the whole parsed schema. Call `set(key, value)` to write one key and send that patch to Epic. Keys ending in `j` take objects, `b` take booleans, and `U` take numbers.
 *
 * Party meta is `bot.party.meta`. The bot's member meta is `bot.party.me.meta`. Setting another member's meta throws.
 *
 * @example
 * ```ts
 * await bot.party.meta.set('Default:CustomMatchKey_s', 'my-key');
 * const playlist = await bot.party.meta.get('Default:PlaylistData_j');
 * ```
 */
export class PartyMeta {
	public constructor(
		private readonly bot: Bot,
		private readonly scope: SdkMetaScope,
		private readonly memberId?: string
	) {}

	/**
	 * Read one meta key, or the whole parsed schema when `key` is omitted.
	 *
	 * @param key Schema key such as `Default:CustomMatchKey_s` or `Default:PlaylistData_j`.
	 * @returns The parsed value. Objects for `j` keys, booleans for `b`, numbers for `U`.
	 */
	public async get(key?: string): Promise<unknown> {
		return await fortniteAction(this.bot, 'party.meta.get', this.params(key));
	}

	/**
	 * Write one meta key and send that patch.
	 *
	 * @param key Schema key to replace.
	 * @param value Value to store. Objects are serialized for `j` keys.
	 * @returns The parsed value after the write.
	 */
	public async set(key: string, value: unknown): Promise<unknown> {
		return await fortniteAction(this.bot, 'party.meta.set', {
			...this.params(),
			key,
			value
		});
	}

	private params(key?: string): Record<string, unknown> {
		return {
			scope: this.scope,
			...(this.memberId ? { memberId: this.memberId } : {}),
			...(key ? { key } : {})
		};
	}
}
