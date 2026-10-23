import type { Bot } from './Bot';

/**
 * A chat message from a local shard.
 *
 * `channel` is `party` for {@link Events.PartyMemberMessage} and `friend` for {@link Events.FriendMessage}. `reply()` sends back on that same channel.
 */
export class Message {
	public constructor(
		/** Bot that received the message. */
		public readonly bot: Bot,
		/** `party` for party chat, `friend` for a whisper. */
		public readonly channel: 'party' | 'friend',
		/** Message text. */
		public readonly content: string,
		/** Epic account that sent it. */
		public readonly author: { id: string; displayName?: string }
	) {}

	/** Send a reply in the same channel. Party messages go to party chat. Friend messages whisper the author.
	 *
	 * @param content Text to send.
	 */
	public async reply(content: string): Promise<{ ok: true }> {
		if (this.channel === 'friend') return await this.bot.whisper(this.author.id, content);
		return await this.bot.send(content);
	}
}
