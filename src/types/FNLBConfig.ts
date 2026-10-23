import type { LogsMessage } from './LogsMessage';

/**
 * Options for `new FNLB()`. These describe the cluster, not which bots to run. Bot selection is {@link StartConfig}.
 */
export interface FNLBConfig {
	/** Label stored on the gateway and used as the cluster id when it is unique. */
	clusterName?: string;

	/** Directory for the downloaded shard runtime. Defaults to `.fnlb` in the current working directory. */
	fnlbPath?: string;

	/** Called for messages from this process, such as shard start and stop. */
	onLogMessage?: (message: LogsMessage) => any;
	/** Called for each line written by a shard process. */
	onSubProcessLogMessage?: (message: LogsMessage) => any;

	/** Skip this process's own info logs. */
	disableLogs?: boolean;
	/** Skip this process's own warnings and errors. */
	disableErrorLogs?: boolean;
	/** Do not mirror shard stdout. */
	disableSubProcessLogs?: boolean;
	/** Do not mirror shard stderr. */
	disableSubProcessErrorLogs?: boolean;

	/** How many times to retry a shard runtime download. Defaults to no limit. */
	maxDownloadRetries?: number;
	/** Longest wait between download retries, in milliseconds. Defaults to 60 seconds. */
	maxBackoffMs?: number;

	/** REST API origin. Defaults to `https://api.fnlb.net/v1`. */
	apiBaseUrl?: string;
	/** How long to wait for a shard to announce the local SDK bridge before local calls throw. Defaults to 15 seconds. */
	sdkHelloTimeoutMs?: number;

	/** Default release channel when `start()` does not pass one. */
	channel?: 'stable' | 'beta' | 'dev';
	/** Default pinned shard version when `start()` does not pass one. */
	overrideVersion?: string;
	/** How often to check for a newer shard runtime, in milliseconds. Defaults to one hour. */
	updateIntervalMs?: number;
}
