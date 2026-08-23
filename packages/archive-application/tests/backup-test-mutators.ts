import { canonicalJsonBytes, sha256Hex } from "@badge/pack-contract";

const backupMagic = new TextEncoder().encode("BADGEARCHIVE\u0002");
const backupHeaderBytes = backupMagic.byteLength + 4 + 32;

function bytesFromDigest(digest: string): Uint8Array {
  return Uint8Array.from({ length: 32 }, (_, index) =>
    Number.parseInt(digest.slice(index * 2, index * 2 + 2), 16),
  );
}

export async function makeMislabeledSourceBackup(
  stateForSourceHash: (sourceHash: string) => unknown,
  exportedAt: string,
): Promise<Uint8Array> {
  const sourceBytes = new TextEncoder().encode("not an image despite a self-consistent backup");
  return makeSourceBackup(([sourceHash]) => stateForSourceHash(sourceHash), [sourceBytes], exportedAt);
}

export async function makeSourceBackup(
  stateForSourceHashes: (sourceHashes: readonly string[]) => unknown,
  sourcePayloads: readonly Uint8Array[],
  exportedAt: string,
): Promise<Uint8Array> {
  const sources = await Promise.all(
    sourcePayloads.map(async (bytes) => ({ bytes, hash: await sha256Hex(bytes) })),
  );
  sources.sort((left, right) => left.hash.localeCompare(right.hash));
  const stateBytes = canonicalJsonBytes(stateForSourceHashes(sources.map((source) => source.hash)));
  const manifestBytes = canonicalJsonBytes({
    format: "badgearchive",
    backupVersion: 2,
    exportedAt,
    state: { byteLength: stateBytes.byteLength, sha256: await sha256Hex(stateBytes) },
    sourceAssets: sources.map((source) => ({
      hash: source.hash,
      mimeType: "image/png",
      byteLength: source.bytes.byteLength,
    })),
  });
  const header = new Uint8Array(backupHeaderBytes);
  header.set(backupMagic);
  new DataView(header.buffer).setUint32(backupMagic.byteLength, manifestBytes.byteLength, true);
  header.set(bytesFromDigest(await sha256Hex(manifestBytes)), backupMagic.byteLength + 4);
  const result = new Uint8Array(
    header.byteLength +
      manifestBytes.byteLength +
      stateBytes.byteLength +
      sources.reduce((total, source) => total + source.bytes.byteLength, 0),
  );
  let offset = 0;
  for (const part of [header, manifestBytes, stateBytes, ...sources.map((source) => source.bytes)]) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

export async function makeStateJsonNoncanonical(backup: Uint8Array): Promise<Uint8Array> {
  const view = new DataView(backup.buffer, backup.byteOffset, backup.byteLength);
  const manifestLength = view.getUint32(backupMagic.byteLength, true);
  const manifestStart = backupHeaderBytes;
  const manifestEnd = manifestStart + manifestLength;
  const manifest = JSON.parse(new TextDecoder().decode(backup.slice(manifestStart, manifestEnd)));
  const stateEnd = manifestEnd + manifest.state.byteLength;
  const stateBytes = backup.slice(manifestEnd, stateEnd);
  const noncanonicalState = new Uint8Array(stateBytes.byteLength + 1);
  noncanonicalState[0] = 0x20;
  noncanonicalState.set(stateBytes, 1);
  manifest.state = {
    byteLength: noncanonicalState.byteLength,
    sha256: await sha256Hex(noncanonicalState),
  };
  const manifestBytes = canonicalJsonBytes(manifest);
  const header = new Uint8Array(backupHeaderBytes);
  header.set(backupMagic);
  new DataView(header.buffer).setUint32(backupMagic.byteLength, manifestBytes.byteLength, true);
  header.set(bytesFromDigest(await sha256Hex(manifestBytes)), backupMagic.byteLength + 4);
  const tail = backup.slice(stateEnd);
  const result = new Uint8Array(
    header.byteLength + manifestBytes.byteLength + noncanonicalState.byteLength + tail.byteLength,
  );
  let offset = 0;
  for (const part of [header, manifestBytes, noncanonicalState, tail]) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}
