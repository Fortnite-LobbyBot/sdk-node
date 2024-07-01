export abstract class Util {
	static wait(time: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, time));
	}
}
