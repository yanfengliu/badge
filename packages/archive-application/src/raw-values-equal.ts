interface EqualityState {
  readonly leftToRight: WeakMap<object, object>;
  readonly rightToLeft: WeakMap<object, object>;
}

function bytesEqual(left: ArrayBufferLike, right: ArrayBufferLike): boolean {
  if (left.byteLength !== right.byteLength) return false;
  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);
  return leftBytes.every((value, index) => value === rightBytes[index]);
}

function isSharedArrayBuffer(value: unknown): value is SharedArrayBuffer {
  return typeof SharedArrayBuffer !== "undefined" && value instanceof SharedArrayBuffer;
}

function isFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

export async function rawValuesEqual(
  left: unknown,
  right: unknown,
  state: EqualityState = {
    leftToRight: new WeakMap(),
    rightToLeft: new WeakMap(),
  },
): Promise<boolean> {
  if (Object.is(left, right)) return true;
  if (typeof left !== "object" || left === null || typeof right !== "object" || right === null) {
    return false;
  }
  if (Object.getPrototypeOf(left) !== Object.getPrototypeOf(right)) return false;

  const priorRight = state.leftToRight.get(left);
  const priorLeft = state.rightToLeft.get(right);
  if (priorRight || priorLeft) return priorRight === right && priorLeft === left;
  state.leftToRight.set(left, right);
  state.rightToLeft.set(right, left);

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    for (let index = 0; index < leftKeys.length; index += 1) {
      const key = leftKeys[index];
      if (key === undefined || key !== rightKeys[index]) return false;
      if (!(await rawValuesEqual(left[key as unknown as number], right[key as unknown as number], state))) {
        return false;
      }
    }
    return true;
  }

  if (left instanceof Date || right instanceof Date) {
    return left instanceof Date && right instanceof Date && Object.is(left.getTime(), right.getTime());
  }

  if (left instanceof RegExp || right instanceof RegExp) {
    return (
      left instanceof RegExp &&
      right instanceof RegExp &&
      left.source === right.source &&
      left.flags === right.flags &&
      left.lastIndex === right.lastIndex
    );
  }

  if (
    left instanceof ArrayBuffer ||
    right instanceof ArrayBuffer ||
    isSharedArrayBuffer(left) ||
    isSharedArrayBuffer(right)
  ) {
    const leftIsBuffer = left instanceof ArrayBuffer || isSharedArrayBuffer(left);
    const rightIsBuffer = right instanceof ArrayBuffer || isSharedArrayBuffer(right);
    return leftIsBuffer && rightIsBuffer && bytesEqual(left, right);
  }

  if (ArrayBuffer.isView(left) || ArrayBuffer.isView(right)) {
    if (!ArrayBuffer.isView(left) || !ArrayBuffer.isView(right)) return false;
    return (
      left.byteOffset === right.byteOffset &&
      left.byteLength === right.byteLength &&
      left.buffer.byteLength === right.buffer.byteLength &&
      bytesEqual(left.buffer, right.buffer)
    );
  }

  if (isFile(left) || isFile(right)) {
    if (!isFile(left) || !isFile(right)) return false;
    if (
      left.name !== right.name ||
      left.lastModified !== right.lastModified ||
      left.type !== right.type ||
      left.size !== right.size
    ) {
      return false;
    }
    return bytesEqual(await left.arrayBuffer(), await right.arrayBuffer());
  }

  if (left instanceof Blob || right instanceof Blob) {
    if (!(left instanceof Blob) || !(right instanceof Blob)) return false;
    if (left.type !== right.type || left.size !== right.size) return false;
    return bytesEqual(await left.arrayBuffer(), await right.arrayBuffer());
  }

  if (left instanceof Map || right instanceof Map) {
    if (!(left instanceof Map) || !(right instanceof Map) || left.size !== right.size) return false;
    const leftEntries = [...left.entries()];
    const rightEntries = [...right.entries()];
    for (let index = 0; index < leftEntries.length; index += 1) {
      const leftEntry = leftEntries[index];
      const rightEntry = rightEntries[index];
      if (!leftEntry || !rightEntry) return false;
      if (!(await rawValuesEqual(leftEntry[0], rightEntry[0], state))) return false;
      if (!(await rawValuesEqual(leftEntry[1], rightEntry[1], state))) return false;
    }
    return true;
  }

  if (left instanceof Set || right instanceof Set) {
    if (!(left instanceof Set) || !(right instanceof Set) || left.size !== right.size) return false;
    const leftValues = [...left.values()];
    const rightValues = [...right.values()];
    for (let index = 0; index < leftValues.length; index += 1) {
      if (!(await rawValuesEqual(leftValues[index], rightValues[index], state))) return false;
    }
    return true;
  }

  if (left instanceof Error || right instanceof Error) {
    if (!(left instanceof Error) || !(right instanceof Error)) return false;
    const leftWithCause = left as Error & { cause?: unknown };
    const rightWithCause = right as Error & { cause?: unknown };
    const aggregateErrorsEqual =
      typeof AggregateError === "undefined" ||
      (!(left instanceof AggregateError) && !(right instanceof AggregateError)) ||
      (left instanceof AggregateError &&
        right instanceof AggregateError &&
        (await rawValuesEqual(left.errors, right.errors, state)));
    return (
      left.name === right.name &&
      left.message === right.message &&
      left.stack === right.stack &&
      aggregateErrorsEqual &&
      (await rawValuesEqual(leftWithCause.cause, rightWithCause.cause, state))
    );
  }

  if (
    typeof DOMException !== "undefined" &&
    (left instanceof DOMException || right instanceof DOMException)
  ) {
    return (
      left instanceof DOMException &&
      right instanceof DOMException &&
      left.name === right.name &&
      left.message === right.message &&
      left.code === right.code
    );
  }

  const prototype = Object.getPrototypeOf(left);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);
  if (leftKeys.length !== rightKeys.length) return false;
  for (let index = 0; index < leftKeys.length; index += 1) {
    const key = leftKeys[index];
    if (key === undefined || key !== rightKeys[index]) return false;
    if (!(await rawValuesEqual(leftRecord[key], rightRecord[key], state))) return false;
  }
  return true;
}
