import { studioFixtureCandidates } from "@badge/catalogue-fixtures/studio";
import { sha256Hex } from "@badge/pack-contract";
import { z } from "zod";

export const candidateOriginSchema = z.enum(["generated", "uploaded", "processed"]);
export type CandidateOrigin = z.infer<typeof candidateOriginSchema>;

export const candidateProvenanceSchema = z.enum(["generated", "uploaded"]);
export type CandidateProvenance = z.infer<typeof candidateProvenanceSchema>;

export const candidateIdentitySchema = z
  .object({
    version: z.literal(1),
    hash: z.string().regex(/^[0-9a-f]{64}$/, "Expected a lowercase SHA-256 digest."),
    provenance: candidateProvenanceSchema,
    origin: candidateOriginSchema,
    lineage: z.string().min(1).max(8192),
  })
  .strict()
  .superRefine((identity, context) => {
    if (identity.origin === "generated" && identity.provenance !== "generated") {
      context.addIssue({
        code: "custom",
        path: ["provenance"],
        message: "Generated candidates must preserve generated provenance.",
      });
    }
    if (identity.origin === "uploaded" && identity.provenance !== "uploaded") {
      context.addIssue({
        code: "custom",
        path: ["provenance"],
        message: "Uploaded candidates must preserve uploaded provenance.",
      });
    }
  });
export type CandidateIdentity = z.infer<typeof candidateIdentitySchema>;

export const candidateOperationSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, "Operation must be a stable lowercase identifier.");

export function candidateIdentityKey(identity: CandidateIdentity): string {
  const parsed = candidateIdentitySchema.parse(identity);
  return JSON.stringify([parsed.version, parsed.hash, parsed.provenance, parsed.origin, parsed.lineage]);
}

export function generatedCandidateIdentity(hash: string, generatorId: string): CandidateIdentity {
  return candidateIdentitySchema.parse({
    version: 1,
    hash,
    provenance: "generated",
    origin: "generated",
    lineage: `generated:${generatorId}`,
  });
}

export function isKnownGeneratedCandidateIdentity(identity: CandidateIdentity): boolean {
  if (identity.origin !== "generated") return false;
  const key = candidateIdentityKey(identity);
  return studioFixtureCandidates.some(
    (candidate) =>
      candidateIdentityKey(generatedCandidateIdentity(candidate.sourceAssetHash, candidate.id)) === key,
  );
}

export function uploadedCandidateIdentity(hash: string): CandidateIdentity {
  return candidateIdentitySchema.parse({
    version: 1,
    hash,
    provenance: "uploaded",
    origin: "uploaded",
    lineage: "uploaded:immutable-original-v1",
  });
}

export async function processedCandidateIdentity(
  hash: string,
  provenance: CandidateProvenance,
  parent: CandidateIdentity,
  operation: string,
): Promise<CandidateIdentity> {
  const parsedParent = candidateIdentitySchema.parse(parent);
  const parsedOperation = candidateOperationSchema.parse(operation);
  if (parsedParent.provenance !== provenance) {
    throw new Error(
      `Processed candidate provenance ${provenance} does not match its ${parsedParent.provenance} parent lineage.`,
    );
  }
  const lineageDigest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify(["processed-candidate-v1", parsedOperation, candidateIdentityKey(parsedParent)]),
    ),
  );
  return candidateIdentitySchema.parse({
    version: 1,
    hash,
    provenance,
    origin: "processed",
    lineage: `processed:${parsedOperation}:${lineageDigest}`,
  });
}
