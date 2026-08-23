import { z } from "zod";

export const sha256DigestSchema = z.string().regex(/^[0-9a-f]{64}$/, "must be a lowercase SHA-256 digest");
export type Sha256Digest = z.infer<typeof sha256DigestSchema>;

export async function sha256Hex(bytes: Uint8Array): Promise<Sha256Digest> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  ) as Sha256Digest;
}
