import type { ICategoryConfig } from '@fnlb-project/shared/types';

/** How much the shard process prints. */
export enum LogLevel {
	/** Normal startup and command logs. */
	Info = 'INFO',
	/** Include debug logs from the shard. */
	Debug = 'DEBUG'
}

/** Per-id category setting overrides. */
export type CategoryConfigOverrideMap = Record<string, Partial<ICategoryConfig>>;

/**
 * Category settings applied for this process only. They are not saved to the dashboard.
 *
 * Merge order, later wins: the category on the account, then `all`, then `categories[id]`, then `bots[id]`.
 */
export interface CategoryConfigOverrides {
	/** Applied to every bot in this run. */
	all?: Partial<ICategoryConfig>;
	/** Applied when the bot's category id matches. */
	categories?: CategoryConfigOverrideMap;
	/** Applied when the bot id matches. */
	bots?: CategoryConfigOverrideMap;
}

/**
 * Options for `fnlb.start()`. `token` is required. `categories` and `bots` are include lists.
 *
 * Categories only: bots in those categories, plus bots with no category. Bots only: those ids. Both: the union. Neither: the whole account.
 */
export interface StartConfig {
	/** Same credential as `token`. Kept for older snippets. */
	apiToken?: string;
	/** API token (`FNLB_...`) or OAuth2 access token (`FNLBOA2AT_...`). OAuth needs `bots.run`, `categories.read`, and `bots.read`. */
	token?: string;
	/** Category ids to run. Find them on a bot's page under Category ID. */
	categories?: string[];
	/** Exact bot ids to run. The gateway assigns each id to one shard. */
	bots?: string[];
	/** Shard processes to spawn. Defaults to 1. */
	numberOfShards?: number;
	/** Maximum bots inside one shard process. Defaults to 1. */
	botsPerShard?: number;
	/** Redact display names in shard logs. */
	hideUsernames?: boolean;
	/** Redact emails in shard logs. */
	hideEmails?: boolean;
	/** Shard log verbosity. */
	logLevel?: LogLevel;
	/** Release channel for the downloaded shard runtime. */
	channel?: 'stable' | 'beta' | 'dev';
	/** Pin a shard runtime version such as `2.0.217-xmms` instead of the channel's latest. */
	overrideVersion?: string;
	/** Category settings for this process. Does not change the dashboard. */
	overrideCategoryConfig?: CategoryConfigOverrides;
	/** Extra environment variables passed into each shard process. `SDK_BRIDGE` is always set to `1`. */
	extraEnv?: Record<string, string>;
}
