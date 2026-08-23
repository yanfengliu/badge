import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import {
  candidateIdentityKey,
  candidateIdentitySchema,
  candidateOperationSchema,
  processedCandidateIdentity,
  uploadedCandidateIdentity,
  type CandidateIdentity,
} from "./candidate-identity.js";
import {
  STUDIO_DRAFT_KEY,
  StudioStoreError,
  abortWrite,
  candidateIdentityMatchesAsset,
  errorName,
  invalidAssetInput,
  invalidDraftInput,
  parseAssetShape,
  parseDraftShape,
  storedStudioDraftSchema,
  studioDerivativeAssetSchema,
  studioDraftInputSchema,
  studioOriginalAssetSchema,
  toStudioDraft,
} from "./studio-store-validation.js";
import { validateDerivationGraph, validateProspectiveAssetGraph } from "./studio-derivation-graph.js";
import { parseStoredStudioAsset } from "./studio-stored-asset.js";
import { preflightStudioInputImage, readStudioInputImage } from "./studio-store-image.js";
import type {
  StudioAsset,
  StudioDerivativeAsset,
  StudioDraft,
  StudioDraftInput,
  StudioOriginalAsset,
} from "./studio-store-validation.js";

export {
  STUDIO_DRAFT_KEY,
  StudioStoreError,
  studioAssetSchema,
  studioDerivativeAssetSchema,
  studioDraftInputSchema,
  studioDraftSchema,
  studioOriginalAssetSchema,
} from "./studio-store-validation.js";
export type {
  StudioAsset,
  StudioDerivativeAsset,
  StudioDraft,
  StudioDraftInput,
  LegacyStudioDerivativeAsset,
  LegacyStudioOriginalAsset,
  StudioOriginalAsset,
  StudioStoreErrorCode,
} from "./studio-store-validation.js";

export const STUDIO_DATABASE_NAME = "badge-studio-v1";
export const STUDIO_DATABASE_VERSION = 1;
export const STUDIO_ASSET_STORE = "studio-assets";
export const STUDIO_DRAFT_STORE = "studio-drafts";

interface StudioDatabase extends DBSchema {
  "studio-assets": { key: string; value: unknown };
  "studio-drafts": { key: string; value: unknown };
}

export interface OpenStudioStoreOptions {
  now?: () => string;
  onConnectionIssue?: (error: StudioStoreError) => void;
}

type SavedStudioDerivative = { asset: StudioDerivativeAsset; candidateIdentity: CandidateIdentity };

interface StudioConnectionState {
  issue?: StudioStoreError;
}

export async function openStudioStore(options: OpenStudioStoreOptions = {}): Promise<StudioStore> {
  let database: IDBPDatabase<StudioDatabase>;
  const connectionState: StudioConnectionState = {};
  const reportConnectionIssue = (error: StudioStoreError): void => {
    connectionState.issue = error;
    options.onConnectionIssue?.(error);
  };
  try {
    database = await openDB<StudioDatabase>(STUDIO_DATABASE_NAME, STUDIO_DATABASE_VERSION, {
      upgrade(current, oldVersion) {
        if (oldVersion === 0) {
          current.createObjectStore(STUDIO_ASSET_STORE, { keyPath: "hash" });
          current.createObjectStore(STUDIO_DRAFT_STORE, { keyPath: "key" });
        }
      },
      blocked(currentVersion, blockedVersion) {
        reportConnectionIssue(
          new StudioStoreError(
            "DATABASE_BLOCKED",
            `Studio database upgrade from ${currentVersion} to ${String(blockedVersion)} is blocked by another open tab; close the other Badge Studio tab and retry.`,
          ),
        );
      },
      blocking(currentVersion, blockedVersion, event) {
        reportConnectionIssue(
          new StudioStoreError(
            "DATABASE_BLOCKED",
            `This Badge Studio tab is blocking database upgrade from ${currentVersion} to ${String(blockedVersion)}; it closed its connection. Reload this tab after the upgrade finishes.`,
          ),
        );
        (event.target as IDBDatabase | null)?.close();
      },
      terminated() {
        reportConnectionIssue(
          new StudioStoreError(
            "DATABASE_TERMINATED",
            "The browser terminated the Studio database connection; reload Badge Studio before making more changes.",
          ),
        );
      },
    });
  } catch (error) {
    const unsupported = errorName(error) === "VersionError";
    throw new StudioStoreError(
      unsupported ? "DATABASE_UNSUPPORTED" : "DATABASE_UNREADABLE",
      unsupported
        ? `Studio database ${STUDIO_DATABASE_NAME} uses a newer schema; keep it intact and open this project with a compatible Badge Studio.`
        : `Studio database ${STUDIO_DATABASE_NAME} could not be opened; keep it intact and restore or export diagnostics before retrying.`,
      { cause: error },
    );
  }

  if (
    !database.objectStoreNames.contains(STUDIO_ASSET_STORE) ||
    !database.objectStoreNames.contains(STUDIO_DRAFT_STORE)
  ) {
    database.close();
    throw new StudioStoreError(
      "DATABASE_UNREADABLE",
      `Studio database ${STUDIO_DATABASE_NAME} is missing a required object store; it was preserved without changes. Restore a Studio backup or export diagnostics.`,
    );
  }

  return new StudioStore(database, options.now ?? (() => new Date().toISOString()), connectionState);
}

