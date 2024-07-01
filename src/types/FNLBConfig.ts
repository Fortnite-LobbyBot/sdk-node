export interface FNLBConfig {
    token: string;
    categories?: string[];
    numberOfShards?: number;
    botsPerShard?: number
    hideUsernames?: boolean;
    hideEmails?: boolean;
    debug?: boolean;
}
