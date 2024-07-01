export interface StartConfig {
	apiToken: string;
	categories?: string[];
	numberOfShards?: number;
	botsPerShard?: number;
	hideUsernames?: boolean;
	hideEmails?: boolean;
	debug?: boolean;
}
