export enum LogLevel {
	Info = 'INFO',
	Debug = 'DEBUG'
}

export interface StartConfig {
	apiToken: string;
	categories?: string[];
	numberOfShards?: number;
	botsPerShard?: number;
	hideUsernames?: boolean;
	hideEmails?: boolean;
	logLevel?: LogLevel;
	channel?: 'stable' | 'beta' | 'dev';
	extraEnv?: Record<string, string>;
}
