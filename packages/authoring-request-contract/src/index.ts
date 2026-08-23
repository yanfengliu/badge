import { z } from "zod";

const identifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/, "must be a lowercase stable identifier");

export const authoringRequestPayloadSchema = z
  .object({
    schemaVersion: z.literal(1),
    requestId: z.string().uuid(),
    localDefinitionId: identifierSchema,
    semanticRevision: z.number().int().positive(),
    title: z.string().trim().min(1).max(160),
    criterion: z.string().trim().min(1).max(500),
    description: z.string().trim().min(1).max(2_000).optional(),
  })
  .strict();

export const authoringRequestSchema = authoringRequestPayloadSchema
  .extend({
    requestDigest: z.string().regex(/^[0-9a-f]{64}$/, "must be a lowercase SHA-256 digest"),
  })
  .strict();

export type AuthoringRequestPayload = z.infer<typeof authoringRequestPayloadSchema>;
export type BadgeAuthoringRequest = z.infer<typeof authoringRequestSchema>;

export async function createAuthoringRequest(input: AuthoringRequestPayload): Promise<BadgeAuthoringRequest> {
  const payload = authoringRequestPayloadSchema.parse(input);
  const requestDigest = await digestAuthoringRequestPayload(payload);
  return authoringRequestSchema.parse({ ...payload, requestDigest });
}

export async function digestAuthoringRequestPayload(input: AuthoringRequestPayload): Promise<string> {
  const payload = authoringRequestPayloadSchema.parse(input);
  return sha256Hex(new TextEncoder().encode(canonicalJson(payload)));
}

export async function verifyAuthoringRequestDigest(input: unknown): Promise<boolean> {
  const parsed = authoringRequestSchema.safeParse(input);
  if (!parsed.success) {
    return false;
  }

  const { requestDigest, ...payload } = parsed.data;
  return requestDigest === (await digestAuthoringRequestPayload(payload));
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Canonical JSON numbers must be finite.");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const prototype = Object.getPrototypeOf(record);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("Canonical JSON accepts only plain objects.");
    }
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  throw new TypeError("Canonical JSON contains an invalid value.");
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
