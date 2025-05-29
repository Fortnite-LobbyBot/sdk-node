import type { LogsMessage } from './LogsMessage';

export interface FNLBConfig {
	clusterName?: string;

	fnlbPath?: string;

	onLogMessage?: (message: LogsMessage) => any;
	onSubProcessLogMessage?: (message: LogsMessage) => any;

	disableLogs?: boolean;
	disableErrorLogs?: boolean;
	disableSubProcessLogs?: boolean;
	disableSubProcessErrorLogs?: boolean;

	maxDownloadRetries?: number;
	maxBackoffMs?: number;
}
