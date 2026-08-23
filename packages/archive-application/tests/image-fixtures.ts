function decodeBase64(parts: readonly string[]): Uint8Array {
  return Uint8Array.from(Buffer.from(parts.join(""), "base64"));
}

export const validPngBytes = decodeBase64([
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC",
  "AAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
]);

export const validPngHash = "431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460";
