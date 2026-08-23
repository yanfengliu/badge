import { renderRecipeSchema, type RenderRecipe } from "@badge/render-recipe";
import { z } from "zod";

import {
  candidateIdentityKey,
  candidateIdentitySchema,
  isKnownGeneratedCandidateIdentity,
  uploadedCandidateIdentity,
  type CandidateIdentity,
} from "./candidate-identity.js";
import { MAX_STUDIO_IMAGE_BYTES, STUDIO_IMAGE_MIME_TYPES } from "./image-processing.js";

export const STUDIO_DRAFT_KEY = "current-draft";

export const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/, "Expected a lowercase SHA-256 digest.");
const blobSchema = z.custom<Blob>((value) => value instanceof Blob, "Expected Blob bytes.");
const storedAssetBase = {
  hash: sha256Schema,
  blob: blobSchema,
  mimeType: z.enum(STUDIO_IMAGE_MIME_TYPES),
  byteLength: z
    .number()
    .int()
    .positive()
    .max(
      MAX_STUDIO_IMAGE_BYTES,
      `Stored image bytes must not exceed ${MAX_STUDIO_IMAGE_BYTES}; restore a bounded Studio backup or remove the unsafe row before editing.`,
    ),
  createdAt: z.string().datetime({ offset: true }),
};

export const legacyStudioOriginalAssetSchema = z
  .object({ schemaVersion: z.literal(1), ...storedAssetBase, kind: z.literal("original") })
  .strict();
export type LegacyStudioOriginalAsset = z.infer<typeof legacyStudioOriginalAssetSchema>;

export const studioOriginalAssetSchema = z
  .object({
    schemaVersion: z.literal(2),
    ...storedAssetBase,
    kind: z.literal("original"),
    candidateIdentities: z.array(candidateIdentitySchema).min(1).max(32),
  })
  .strict()
  .superRefine((asset, context) => {
    const keys = new Set<string>();
    for (const [index, identity] of asset.candidateIdentities.entries()) {
      if (identity.hash !== asset.hash) {
        context.addIssue({
          code: "custom",
          path: ["candidateIdentities", index, "hash"],
          message: "Original candidate identity hash must match the asset hash.",
        });
      }
      if (identity.origin === "processed") {
        context.addIssue({
          code: "custom",
          path: ["candidateIdentities", index, "origin"],
          message: "Original assets cannot admit a processed candidate identity.",
        });
      }
      if (identity.origin === "generated" && !isKnownGeneratedCandidateIdentity(identity)) {
        context.addIssue({
          code: "custom",
          path: ["candidateIdentities", index],
          message: "Generated original identity must match an admitted Studio fixture candidate.",
        });
      }
      const key = candidateIdentityKey(identity);
      if (keys.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["candidateIdentities", index],
          message: "Original candidate identities must be unique.",
        });
      }
      keys.add(key);
    }
  });
export type StudioOriginalAsset = z.infer<typeof studioOriginalAssetSchema>;

export const legacyStudioDerivativeAssetSchema = z
  .object({
    schemaVersion: z.literal(1),
    ...storedAssetBase,
    kind: z.literal("derivative"),
    parentHash: sha256Schema,
    operation: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-z0-9][a-z0-9._-]*$/, "Operation must be a stable lowercase identifier."),
  })
  .strict();
export type LegacyStudioDerivativeAsset = z.infer<typeof legacyStudioDerivativeAssetSchema>;

export const studioDerivativeLineageSchema = z
  .object({
    parentHash: sha256Schema,
    operation: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-z0-9][a-z0-9._-]*$/, "Operation must be a stable lowercase identifier."),
    parentCandidateIdentity: candidateIdentitySchema,
    candidateIdentity: candidateIdentitySchema,
  })
  .strict()
  .superRefine((lineage, context) => {
    if (lineage.parentCandidateIdentity.hash !== lineage.parentHash) {
      context.addIssue({
        code: "custom",
        path: ["parentCandidateIdentity", "hash"],
        message: "Parent candidate identity hash must match parentHash.",
      });
    }
    if (lineage.candidateIdentity.origin !== "processed") {
      context.addIssue({
        code: "custom",
        path: ["candidateIdentity", "origin"],
        message: "Derivative candidate identity must have processed origin.",
      });
    }
    if (lineage.candidateIdentity.provenance !== lineage.parentCandidateIdentity.provenance) {
      context.addIssue({
        code: "custom",
        path: ["candidateIdentity", "provenance"],
        message: "Derivative provenance must match its parent candidate identity.",
      });
    }
  });
export type StudioDerivativeLineage = z.infer<typeof studioDerivativeLineageSchema>;