export class StudioStore {
  private writeQueue: Promise<void> = Promise.resolve();
  private quarantinedError: StudioStoreError | undefined;

  constructor(
    private readonly database: IDBPDatabase<StudioDatabase>,
    private readonly now: () => string,
    private readonly connectionState: StudioConnectionState,
  ) {}

  async hashBlob(blob: Blob): Promise<string> {
    return (await readStudioInputImage(blob, "Studio image to hash")).hash;
  }

  async loadAssets(): Promise<readonly StudioAsset[]> {
    await this.writeQueue;
    this.throwIfQuarantined();
    try {
      const rows = await this.database.getAll(STUDIO_ASSET_STORE);
      const assets: StudioAsset[] = [];
      for (const row of rows) assets.push(await parseStoredStudioAsset(row));
      validateDerivationGraph(assets);
      return assets.sort((left, right) => left.hash.localeCompare(right.hash));
    } catch (error) {
      throw this.captureReadError(error, "asset");
    }
  }

  async saveOriginal(blob: Blob, identity: CandidateIdentity): Promise<StudioOriginalAsset> {
    const parsedIdentity = candidateIdentitySchema.safeParse(identity);
    if (!parsedIdentity.success) throw invalidAssetInput("original identity", parsedIdentity.error);
    preflightStudioInputImage(blob, "Studio original upload");
    await this.assertHealthy();
    const image = await readStudioInputImage(blob, "Studio original upload");
    const candidate = {
      schemaVersion: 2,
      kind: "original",
      hash: image.hash,
      blob: image.blob,
      mimeType: image.mimeType,
      byteLength: image.bytes.byteLength,
      createdAt: this.now(),
      candidateIdentities: [parsedIdentity.data],
    };
    const parsedAsset = studioOriginalAssetSchema.safeParse(candidate);
    if (!parsedAsset.success) throw invalidAssetInput("original", parsedAsset.error);
    const asset = parsedAsset.data;

    return this.enqueueWrite(async () => {
      const transaction = this.database.transaction(STUDIO_ASSET_STORE, "readwrite");
      try {
        const existing = await transaction.store.get(asset.hash);
        if (existing !== undefined) {
          const parsed = parseAssetShape(existing);
          if (parsed.kind !== "original") {
            throw new StudioStoreError(
              "ASSET_CONFLICT",
              `Studio object ${asset.hash} already belongs to a derivative; the original row was not written.`,
            );
          }
          const identities =
            parsed.schemaVersion === 1
              ? parsedIdentity.data.origin === "generated"
                ? [uploadedCandidateIdentity(asset.hash)]
                : []
              : parsed.candidateIdentities;
          const identityKey = candidateIdentityKey(parsedIdentity.data);
          if (identities.some((stored) => candidateIdentityKey(stored) === identityKey)) {
            await transaction.done;
            return parsed as StudioOriginalAsset;
          }
          const upgraded = studioOriginalAssetSchema.safeParse({
            ...parsed,
            schemaVersion: 2,
            candidateIdentities: [...identities, parsedIdentity.data],
          });
          if (!upgraded.success) throw invalidAssetInput("original identity", upgraded.error);
          await transaction.store.put(upgraded.data);
          await transaction.done;
          return upgraded.data;
        }
        await transaction.store.add(asset);
        await transaction.done;
        return asset;
      } catch (error) {
        throw await abortWrite(transaction, "save original", error);
      }
    });
  }

