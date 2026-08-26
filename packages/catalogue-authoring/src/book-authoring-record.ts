import { findArtStyle } from "./art-styles";
import { defaultBookQuotationId } from "./book-quotations";
import type { BadgeArtBrief, CatalogueStudyRecord } from "./types";

export type BookCategory =
  | "classic"
  | "history"
  | "science"
  | "philosophy"
  | "technology"
  | "speculative-fiction"
  | "literary-fiction"
  | "modern-nonfiction";

export interface BookSeed {
  readonly slug: string;
  readonly bookTitle: string;
  readonly author: string;
  readonly category: BookCategory;
  readonly forms: readonly [string, string, string];
  readonly relationship: string;
  readonly palette: readonly [string, string, string, ...string[]];
  readonly styles: readonly [string, string, string];
}

export interface BookAuthoringRecord extends CatalogueStudyRecord {
  readonly bookTitle: string;
  readonly author: string;
  readonly category: BookCategory;
  readonly workScope: "single-work";
}

const categoryLabels: Readonly<Record<BookCategory, string>> = {
  classic: "Classic",
  history: "History",
  science: "Science",
  philosophy: "Philosophy",
  technology: "Technology",
  "speculative-fiction": "Speculative fiction",
  "literary-fiction": "Literary fiction",
  "modern-nonfiction": "Modern nonfiction",
};

export function defineBook(seed: Readonly<BookSeed>): BookAuthoringRecord {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(seed.slug)) {
    throw new Error(
      `Book ${seed.bookTitle} has invalid slug ${JSON.stringify(seed.slug)}; use a stable lowercase ASCII slug with single hyphen separators.`,
    );
  }
  if (seed.slug === "sapiens") {
    throw new Error(
      "Book Sapiens already has a published fixture; exclude it from this new fifty-work authoring edition.",
    );
  }
  if (new Set(seed.styles).size !== seed.styles.length) {
    throw new Error(
      `Book ${seed.bookTitle} repeats a candidate style; assign three distinct registered styles before compiling.`,
    );
  }
  for (const styleId of seed.styles) {
    if (!findArtStyle(styleId)) {
      throw new Error(
        `Book ${seed.bookTitle} references missing style ${styleId}; register that immutable style revision before loading the edition.`,
      );
    }
  }

  const definitionId = `read-${seed.slug}`;
  const title = `Read ${seed.bookTitle}`;
  const criterion = `Finish reading ${seed.bookTitle}`;
  const artBrief: BadgeArtBrief = {
    schemaVersion: 1,
    badgeKey: `books-read/${seed.slug}`,
    title,
    criterion,
    description: `Interpret ${seed.bookTitle} through an original symbolic miniature: ${seed.relationship}.`,
    themeCues: seed.forms,
    requiredMotifs: [seed.relationship],
    excludedMotifs: [
      "published-edition composition or commercial trade dress",
      "author likeness or adaptation imagery",
      "words, letters, numerals, branding, or seals",
    ],
    moodCues: ["reflective rather than promotional", "clear at miniature scale", "crafted restraint"],
    paletteCues: seed.palette,
  };

  return {
    definitionId,
    slug: seed.slug,
    title,
    bookTitle: seed.bookTitle,
    author: seed.author,
    category: seed.category,
    workScope: "single-work",
    criterion,
    contextLabel: `${seed.author} · ${categoryLabels[seed.category]}`,
    aliases: [seed.bookTitle, seed.author],
    artBrief,
    candidateStyles: seed.styles,
    artBriefProvenance: {
      kind: "curated-editorial",
      note: "Original Badge editorial symbolism for one literary work; title and author establish identity only and no published-edition or adaptation artwork is a visual source.",
      sourceUrls: [],
    },
    defaultQuotationId: defaultBookQuotationId(seed.category),
  };
}