export const studioDerivativeAssetSchema = z
  .object({
    schemaVersion: z.literal(2),
    ...storedAssetBase,
    kind: z.literal("derivative"),
    candidateLineages: z.array(studioDerivativeLineageSchema).min(1).max(32),
  })
  .strict()
  .superRefine((asset, context) => {
    const keys = new Set<string>();
    for (const [index, lineage] of asset.candidateLineages.entries()) {
      if (lineage.candidateIdentity.hash !== asset.hash) {
        context.addIssue({
          code: "custom",
          path: ["candidateLineages", index, "candidateIdentity", "hash"],
          message: "Candidate identity hash must match the derivative hash.",
        });
      }
      const key = candidateIdentityKey(lineage.candidateIdentity);
      if (keys.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["candidateLineages", index],
          message: "Derivative candidate lineages must have unique candidate identities.",
        });
      }
      keys.add(key);
    }
  });
export type StudioDerivativeAsset = z.infer<typeof studioDerivativeAssetSchema>;

export const studioAssetSchema = z.union([
  legacyStudioOriginalAssetSchema,
  studioOriginalAssetSchema,
  legacyStudioDerivativeAssetSchema,
  studioDerivativeAssetSchema,
]);
export type StudioAsset = z.infer<typeof studioAssetSchema>;