  async saveDerivative(
    parentIdentity: CandidateIdentity,
    blob: Blob,
    operation: string,
  ): Promise<SavedStudioDerivative> {
    const parsedParent = candidateIdentitySchema.safeParse(parentIdentity);
    if (!parsedParent.success) throw invalidAssetInput("derivative parent", parsedParent.error);
    const parsedOperation = candidateOperationSchema.safeParse(operation);
    if (!parsedOperation.success) throw invalidAssetInput("derivative operation", parsedOperation.error);
    const exactParentIdentity = parsedParent.data;
    preflightStudioInputImage(blob, `Studio derivative for parent ${exactParentIdentity.hash}`);
    const assets = await this.assertHealthy();
    const parentAsset = assets.find((asset) => asset.hash === exactParentIdentity.hash);
    if (!parentAsset) {
      throw new StudioStoreError(
        "ASSET_PARENT_MISSING",
        `Studio derivative parent ${exactParentIdentity.hash} is missing; restore or re-upload the source before processing it.`,
      );
    }
    if (!candidateIdentityMatchesAsset(parentAsset, exactParentIdentity)) {
      throw new StudioStoreError(
        "ASSET_CONFLICT",
        `Studio derivative parent ${exactParentIdentity.hash} does not match candidate provenance and transform lineage; no row was written. Select the intact source candidate and try again.`,
      );
    }

    const image = await readStudioInputImage(
      blob,
      `Studio derivative for parent ${exactParentIdentity.hash}`,
    );
    const identity = await processedCandidateIdentity(
      image.hash,
      exactParentIdentity.provenance,
      exactParentIdentity,
      parsedOperation.data,
    );
    const lineage = {
      parentHash: exactParentIdentity.hash,
      operation: parsedOperation.data,
      parentCandidateIdentity: exactParentIdentity,
      candidateIdentity: identity,
    };
    const candidate = {
      schemaVersion: 2,
      kind: "derivative",
      hash: image.hash,
      blob: image.blob,
      mimeType: image.mimeType,
      byteLength: image.bytes.byteLength,
      createdAt: this.now(),
      candidateLineages: [lineage],
    };
    const parsedAsset = studioDerivativeAssetSchema.safeParse(candidate);
    if (!parsedAsset.success) throw invalidAssetInput("derivative", parsedAsset.error);
    const asset = parsedAsset.data;
    if (asset.hash === exactParentIdentity.hash) {
      throw new StudioStoreError(
        "ASSET_CONFLICT",
        `Studio derivative ${asset.hash} is byte-identical to its parent; keep the original instead of creating a self-reference.`,
      );
    }

    return this.enqueueWrite(async () => {
      const transaction = this.database.transaction(STUDIO_ASSET_STORE, "readwrite");
      try {
        const currentParent = await transaction.store.get(exactParentIdentity.hash);
        if (currentParent === undefined) {
          throw new StudioStoreError(
            "ASSET_PARENT_MISSING",
            `Studio derivative parent ${exactParentIdentity.hash} disappeared before save; retry after restoring the source.`,
          );
        }
        parseAssetShape(currentParent);

        const existing = await transaction.store.get(asset.hash);
        let prospective = asset;
        if (existing !== undefined) {
          const parsed = parseAssetShape(existing);
          if (parsed.kind !== "derivative" || parsed.schemaVersion !== 2) {
            throw new StudioStoreError(
              "ASSET_CONFLICT",
              `Studio object ${asset.hash} already has different immutable lineage; no row was changed.`,
            );
          }
          const exact = parsed.candidateLineages.find(
            (stored) =>
              stored.operation === lineage.operation &&
              candidateIdentityKey(stored.parentCandidateIdentity) ===
                candidateIdentityKey(lineage.parentCandidateIdentity) &&
              candidateIdentityKey(stored.candidateIdentity) ===
                candidateIdentityKey(lineage.candidateIdentity),
          );
          if (exact) {
            await transaction.done;
            return { asset: parsed, candidateIdentity: exact.candidateIdentity };
          }
          const updated = studioDerivativeAssetSchema.safeParse({
            ...parsed,
            candidateLineages: [...parsed.candidateLineages, lineage],
          });
          if (!updated.success) throw invalidAssetInput("derivative lineage", updated.error);
          prospective = updated.data;
        }
        validateProspectiveAssetGraph(await transaction.store.getAll(), prospective);
        await transaction.store.put(prospective);
        await transaction.done;
        return { asset: prospective, candidateIdentity: identity };
      } catch (error) {
        throw await abortWrite(transaction, "save derivative", error);
      }
    });
  }

  async loadDraft(): Promise<StudioDraft | null> {
    await this.writeQueue;
    this.throwIfQuarantined();
    try {
      const row = await this.database.get(STUDIO_DRAFT_STORE, STUDIO_DRAFT_KEY);
      if (row === undefined) return null;
      const draft = parseDraftShape(row);
      if (draft.selectedAssetHash !== null) {
        const assets = await this.loadAssets();
        const selectedAsset = assets.find((asset) => asset.hash === draft.selectedAssetHash);
        if (!selectedAsset) {
          throw new StudioStoreError(
            "DRAFT_UNREADABLE",
            `Studio draft selects missing asset ${draft.selectedAssetHash}; the draft was preserved. Restore the project assets before editing.`,
          );
        }
        if (
          draft.schemaVersion === 2 &&
          draft.selectedCandidateIdentity !== null &&
          !(selectedAsset.kind === "derivative" && selectedAsset.schemaVersion === 1) &&
          !candidateIdentityMatchesAsset(selectedAsset, draft.selectedCandidateIdentity)
        ) {
          throw new StudioStoreError(
            "DRAFT_UNREADABLE",
            `Studio draft candidate identity does not match preserved asset ${draft.selectedAssetHash}; the draft and asset were preserved. Restore an intact Studio backup or choose the source and treatment again.`,
          );
        }
      }
      return toStudioDraft(draft);
    } catch (error) {
      throw this.captureReadError(error, "draft");
    }
  }

