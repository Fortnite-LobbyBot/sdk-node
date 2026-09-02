import type { ICategoryConfig } from '@fnlb-project/shared/types';

export enum LogLevel {
	Info = 'INFO',
	Debug = 'DEBUG'
}

export type CategoryConfigOverrideMap = Record<string, Partial<ICategoryConfig>>;

export interface CategoryConfigOverrides {
	all?: Partial<ICategoryConfig>;
	categories?: CategoryConfigOverrideMap;
	bots?: CategoryConfigOverrideMap;
}

export interface StartConfig {
	apiToken?: string;
	token?: string;
	categories?: string[];
	bots?: string[];
	numberOfShards?: number;
	botsPerShard?: number;
	hideUsernames?: boolean;
	hideEmails?: boolean;
	logLevel?: LogLevel;
	channel?: 'stable' | 'beta' | 'dev';
	overrideVersion?: string;
	overrideCategoryConfig?: CategoryConfigOverrides;
	extraEnv?: Record<string, string>;
}
