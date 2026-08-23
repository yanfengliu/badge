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
  readonly sayingSuggestions: readonly string[];
}

function fixtureKey(title: string, criterion: string): string {
  return `${title}\u0000${criterion}`;
}

function abortedRequestError(): Error {
  const error = new Error("The local saying preview request was cancelled.");
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
          `No local saying previews are published for ${input.title}; connect a live provider or publish preview lines.`,
        );
      }
      if (source.sayingSuggestions.length === 0) {
        throw new Error(
          `Local saying previews for ${input.title} are empty; publish at least one preview line.`,
        );
      }

      const cursor = cursors.get(key) ?? 0;
      const saying = source.sayingSuggestions[cursor % source.sayingSuggestions.length];
      cursors.set(key, cursor + 1);
      await Promise.resolve();
      if (request.signal.aborted) throw abortedRequestError();
      return sayingProviderResultSchema.parse({
        response: { saying },
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
