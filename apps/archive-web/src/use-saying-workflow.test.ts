import { describe, expect, it } from "vitest";
import type { SayingProposalSnapshot } from "@badge/archive-application";
import type { ArchiveState } from "@badge/archive-domain";
import { starterBadges } from "@badge/catalogue-fixtures/archive";
import type { SayingResponse } from "@badge/saying-contract";

import { createStarterArchiveState } from "./archive-state";
import { formatFixtureQuotation } from "./fixture-quotations";
import {
  clearSayingMessagesForNavigation,
  drainSayingWrites,
  persistReadyQuotation,
  shouldSurfaceSayingWriteOutcome,
  stateAfterStaleArchiveMutation,
  trackSayingWrite,
} from "./use-saying-workflow";

const yosemite = starterBadges[0]!;
const alternativeQuotation = yosemite.historicalQuotations[1]!;
const readyQuotation: SayingProposalSnapshot = {
  recordId: "starter:visited-yosemite",
  expectedQuotationRevision: "00000000-0000-4000-8000-000000000000",
  status: "ready",
  request: {
    title: "Visited Yosemite National Park",
    criterion: "Visit Yosemite National Park honestly.",
    allowedQuotations: [alternativeQuotation],
  },
  proposal: {
    kind: "quotation",
    saying: alternativeQuotation.text,
    quotation: alternativeQuotation,
  },
  provenance: null,
  error: null,
};

describe("automatic regenerated-quotation persistence", () => {
  it("directly replaces the accepted quote after the latest sourced response succeeds", async () => {
    let state = createStarterArchiveState();
    const archive = {
      async updateQuotation(
        recordId: string,
        quotation: SayingResponse,
        expectedQuotationRevision: string,
      ): Promise<ArchiveState> {
        const current = state.records.find((record) => record.recordId === recordId);
        expect(current?.quotationRevision).toBe(expectedQuotationRevision);
        state = {
          ...state,
          records: state.records.map((record) =>
            record.recordId === recordId
              ? {
                  ...record,
                  acceptedSaying: formatFixtureQuotation(quotation.quotation),
                  quotationRevision: "11111111-1111-4111-8111-111111111111",
                }
              : record,
          ),
        };
        return state;
      },
    };

    await persistReadyQuotation(archive, readyQuotation);

    expect(state.records[0]?.acceptedSaying).toBe(formatFixtureQuotation(alternativeQuotation));
  });

  it("retains the accepted quote when persistence fails", async () => {
    const state = createStarterArchiveState();
    const acceptedBefore = state.records[0]?.acceptedSaying;
    const archive = {
      async updateQuotation(): Promise<ArchiveState> {
        throw new Error("Archive saying transaction failed; no partial state was kept.");
      },
    };

    await expect(persistReadyQuotation(archive, readyQuotation)).rejects.toThrow(
      /no partial state was kept/u,
    );
    expect(state.records[0]?.acceptedSaying).toBe(acceptedBefore);
  });

  it.each(["SAYING_CONFLICT", "INVALID_LIFECYCLE", "ALREADY_EARNED"])(
    "reloads durable Archive state after a stale %s mutation",
    async (code) => {
      const durable = createStarterArchiveState();
      const archive = { state: async () => durable };

      await expect(stateAfterStaleArchiveMutation(archive, { code })).resolves.toBe(durable);
    },
  );

  it("does not reload Archive state after an unrelated failure", async () => {
    let reads = 0;
    const archive = {
      async state(): Promise<ArchiveState> {
        reads += 1;
        return createStarterArchiveState();
      },
    };

    await expect(stateAfterStaleArchiveMutation(archive, { code: "TRANSACTION_FAILED" })).resolves.toBeNull();
    expect(reads).toBe(0);
  });

  it("does not announce an in-flight write after leaving and returning to its badge", () => {
    const writeNavigationEpoch = 4;

    expect(shouldSurfaceSayingWriteOutcome("record-a", "record-a", writeNavigationEpoch, 6)).toBe(false);
    expect(shouldSurfaceSayingWriteOutcome("record-a", "record-a", 6, 6)).toBe(true);
  });

  it("clears completed errors and successes for both sides of badge navigation", () => {
    const messages = {
      "record-a": "Old error.",
      "record-b": "Old success.",
      "record-c": "Keep this unrelated message.",
    };

    expect(clearSayingMessagesForNavigation(messages, "record-a", "record-b")).toEqual({
      "record-c": "Keep this unrelated message.",
    });
  });

  it("drains an accepted quote write before restore is allowed to replace Archive state", async () => {
    let release!: () => void;
    const write = new Promise<void>((resolve) => {
      release = resolve;
    });
    const activeWrites = new Set<Promise<void>>();
    trackSayingWrite(activeWrites, write);
    let drained = false;
    const drain = drainSayingWrites(activeWrites).then(() => {
      drained = true;
    });

    await Promise.resolve();
    expect(drained).toBe(false);
    release();
    await drain;
    expect(drained).toBe(true);
    expect(activeWrites.size).toBe(0);
  });
});
