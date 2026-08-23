export function copyingReadonlyMap(source: ReadonlyMap<string, Uint8Array>): ReadonlyMap<string, Uint8Array> {
  const retained = new Map(Array.from(source, ([key, value]) => [key, new Uint8Array(value)] as const));
  const api = {
    get size(): number {
      return retained.size;
    },
    get(key: string): Uint8Array | undefined {
      const value = retained.get(key);
      return value === undefined ? undefined : new Uint8Array(value);
    },
    has(key: string): boolean {
      return retained.has(key);
    },
    forEach(
      callback: (value: Uint8Array, key: string, map: ReadonlyMap<string, Uint8Array>) => void,
      thisArg?: unknown,
    ): void {
      retained.forEach((value, key) =>
        callback.call(thisArg, new Uint8Array(value), key, api as unknown as ReadonlyMap<string, Uint8Array>),
      );
    },
    *entries(): IterableIterator<[string, Uint8Array]> {
      for (const [key, value] of retained) {
        yield [key, new Uint8Array(value)];
      }
    },
    keys(): MapIterator<string> {
      return retained.keys();
    },
    *values(): IterableIterator<Uint8Array> {
      for (const value of retained.values()) {
        yield new Uint8Array(value);
      }
    },
    *[Symbol.iterator](): IterableIterator<[string, Uint8Array]> {
      for (const [key, value] of retained) {
        yield [key, new Uint8Array(value)];
      }
    },
  };
  return Object.freeze(api) as unknown as ReadonlyMap<string, Uint8Array>;
}

export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach((child) => deepFreeze(child));
  }
  return value;
}