  async saveDraft(input: StudioDraftInput): Promise<StudioDraft> {
    const assets = await this.assertHealthy();
    const parsedInput = studioDraftInputSchema.safeParse(input);
    if (!parsedInput.success) {
      const issue = parsedInput.error.issues[0];
      throw new StudioStoreError(
        "DRAFT_INVALID",
        `Studio draft input is invalid at ${issue?.path.join(".") || "root"}: ${issue?.message ?? "check the draft fields"}.`,
        { cause: parsedInput.error },
      );
    }
    if (
      parsedInput.data.selectedAssetHash !== null &&
      !assets.some((asset) => asset.hash === parsedInput.data.selectedAssetHash)
    ) {
      throw new StudioStoreError(
        "ASSET_PARENT_MISSING",
        `Studio draft selection ${parsedInput.data.selectedAssetHash} is missing; restore or choose an available asset.`,
      );
    }
    if (parsedInput.data.selectedCandidateIdentity) {
      const selectedAsset = assets.find(
        (asset) => asset.hash === parsedInput.data.selectedCandidateIdentity?.hash,
      );
      if (
        !selectedAsset ||
        !candidateIdentityMatchesAsset(selectedAsset, parsedInput.data.selectedCandidateIdentity)
      ) {
        throw new StudioStoreError(
          "DRAFT_INVALID",
          `Studio draft candidate identity does not match asset ${parsedInput.data.selectedCandidateIdentity.hash}; no draft was written. Select an intact candidate and try again.`,
        );
      }
    }

    const parsedDraft = storedStudioDraftSchema.safeParse({
      key: STUDIO_DRAFT_KEY,
      schemaVersion: 2,
      ...parsedInput.data,
      updatedAt: this.now(),
    });
    if (!parsedDraft.success) throw invalidDraftInput(parsedDraft.error);
    const draft = parsedDraft.data;
    return this.enqueueWrite(async () => {
      const transaction = this.database.transaction([STUDIO_ASSET_STORE, STUDIO_DRAFT_STORE], "readwrite");
      try {
        const existing = await transaction.objectStore(STUDIO_DRAFT_STORE).get(STUDIO_DRAFT_KEY);
        if (existing !== undefined) parseDraftShape(existing);
        if (draft.selectedAssetHash !== null) {
          const selected = await transaction.objectStore(STUDIO_ASSET_STORE).get(draft.selectedAssetHash);
          if (selected === undefined) {
            throw new StudioStoreError(
              "ASSET_PARENT_MISSING",
              `Studio draft selection ${draft.selectedAssetHash} disappeared before save; choose it again.`,
            );
          }
          parseAssetShape(selected);
        }
        await transaction.objectStore(STUDIO_DRAFT_STORE).put(draft);
        await transaction.done;
        return toStudioDraft(draft);
      } catch (error) {
        throw await abortWrite(transaction, "save draft", error);
      }
    });
  }

  close(): void {
    this.database.close();
  }

  private enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.writeQueue.then(operation, operation);
    this.writeQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async assertHealthy(): Promise<readonly StudioAsset[]> {
    this.throwIfQuarantined();
    const assets = await this.loadAssets();
    await this.loadDraft();
    return assets;
  }

  private captureReadError(error: unknown, surface: "asset" | "draft"): StudioStoreError {
    const captured =
      error instanceof StudioStoreError
        ? error
        : new StudioStoreError(
            surface === "asset" ? "ASSET_UNREADABLE" : "DRAFT_UNREADABLE",
            `Studio ${surface} data could not be read; it was preserved without changes. Restore a Studio backup or export diagnostics.`,
            { cause: error },
          );
    if (
      captured.code === "ASSET_UNREADABLE" ||
      captured.code === "ASSET_UNSUPPORTED" ||
      captured.code === "DRAFT_UNREADABLE" ||
      captured.code === "DRAFT_UNSUPPORTED" ||
      captured.code === "DATABASE_UNREADABLE" ||
      captured.code === "DATABASE_UNSUPPORTED"
    ) {
      this.quarantinedError = captured;
    }
    return captured;
  }

  private throwIfQuarantined(): void {
    if (this.connectionState.issue) throw this.connectionState.issue;
    if (this.quarantinedError) throw this.quarantinedError;
  }
}
