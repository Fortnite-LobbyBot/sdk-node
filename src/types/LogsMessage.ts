export enum LogsMessageFormat {
	Neutral = 0,
	Success = 1,
	Info = 2,
	Warn = 3,
	Error = 4
}

export interface LogsMessage {
	timestamp: number;
	content: string;
	format: LogsMessageFormat;
}
