/** How a log line should be shown. 0 neutral, 1 success, 2 info, 3 warn, 4 error. */
export enum LogsMessageFormat {
	Neutral = 0,
	Success = 1,
	Info = 2,
	Warn = 3,
	Error = 4
}

/** One log line from the SDK or from a shard process. */
export interface LogsMessage {
	/** Unix time in milliseconds. */
	timestamp: number;
	/** Log text. */
	content: string;
	/** How to show the line. See {@link LogsMessageFormat}. */
	format: LogsMessageFormat;
}
