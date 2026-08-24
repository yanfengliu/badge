import {
  SAYING_PROMPT_VERSION,
  sayingProviderResultSchema,
  sayingRequestSchema,
  type SayingProvider,
  type SayingProviderRequest,
} from "@badge/saying-contract";

export interface FixtureSayingSource {
  readonly title: string;
  readonly criterion: string;
}

function fixtureKey(title: string, criterion: string): string {
  return `${title}\u0000${criterion}`;
}

function abortedRequestError(): Error {
  const error = new Error("The local quotation-selection request was cancelled.");
  error.name = "AbortError";
  return error;
}

export function createFixtureSayingProvider(
  sources: readonly FixtureSayingSource[],
  now: () => string = () => new Date().toISOString(),
): SayingProvider {
  const sourceByAchievement = new Map(
    sources.map((source) => [fixtureKey(source.title, source.criterion), source] as const),
  );
  const cursors = new Map<string, number>();

  return {
    async propose(request: SayingProviderRequest) {
      if (request.signal.aborted) throw abortedRequestError();
      const input = sayingRequestSchema.parse(request.promptInput);
      const key = fixtureKey(input.title, input.criterion);
      const source = sourceByAchievement.get(key);
      if (!source) {
        throw new Error(
          `No source-checked quotation bank is published for ${input.title}; add a reviewed quotation bank or use a supported badge.`,
        );
      }
      const proposals = (input.allowedQuotations ?? []).map((quotation) => ({
        kind: "quotation" as const,
        saying: quotation.text,
        quotation,
      }));
      if (proposals.length === 0) {
        throw new Error(
          `No alternative source-checked quotations are available for ${input.title}; publish another verified quotation before regenerating.`,
        );
      }

      const cursor = cursors.get(key) ?? 0;
      const response = proposals[cursor % proposals.length];
      cursors.set(key, cursor + 1);
      await Promise.resolve();
      if (request.signal.aborted) throw abortedRequestError();
      return sayingProviderResultSchema.parse({
        response,
        provenance: {
          provider: "fixture-local-preview",
          model: "curated-fixture-v1",
          promptVersion: SAYING_PROMPT_VERSION,
          generatedAt: now(),
        },
      });
    },
  };
}
