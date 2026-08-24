import { SayingProposalController, type SayingProposalSnapshot } from "@badge/archive-application";
import { sayingModeForViteMode } from "@badge/saying-live-contract";

import {
  fetchSayingDisclosure,
  createLiveSayingProvider,
  isDisclosureRequiredClientMessage,
  type SayingFetch,
} from "./live-saying-client";
import { SayingDisclosureGate } from "./saying-disclosure-gate";
import { createFixtureSayingProvider, type FixtureSayingSource } from "./saying-proposals";

export interface SayingRuntime {
  readonly kind: "fixture" | "live";
  readonly controller: SayingProposalController;
  readonly disclosureGate: SayingDisclosureGate | null;
  readonly providerNote: string;
  readonly handleProposalSnapshot: (snapshot: SayingProposalSnapshot) => void;
  readonly dispose: () => void;
}

export function createSayingRuntime(
  mode: string,
  fixtureSources: readonly FixtureSayingSource[],
  fetcher?: SayingFetch,
): SayingRuntime {
  if (sayingModeForViteMode(mode) === "fixture") {
    return {
      kind: "fixture",
      controller: new SayingProposalController(createFixtureSayingProvider(fixtureSources)),
      disclosureGate: null,
      providerNote: "Fixture mode rotates only source-checked historical quotations. No model call is made.",
      handleProposalSnapshot: () => undefined,
      dispose: () => undefined,
    };
  }

  let controller: SayingProposalController | null = null;
  let authorizedCanonicalUserMessage: string | null = null;
  const disclosureGate = new SayingDisclosureGate(
    (signal) => fetchSayingDisclosure(signal, fetcher),
    async (intent, review) => {
      if (!controller) {
        throw new Error("Live quote-regeneration runtime is not initialized; reload Badge and try again.");
      }
      authorizedCanonicalUserMessage = review.canonicalUserMessage;
      try {
        await controller.dispatch(intent);
      } finally {
        authorizedCanonicalUserMessage = null;
      }
    },
  );
  controller = new SayingProposalController(
    createLiveSayingProvider({
      acknowledgedFingerprint: () => disclosureGate.acknowledgedFingerprint(),
      canonicalUserMessage: () => {
        const message = authorizedCanonicalUserMessage;
        authorizedCanonicalUserMessage = null;
        return message;
      },
      fetcher,
    }),
  );
  return {
    kind: "live",
    controller,
    disclosureGate,
    providerNote:
      "Claude Code selects only by ID from Badge’s source-checked quotation list; it never supplies the words or attribution.",
    handleProposalSnapshot: (snapshot) => {
      if (isDisclosureRequiredClientMessage(snapshot.error)) {
        void disclosureGate.reopenForRecord(snapshot.recordId);
      }
    },
    dispose: () => disclosureGate.dispose(),
  };
}
