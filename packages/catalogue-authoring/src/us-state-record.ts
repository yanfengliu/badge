import { findArtStyle } from "./art-styles";
import { defaultUsStateQuotationId } from "./us-state-quotations";
import type { BadgeArtBrief, UsStateAuthoringRecord } from "./types";

export interface UsStateSeed {
  censusStateFips: string;
  postalCode: string;
  slug: string;
  name: string;
  signature: string;
  symbol: string;
  terrain: string;
  palette: readonly [string, string, string, ...string[]];
  styles: readonly [string, string, string];
  excludedMotifs?: readonly string[];
  artBriefSourceUrls?: readonly string[];
}

export function defineUsState(seed: Readonly<UsStateSeed>): UsStateAuthoringRecord {
  if (!/^\d{2}$/u.test(seed.censusStateFips)) {
    throw new Error(
      `U.S. state ${seed.name} has invalid Census state FIPS ${seed.censusStateFips}; use the exact two-digit Census code.`,
    );
  }
  if (!/^[A-Z]{2}$/u.test(seed.postalCode)) {
    throw new Error(
      `U.S. state ${seed.name} has invalid postal code ${seed.postalCode}; use the exact two-letter USPS code.`,
    );
  }
  if (new Set(seed.styles).size !== seed.styles.length) {
    throw new Error(
      `U.S. state ${seed.name} repeats a candidate style; assign three distinct registered styles before compiling.`,
    );
  }
  for (const styleId of seed.styles) {
    if (!findArtStyle(styleId)) {
      throw new Error(
        `U.S. state ${seed.name} references missing style ${styleId}; register that immutable style revision before loading the edition.`,
      );
    }
  }

  const definitionId = `visited-us-state-${seed.censusStateFips}`;
  const criterion = `Visit ${seed.name}`;
  const artBrief: BadgeArtBrief = {
    schemaVersion: 1,
    badgeKey: `us-states/${seed.censusStateFips}`,
    title: seed.name,
    criterion,
    description: `Remember ${seed.name} through ${seed.signature}, with ${seed.symbol}.`,
    themeCues: [seed.signature, seed.symbol, seed.terrain],
    requiredMotifs: [seed.signature],
    excludedMotifs: [
      "state flag or official seal",
      "highway welcome sign",
      "generic souvenir state outline",
      ...(seed.excludedMotifs ?? []),
    ],
    moodCues: ["specific to this state", "quietly triumphant", "worthy of close inspection"],
    paletteCues: seed.palette,
  };

  return {
    definitionId,
    slug: seed.slug,
    title: seed.name,
    name: seed.name,
    criterion,
    contextLabel: `${seed.postalCode} · Census FIPS ${seed.censusStateFips}`,
    aliases: [seed.postalCode],
    artBrief,
    candidateStyles: seed.styles,
    artBriefProvenance: {
      kind: "curated-editorial",
      note: "The Census source establishes state identity only; visual landmark, ecology, and palette cues are curated art direction pending item-level authoritative fact references.",
      sourceUrls: seed.artBriefSourceUrls ?? [],
    },
    defaultQuotationId: defaultUsStateQuotationId(seed.censusStateFips),
    censusStateFips: seed.censusStateFips,
    postalCode: seed.postalCode,
  };
}
