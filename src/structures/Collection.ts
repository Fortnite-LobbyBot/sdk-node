/** A Map with `filter` and `find`. `party.members` and `fnlb.bots.cache` use this. */
export class Collection<K, V> extends Map<K, V> {
	public filter(fn: (value: V, key: K) => boolean): Collection<K, V> {
		const next = new Collection<K, V>();
		for (const [key, value] of this) {
			if (fn(value, key)) next.set(key, value);
		}
		return next;
	}

	public find(fn: (value: V, key: K) => boolean): V | undefined {
		for (const [key, value] of this) {
			if (fn(value, key)) return value;
		}
		return undefined;
	}
}