const legacyStudioDraftV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    selectedAssetHash: sha256Schema.nullable(),
    renderRecipe: renderRecipeSchema,
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const studioDraftSchema = z
  .object({
    schemaVersion: z.literal(2),
    selectedAssetHash: sha256Schema.nullable(),
    selectedCandidateIdentity: candidateIdentitySchema.nullable(),
    renderRecipe: renderRecipeSchema,
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .superRefine((draft, context) => validateMatchingIdentity(draft, context, false));
export type StudioDraft = z.infer<typeof studioDraftSchema>;

const storedStudioDraftV1Schema = legacyStudioDraftV1Schema
  .extend({ key: z.literal(STUDIO_DRAFT_KEY) })
  .strict();
const storedStudioDraftV2Schema = z
  .object({
    key: z.literal(STUDIO_DRAFT_KEY),
    schemaVersion: z.literal(2),
    selectedAssetHash: sha256Schema.nullable(),
    selectedCandidateIdentity: candidateIdentitySchema.nullable(),
    renderRecipe: renderRecipeSchema,
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .superRefine((draft, context) => validateMatchingIdentity(draft, context, true));
export const storedStudioDraftSchema = z.union([storedStudioDraftV1Schema, storedStudioDraftV2Schema]);
export type StoredStudioDraft = z.infer<typeof storedStudioDraftSchema>;

export const studioDraftInputSchema = z
  .object({
    selectedAssetHash: sha256Schema.nullable(),
    selectedCandidateIdentity: candidateIdentitySchema.nullable(),
    renderRecipe: renderRecipeSchema,
  })
  .strict()
  .superRefine((draft, context) => validateMatchingIdentity(draft, context, true));
export interface StudioDraftInput {
  selectedAssetHash: string | null;
  selectedCandidateIdentity: CandidateIdentity | null;
  renderRecipe: RenderRecipe;
}

function validateMatchingIdentity(
  draft: {
    selectedAssetHash: string | null;
    selectedCandidateIdentity: CandidateIdentity | null;
  },
  context: z.RefinementCtx,
  requireCompletePair: boolean,
): void {
  if (
    draft.selectedCandidateIdentity !== null &&
    draft.selectedCandidateIdentity.hash !== draft.selectedAssetHash
  ) {
    context.addIssue({
      code: "custom",
      path: ["selectedCandidateIdentity", "hash"],
      message: "Candidate identity hash must match selectedAssetHash.",
    });
  }
  if (
    requireCompletePair &&
    (draft.selectedAssetHash === null) !== (draft.selectedCandidateIdentity === null)
  ) {
    context.addIssue({
      code: "custom",
      path: ["selectedCandidateIdentity"],
      message: "Candidate identity and selectedAssetHash must both be present or both be null.",
    });
  }
}

export type StudioStoreErrorCode =
  | "ASSET_CONFLICT"
  | "ASSET_INVALID"
  | "ASSET_PARENT_MISSING"
  | "ASSET_UNREADABLE"
  | "ASSET_UNSUPPORTED"
  | "DATABASE_UNREADABLE"
  | "DATABASE_UNSUPPORTED"
  | "DATABASE_BLOCKED"
  | "DATABASE_TERMINATED"
  | "DRAFT_INVALID"
  | "DRAFT_UNREADABLE"
  | "DRAFT_UNSUPPORTED"
  | "TRANSACTION_FAILED";

export class StudioStoreError extends Error {
  constructor(
    readonly code: StudioStoreErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "StudioStoreError";
  }
}

export function invalidAssetInput(label: string, error: z.ZodError): StudioStoreError {
  const issue = error.issues[0];
  return new StudioStoreError(
    "ASSET_INVALID",
    `Studio ${label} input is invalid at ${issue?.path.join(".") || "root"}: ${issue?.message ?? "check the supplied fields"}. No asset was written.`,
    { cause: error },
  );
}

export function invalidDraftInput(error: z.ZodError): StudioStoreError {
  const issue = error.issues[0];
  return new StudioStoreError(
    "DRAFT_INVALID",
    `Studio draft input is invalid at ${issue?.path.join(".") || "root"}: ${issue?.message ?? "check the draft fields"}. No draft was written.`,
    { cause: error },
  );
}

export function parseAssetShape(row: unknown): StudioAsset {
  if (hasUnsupportedAssetVersion(row)) {
    throw new StudioStoreError(
      "ASSET_UNSUPPORTED",
      `Studio asset ${readString(row, "hash") || "with unknown hash"} uses schema version ${String((row as Record<string, unknown>).schemaVersion)}; keep it intact and open it with a compatible Badge Studio.`,
    );
  }
  const parsed = studioAssetSchema.safeParse(row);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new StudioStoreError(
      "ASSET_UNREADABLE",
      `Studio asset ${readString(row, "hash") || "with unknown hash"} is unreadable at ${issue?.path.join(".") || "root"}: ${issue?.message ?? "validation failed"}. It was preserved; restore a Studio backup before writing.`,
      { cause: parsed.error },
    );
  }
  if (parsed.data.blob.size !== parsed.data.byteLength || parsed.data.blob.type !== parsed.data.mimeType) {
    throw new StudioStoreError(
      "ASSET_UNREADABLE",
      `Studio asset ${parsed.data.hash} has Blob size or MIME metadata that does not match its stored row; it was preserved. Restore a matching Studio backup before writing.`,
    );
  }
  return parsed.data;
}

export function parseDraftShape(row: unknown): StoredStudioDraft {
  if (hasUnsupportedDraftVersion(row)) {
    throw new StudioStoreError(
      "DRAFT_UNSUPPORTED",
      `Studio draft uses schema version ${String((row as Record<string, unknown>).schemaVersion)}; keep it intact and open it with a compatible Badge Studio.`,
    );
  }
  const parsed = storedStudioDraftSchema.safeParse(row);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new StudioStoreError(
      "DRAFT_UNREADABLE",
      `Studio draft is unreadable at ${issue?.path.join(".") || "root"}: ${issue?.message ?? "validation failed"}. It was preserved; restore a Studio backup before writing.`,
      { cause: parsed.error },
    );
  }
  return parsed.data;
}

export function toStudioDraft(stored: StoredStudioDraft): StudioDraft {
  if (stored.schemaVersion === 1) {
    return studioDraftSchema.parse({
      schemaVersion: 2,
      selectedAssetHash: stored.selectedAssetHash,
      selectedCandidateIdentity: null,
      renderRecipe: stored.renderRecipe,
      updatedAt: stored.updatedAt,
    });
  }
  return studioDraftSchema.parse({
    schemaVersion: stored.schemaVersion,
    selectedAssetHash: stored.selectedAssetHash,
    selectedCandidateIdentity: stored.selectedCandidateIdentity,
    renderRecipe: stored.renderRecipe,
    updatedAt: stored.updatedAt,
  });
}

export function candidateIdentityMatchesAsset(asset: StudioAsset, identity: CandidateIdentity): boolean {
  if (identity.hash !== asset.hash) return false;
  if (asset.kind === "original") {
    if (asset.schemaVersion === 2) {
      return asset.candidateIdentities.some(
        (stored) => candidateIdentityKey(stored) === candidateIdentityKey(identity),
      );
    }
    return (
      identity.origin === "uploaded" &&
      candidateIdentityKey(identity) === candidateIdentityKey(uploadedCandidateIdentity(asset.hash))
    );
  }
  if (asset.schemaVersion === 2) {
    return asset.candidateLineages.some(
      (lineage) => candidateIdentityKey(identity) === candidateIdentityKey(lineage.candidateIdentity),
    );
  }
  return false;
}

export async function abortWrite(
  transaction: { abort(): void; done: Promise<unknown> },
  operation: string,
  error: unknown,
): Promise<StudioStoreError> {
  try {
    transaction.abort();
  } catch {
    // The transaction may already have completed or aborted.
  }
  try {
    await transaction.done;
  } catch {
    // Keep the original operation-specific error below.
  }
  if (error instanceof StudioStoreError) return error;
  return new StudioStoreError(
    "TRANSACTION_FAILED",
    `Studio could not ${operation}; no partial row was kept. Retry or restore a Studio backup.`,
    { cause: error },
  );
}

export function errorName(error: unknown): string | undefined {
  if (error === null || typeof error !== "object" || !("name" in error)) return undefined;
  return typeof error.name === "string" ? error.name : undefined;
}

function hasUnsupportedAssetVersion(value: unknown): boolean {
  if (value === null || typeof value !== "object" || !("schemaVersion" in value)) return false;
  const row = value as Record<string, unknown>;
  if (row.kind === "original") return row.schemaVersion !== 1 && row.schemaVersion !== 2;
  if (row.kind === "derivative") return row.schemaVersion !== 1 && row.schemaVersion !== 2;
  return false;
}

function hasUnsupportedDraftVersion(value: unknown): boolean {
  if (value === null || typeof value !== "object" || !("schemaVersion" in value)) return false;
  const version = (value as Record<string, unknown>).schemaVersion;
  return version !== 1 && version !== 2;
}

function readString(value: unknown, key: string): string | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" ? candidate : undefined;
}
