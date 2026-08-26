import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { findArtStyle } from "./art-styles.js";
import {
  bookAuthoringCampaign,
  bookAuthoringEdition,
  bookAuthoringRecords,
  bookHistoricQuotations,
  bookPrimaryPrompts,
} from "./books-edition.js";
import { compileManufacturableCandidatePrompt } from "./manufacturable-prompt-recipe.js";

const EXPECTED_BOOKS = [
  ["nineteen-eighty-four", "1984", "George Orwell", "classic"],
  ["to-kill-a-mockingbird", "To Kill a Mockingbird", "Harper Lee", "classic"],
  ["the-great-gatsby", "The Great Gatsby", "F. Scott Fitzgerald", "classic"],
  ["pride-and-prejudice", "Pride and Prejudice", "Jane Austen", "classic"],
  ["the-count-of-monte-cristo", "The Count of Monte Cristo", "Alexandre Dumas", "classic"],
  ["the-odyssey", "The Odyssey", "Homer", "classic"],
  ["the-brothers-karamazov", "The Brothers Karamazov", "Fyodor Dostoevsky", "classic"],
  ["guns-germs-and-steel", "Guns, Germs, and Steel", "Jared Diamond", "history"],
  ["the-dawn-of-everything", "The Dawn of Everything", "David Graeber and David Wengrow", "history"],
  ["the-silk-roads", "The Silk Roads", "Peter Frankopan", "history"],
  ["team-of-rivals", "Team of Rivals", "Doris Kearns Goodwin", "history"],
  ["the-warmth-of-other-suns", "The Warmth of Other Suns", "Isabel Wilkerson", "history"],
  ["spqr", "SPQR", "Mary Beard", "history"],
  ["a-brief-history-of-time", "A Brief History of Time", "Stephen Hawking", "science"],
  ["the-selfish-gene", "The Selfish Gene", "Richard Dawkins", "science"],
  ["the-gene", "The Gene", "Siddhartha Mukherjee", "science"],
  ["the-emperor-of-all-maladies", "The Emperor of All Maladies", "Siddhartha Mukherjee", "science"],
  ["the-sixth-extinction", "The Sixth Extinction", "Elizabeth Kolbert", "science"],
  ["cosmos", "Cosmos", "Carl Sagan", "science"],
  ["meditations", "Meditations", "Marcus Aurelius", "philosophy"],
  ["the-republic", "The Republic", "Plato", "philosophy"],
  ["mans-search-for-meaning", "Man's Search for Meaning", "Viktor E. Frankl", "philosophy"],
  ["the-myth-of-sisyphus", "The Myth of Sisyphus", "Albert Camus", "philosophy"],
  ["justice", "Justice", "Michael J. Sandel", "philosophy"],
  ["nicomachean-ethics", "Nicomachean Ethics", "Aristotle", "philosophy"],
  ["the-innovators", "The Innovators", "Walter Isaacson", "technology"],
  ["the-design-of-everyday-things", "The Design of Everyday Things", "Don Norman", "technology"],
  ["the-pragmatic-programmer", "The Pragmatic Programmer", "Andrew Hunt and David Thomas", "technology"],
  ["code", "Code", "Charles Petzold", "technology"],
  ["algorithms-to-live-by", "Algorithms to Live By", "Brian Christian and Tom Griffiths", "technology"],
  ["the-phoenix-project", "The Phoenix Project", "Gene Kim, Kevin Behr, and George Spafford", "technology"],
  ["chip-war", "Chip War", "Chris Miller", "technology"],
  ["dune", "Dune", "Frank Herbert", "speculative-fiction"],
  ["the-three-body-problem", "The Three-Body Problem", "Cixin Liu", "speculative-fiction"],
  ["foundation", "Foundation", "Isaac Asimov", "speculative-fiction"],
  ["neuromancer", "Neuromancer", "William Gibson", "speculative-fiction"],
  ["the-left-hand-of-darkness", "The Left Hand of Darkness", "Ursula K. Le Guin", "speculative-fiction"],
  ["project-hail-mary", "Project Hail Mary", "Andy Weir", "speculative-fiction"],
  ["the-remains-of-the-day", "The Remains of the Day", "Kazuo Ishiguro", "literary-fiction"],
  ["beloved", "Beloved", "Toni Morrison", "literary-fiction"],
  ["the-road", "The Road", "Cormac McCarthy", "literary-fiction"],
  ["a-gentleman-in-moscow", "A Gentleman in Moscow", "Amor Towles", "literary-fiction"],
  ["the-kite-runner", "The Kite Runner", "Khaled Hosseini", "literary-fiction"],
  ["pachinko", "Pachinko", "Min Jin Lee", "literary-fiction"],
  ["thinking-fast-and-slow", "Thinking, Fast and Slow", "Daniel Kahneman", "modern-nonfiction"],
  ["atomic-habits", "Atomic Habits", "James Clear", "modern-nonfiction"],
  ["educated", "Educated", "Tara Westover", "modern-nonfiction"],
  ["kitchen-confidential", "Kitchen Confidential", "Anthony Bourdain", "modern-nonfiction"],
  ["the-wager", "The Wager", "David Grann", "modern-nonfiction"],
  ["the-anthropocene-reviewed", "The Anthropocene Reviewed", "John Green", "modern-nonfiction"],
] as const;

