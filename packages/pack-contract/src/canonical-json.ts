export function canonicalJson(value: unknown): string {
  return serialize(value, "$", new Set<object>());
}

export function canonicalJsonBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(canonicalJson(value));
}

function serialize(value: unknown, path: string, ancestors: Set<object>): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Canonical JSON number at ${path} must be finite.`);
    }
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return withAncestor(
      value,
      path,
      ancestors,
      () => `[${value.map((item, index) => serialize(item, `${path}[${index}]`, ancestors)).join(",")}]`,
    );
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const prototype = Object.getPrototypeOf(record);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`Canonical JSON value at ${path} must be a plain object.`);
    }

    return withAncestor(record, path, ancestors, () => {
      const properties = Object.keys(record)
        .sort()
        .map((key) => {
          const item = record[key];
          if (item === undefined || typeof item === "bigint" || typeof item === "function") {
            throw new TypeError(`Canonical JSON contains an invalid value at ${path}.${key}.`);
          }
          return `${JSON.stringify(key)}:${serialize(item, `${path}.${key}`, ancestors)}`;
        });
      return `{${properties.join(",")}}`;
    });
  }

  throw new TypeError(`Canonical JSON contains an invalid value at ${path}.`);
}

function withAncestor<T extends object>(
  value: T,
  path: string,
  ancestors: Set<object>,
  operation: () => string,
): string {
  if (ancestors.has(value)) {
    throw new TypeError(`Canonical JSON contains a cycle at ${path}.`);
  }
  ancestors.add(value);
  try {
    return operation();
  } finally {
    ancestors.delete(value);
  }
}