describe("the curated 50-book authoring edition", () => {
  it("freezes exactly fifty new work identities without duplicating Sapiens", () => {
    expect(bookAuthoringEdition).toEqual({
      schemaVersion: 1,
      catalogueId: "books-read",
      edition: "2026-08-25.badge-editorial-50@1",
      declaredCount: 50,
      scope:
        "Fifty single-work reading achievements curated for the owner's Books Read set; excludes the separately published Sapiens fixture.",
    });
    expect(
      bookAuthoringRecords.map(({ slug, bookTitle, author, category }) => [
        slug,
        bookTitle,
        author,
        category,
      ]),
    ).toEqual(EXPECTED_BOOKS);
    expect(bookAuthoringRecords).toHaveLength(50);
    expect(bookAuthoringRecords.some(({ slug }) => slug === "sapiens")).toBe(false);
    expect(new Set(bookAuthoringRecords.map(({ definitionId }) => definitionId)).size).toBe(50);
    expect(new Set(bookAuthoringRecords.map(({ slug }) => slug)).size).toBe(50);
    expect(new Set(bookAuthoringRecords.map(({ bookTitle }) => bookTitle)).size).toBe(50);
    for (const book of bookAuthoringRecords) {
      expect(book.definitionId).toBe(`read-${book.slug}`);
      expect(book.title).toBe(`Read ${book.bookTitle}`);
      expect(book.criterion).toBe(`Finish reading ${book.bookTitle}`);
      expect(book.artBrief.badgeKey).toBe(`books-read/${book.slug}`);
    }
  });

  it("uses three distinct registered styles and original brand-free miniature direction", () => {
    const forbiddenPositiveDirection =
      /book cover|dust jacket|typograph|title lettering|publisher artwork|author portrait|film adaptation|television adaptation|franchise|trade dress|logo/iu;
    for (const book of bookAuthoringRecords) {
      expect(book.candidateStyles).toHaveLength(3);
      expect(new Set(book.candidateStyles).size, book.bookTitle).toBe(3);
      for (const styleId of book.candidateStyles) {
        expect(findArtStyle(styleId), `${book.bookTitle}: ${styleId}`).toBeTruthy();
      }
      expect(book.artBrief.themeCues).toHaveLength(3);
      expect(book.artBrief.requiredMotifs).toHaveLength(1);
      expect(book.artBrief.excludedMotifs).toEqual([
        "published-edition composition or commercial trade dress",
        "author likeness or adaptation imagery",
        "words, letters, numerals, branding, or seals",
      ]);
      const positiveDirection = [
        book.artBrief.description,
        ...book.artBrief.themeCues,
        ...book.artBrief.requiredMotifs,
        ...book.artBrief.moodCues,
        ...book.artBrief.paletteCues,
      ].join(" ");
      expect(positiveDirection, book.bookTitle).not.toMatch(forbiddenPositiveDirection);
      expect(book.artBriefProvenance).toEqual({
        kind: "curated-editorial",
        note: "Original Badge editorial symbolism for one literary work; title and author establish identity only and no published-edition or adaptation artwork is a visual source.",
        sourceUrls: [],
      });
    }
    expect(new Set(bookAuthoringRecords.flatMap(({ candidateStyles }) => candidateStyles)).size).toBe(24);
    expect(new Set(bookAuthoringRecords.map(({ candidateStyles }) => candidateStyles[0])).size).toBe(24);
  });

  it("preselects a source-linked quotation from a real historical figure", () => {
    expect(bookHistoricQuotations).toHaveLength(3);
    const quotationIds = new Set<string>(bookHistoricQuotations.map(({ quotationId }) => quotationId));
    for (const quotation of bookHistoricQuotations) {
      expect(quotation.quotationId).toMatch(/^historic-quotation\//u);
      expect(quotation.personName).toMatch(/\S+\s+\S+/u);
      expect(quotation.sourceUrl).toMatch(/^https:\/\//u);
      expect(quotation.personWikipediaUrl).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//u);
    }
    for (const book of bookAuthoringRecords) {
      expect(book.defaultQuotationId, book.bookTitle).toBeDefined();
      expect(quotationIds.has(book.defaultQuotationId!), book.bookTitle).toBe(true);
    }
  });

  it("builds one deterministic role-complete campaign with a truthful primary per work", () => {
    expect(bookAuthoringCampaign).toHaveLength(50);
    const candidateKeys = new Set<string>();
    for (const [index, project] of bookAuthoringCampaign.entries()) {
      const book = bookAuthoringRecords[index]!;
      expect(project.definitionId).toBe(book.definitionId);
      expect(project.projectId).toBe(`book-project/${book.slug}`);
      expect(project.primaryCandidateKey).toBe(`${book.definitionId}:landmark-witness`);
      expect(project.status).toBe("source-study-planned");
      expect(project.candidates.map(({ styleId }) => styleId)).toEqual(book.candidateStyles);
      expect(new Set(project.candidates.map(({ role }) => role))).toEqual(
        new Set(["landmark-witness", "emblematic-metaphor", "terrain-memory"]),
      );
      for (const candidate of project.candidates) {
        candidateKeys.add(candidate.candidateKey);
      }
    }
    expect(candidateKeys.size).toBe(150);
  });

  it("publishes one deterministic primary badge-source-art v2 prompt per work", () => {
    expect(bookPrimaryPrompts).toHaveLength(50);
    const promptHashes = new Set<string>();
    for (const [index, entry] of bookPrimaryPrompts.entries()) {
      const book = bookAuthoringRecords[index]!;
      const project = bookAuthoringCampaign[index]!;
      const candidate = project.candidates[0];
      const freshFirst = compileManufacturableCandidatePrompt(project.brief, candidate);
      const freshSecond = compileManufacturableCandidatePrompt(project.brief, candidate);
      expect(freshFirst).toEqual(freshSecond);
      expect(entry.definitionId).toBe(book.definitionId);
      expect(entry.compiled).toEqual(freshFirst);
      expect(entry.compiled.recipe).toEqual({ id: "badge-source-art", revision: 2 });
      expect(entry.compiled.candidateKey).toBe(project.primaryCandidateKey);
      expect(entry.compiled.prompt).toContain("SMALL-BADGE MANUFACTURING CONTRACT");
      expect(entry.compiled.prompt).toContain("3 to 5 primary forms");
      expect(entry.compiled.prompt).toContain("48 × 48 pixels");
      const firstHash = createHash("sha256").update(entry.compiled.prompt, "utf8").digest("hex");
      const secondHash = createHash("sha256").update(freshSecond.prompt, "utf8").digest("hex");
      expect(firstHash).toBe(secondHash);
      promptHashes.add(firstHash);
    }
    expect(promptHashes.size).toBe(50);
  });
});
