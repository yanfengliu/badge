import { createHash } from "node:crypto";

import { catalogueQuotationBankForDefinition } from "@badge/catalogue-quotation-data";
import { describe, expect, it } from "vitest";

import { artStyleLibrary, findArtStyle, recommendedFrequentArtStyleUsage } from "./art-styles.js";
import { compileManufacturableCandidatePrompt } from "./manufacturable-prompt-recipe.js";
import {
  videoGameAuthoringCampaign,
  videoGameAuthoringEdition,
  videoGameAuthoringRecords,
  videoGamePrimaryPrompts,
} from "./video-games-edition.js";

const EXPECTED_GAMES = [
  ["pong", "Pong", "arcade", "Complete one full match of Pong."],
  ["space-invaders", "Space Invaders", "arcade", "Clear the first wave in Space Invaders."],
  ["pac-man", "PAC-MAN", "arcade", "Clear the first maze in PAC-MAN."],
  ["tetris", "Tetris", "puzzle", "Clear 100 lines in a single Tetris session."],
  ["super-mario-bros", "Super Mario Bros.", "platformer", "Defeat Bowser and finish Super Mario Bros."],
  [
    "the-legend-of-zelda",
    "The Legend of Zelda",
    "action-adventure",
    "Defeat Ganon and finish The Legend of Zelda.",
  ],
  ["metroid", "Metroid", "action-adventure", "Defeat Mother Brain and escape in Metroid."],
  ["dragon-quest", "Dragon Quest", "role-playing", "Defeat the Dragonlord and finish Dragon Quest."],
  ["simcity", "SimCity", "simulation", "Build a SimCity city with a population of at least 100,000."],
  ["prince-of-persia", "Prince of Persia", "platformer", "Rescue the princess and finish Prince of Persia."],
  [
    "the-secret-of-monkey-island",
    "The Secret of Monkey Island",
    "adventure",
    "Complete the story of The Secret of Monkey Island.",
  ],
  [
    "sonic-the-hedgehog",
    "Sonic the Hedgehog",
    "platformer",
    "Defeat the final boss and finish Sonic the Hedgehog.",
  ],
  [
    "street-fighter-ii",
    "Street Fighter II",
    "fighting",
    "Finish Arcade Mode with one fighter in Street Fighter II.",
  ],
  ["doom", "DOOM", "shooter", "Complete all three original episodes of DOOM (1993)."],
  ["myst", "Myst", "adventure", "Reach an ending in Myst (1993)."],
  ["chrono-trigger", "Chrono Trigger", "role-playing", "Reach an ending in Chrono Trigger."],
  [
    "pokemon-red-version",
    "Pokémon Red Version",
    "role-playing",
    "Enter the Hall of Fame in Pokémon Red Version.",
  ],
  [
    "super-mario-64",
    "Super Mario 64",
    "platformer",
    "Defeat the final Bowser encounter and see the credits in Super Mario 64.",
  ],
  ["tomb-raider", "Tomb Raider", "action-adventure", "Complete the main story of Tomb Raider (1996)."],
  ["final-fantasy-vii", "Final Fantasy VII", "role-playing", "Complete the main story of Final Fantasy VII."],
  [
    "castlevania-symphony-of-the-night",
    "Castlevania: Symphony of the Night",
    "action-adventure",
    "Reach an ending in Castlevania: Symphony of the Night.",
  ],
  ["half-life", "Half-Life", "shooter", "Complete the story of Half-Life."],
  ["starcraft", "StarCraft", "strategy", "Complete all three campaigns in StarCraft."],
  [
    "tony-hawks-pro-skater-2",
    "Tony Hawk’s Pro Skater 2",
    "sports",
    "Complete Career Mode with one skater in Tony Hawk’s Pro Skater 2.",
  ],
  ["the-sims", "The Sims", "simulation", "Grow one household’s net worth to 100,000 simoleons in The Sims."],
  [
    "halo-combat-evolved",
    "Halo: Combat Evolved",
    "shooter",
    "Complete the campaign of Halo: Combat Evolved.",
  ],
  [
    "the-elder-scrolls-iii-morrowind",
    "The Elder Scrolls III: Morrowind",
    "role-playing",
    "Complete the main quest of The Elder Scrolls III: Morrowind.",
  ],
  ["katamari-damacy", "Katamari Damacy", "puzzle", "Complete Make the Moon in Katamari Damacy (2004)."],
  [
    "shadow-of-the-colossus",
    "Shadow of the Colossus",
    "action-adventure",
    "Defeat all sixteen colossi and finish Shadow of the Colossus (2005).",
  ],
  [
    "resident-evil-4",
    "Resident Evil 4",
    "action-adventure",
    "Complete the main story of Resident Evil 4 (2005).",
  ],
  [
    "wii-sports",
    "Wii Sports",
    "sports",
    "Complete one full event in each of the five Wii Sports disciplines.",
  ],
  ["portal", "Portal", "puzzle", "Complete the story of Portal."],
  ["bioshock", "BioShock", "shooter", "Complete the main story of BioShock."],
  ["mass-effect", "Mass Effect", "role-playing", "Complete the main story of Mass Effect."],
  ["braid", "Braid", "puzzle", "Complete the main story of Braid (2008)."],
  ["minecraft", "Minecraft", "sandbox", "Defeat the Ender Dragon in Minecraft."],
  ["dark-souls", "Dark Souls", "role-playing", "Reach an ending in Dark Souls (2011)."],
  ["journey", "Journey", "adventure", "Reach the mountain and finish Journey."],
  ["papers-please", "Papers, Please", "simulation", "Reach an ending in Papers, Please."],
  ["monument-valley", "Monument Valley", "puzzle", "Complete all ten chapters of Monument Valley."],
  ["never-alone", "Never Alone", "platformer", "Complete the main story of Never Alone."],
  ["rocket-league", "Rocket League", "sports", "Win one complete match of Rocket League."],
  [
    "stardew-valley",
    "Stardew Valley",
    "simulation",
    "Complete the Community Center or Joja development in Stardew Valley.",
  ],
  [
    "the-legend-of-zelda-breath-of-the-wild",
    "The Legend of Zelda: Breath of the Wild",
    "action-adventure",
    "Defeat Calamity Ganon and see the credits in The Legend of Zelda: Breath of the Wild.",
  ],
  ["hollow-knight", "Hollow Knight", "action-adventure", "Reach an ending in Hollow Knight."],
  ["celeste", "Celeste", "platformer", "Reach the summit and finish Celeste’s main story."],
  ["beat-saber", "Beat Saber", "rhythm", "Clear one Beat Saber track on Expert difficulty."],
  ["hades", "Hades", "action-adventure", "Escape the Underworld for the first time in Hades."],
  ["elden-ring", "Elden Ring", "role-playing", "Reach an ending in Elden Ring."],
  ["baldurs-gate-3", "Baldur’s Gate 3", "role-playing", "Reach the ending credits in Baldur’s Gate 3."],
] as const;

const EXPECTED_PRIMARY_STYLES = [
  "prismatic-geometric-symbolism",
  "screenprint-night",
  "relief-blockprint",
  "mosaic-tesserae-field",
  "cut-paper-strata",
  "wood-marquetry-landscape",
  "scratchboard-nocturne",
  "fresco-mineral-pigment",
  "contour-atlas-ink",
  "mineral-line-engraving",
  "monoprint-ink-wash",
  "risograph-overprint",
  "stained-glass-field",
  "relief-blockprint",
  "aquatint-atmosphere",
  "luminous-ligne-claire",
  "ceramic-underglaze",
  "prismatic-geometric-symbolism",
  "charcoal-pastel-weather",
  "screenprint-night",
  "scratchboard-nocturne",
  "cyanotype-field-study",
  "mosaic-tesserae-field",
  "risograph-overprint",
  "matte-gouache-editorial",
  "luminous-ligne-claire",
  "fresco-mineral-pigment",
  "stained-glass-field",
  "plein-air-broken-color",
  "charcoal-pastel-weather",
  "thread-painted-embroidery",
  "prismatic-geometric-symbolism",
  "ceramic-underglaze",
  "luminous-ligne-claire",
  "woven-tapestry-field",
  "pixel-cluster-landscape",
  "mineral-line-engraving",
  "cut-paper-strata",
  "relief-blockprint",
  "matte-gouache-editorial",
  "watercolor-naturalist-study",
  "stained-glass-field",
  "thread-painted-embroidery",
  "luminous-ligne-claire",
  "monoprint-ink-wash",
  "pixel-cluster-landscape",
  "screenprint-night",
  "ceramic-underglaze",
  "aquatint-atmosphere",
  "luminous-ligne-claire",
] as const;

describe("the curated 50-video-game authoring edition", () => {
  it("freezes the exact fifty game identities and honest per-game completion criteria", () => {
    expect(videoGameAuthoringEdition).toEqual({
      schemaVersion: 1,
      catalogueId: "video-games-played",
      edition: "2026-08-27.badge-editorial-50@1",
      declaredCount: 50,
      scope:
        "Fifty single-game achievements spanning arcade, console, computer, mobile, and virtual-reality play.",
    });
    expect(
      videoGameAuthoringRecords.map(({ slug, gameTitle, category, criterion }) => [
        slug,
        gameTitle,
        category,
        criterion,
      ]),
    ).toEqual(EXPECTED_GAMES);
    expect(new Set(videoGameAuthoringRecords.map(({ definitionId }) => definitionId)).size).toBe(50);
    expect(new Set(videoGameAuthoringRecords.map(({ slug }) => slug)).size).toBe(50);
    for (const game of videoGameAuthoringRecords) {
      expect(game.definitionId).toBe(`played-video-game-${game.slug}`);
      expect(game.title).toBe(`Played ${game.gameTitle}`);
      expect(game.artBrief.badgeKey).toBe(`video-games-played/${game.slug}`);
      expect(game.criterion).not.toBe(`Reach a personally meaningful completion point in ${game.gameTitle}.`);
    }
  });

  it("uses three original symbolic forms and the complete campaign-wide rights exclusions", () => {
    const forbiddenPositiveDirection =
      /box art|key art|screenshot|gameplay capture|\bUI\b|\bHUD\b|logo|wordmark|franchise emblem|character|creature|vehicle|signature item|trade dress/iu;
    for (const game of videoGameAuthoringRecords) {
      expect(game.artBrief.themeCues).toHaveLength(3);
      expect(game.artBrief.requiredMotifs).toEqual([game.relationship]);
      expect(game.artBrief.excludedMotifs).toEqual([
        "box art, key art, screenshots, gameplay captures, or copied scene compositions",
        "interface, UI, HUD, score display, menu, or map imagery",
        "logos, wordmarks, franchise emblems, publisher marks, or typography",
        "recognizable characters, creatures, vehicles, items, or branded equipment",
        "commercial trade dress, official palettes, promotional styling, or adaptation imagery",
      ]);
      expect(
        [
          game.artBrief.description,
          ...game.artBrief.themeCues,
          ...game.artBrief.requiredMotifs,
          ...game.artBrief.moodCues,
          ...game.artBrief.paletteCues,
        ].join(" "),
        game.gameTitle,
      ).not.toMatch(forbiddenPositiveDirection);
      expect(game.artBriefProvenance).toEqual({
        kind: "curated-editorial",
        note: "Original Badge editorial abstraction for one video game; the title establishes identity only, and no official or commercial game artwork is a visual source.",
        sourceUrls: [],
      });
    }
  });

  it("gates the full style library and the preferred luminous cadence", () => {
    const allStyles = videoGameAuthoringRecords.flatMap(({ candidateStyles }) => candidateStyles);
    const primaryStyles = videoGameAuthoringRecords.map(({ candidateStyles }) => candidateStyles[0]);
    expect(primaryStyles).toEqual(EXPECTED_PRIMARY_STYLES);
    for (const game of videoGameAuthoringRecords) {
      expect(new Set(game.candidateStyles).size, game.gameTitle).toBe(3);
      for (const styleId of game.candidateStyles) expect(findArtStyle(styleId)).toBeTruthy();
    }
    expect(new Set(allStyles)).toEqual(new Set(artStyleLibrary.map(({ id }) => id)));
    expect(new Set(primaryStyles)).toEqual(new Set(artStyleLibrary.map(({ id }) => id)));
    const primaryCounts = new Map(
      primaryStyles.map((styleId) => [
        styleId,
        primaryStyles.filter((candidate) => candidate === styleId).length,
      ]),
    );
    expect(Math.max(...primaryCounts.values())).toBe(5);
    expect(recommendedFrequentArtStyleUsage("luminous-ligne-claire", 50)).toEqual({
      candidateAppearances: 13,
      primarySelections: 5,
    });
    expect(allStyles.filter((styleId) => styleId === "luminous-ligne-claire")).toHaveLength(13);
    expect(
      videoGameAuthoringRecords
        .filter(({ candidateStyles }) => candidateStyles[0] === "luminous-ligne-claire")
        .map(({ slug }) => slug),
    ).toEqual([
      "chrono-trigger",
      "halo-combat-evolved",
      "mass-effect",
      "the-legend-of-zelda-breath-of-the-wild",
      "baldurs-gate-3",
    ]);
    expect(
      videoGameAuthoringRecords
        .filter(({ candidateStyles }) => candidateStyles.slice(1).includes("luminous-ligne-claire"))
        .map(({ slug }) => slug),
    ).toEqual([
      "space-invaders",
      "prince-of-persia",
      "sonic-the-hedgehog",
      "myst",
      "tomb-raider",
      "shadow-of-the-colossus",
      "journey",
      "never-alone",
    ]);
  });

  it("preselects the first source-linked quotation from each game's private bank", () => {
    const quotationIds = new Set<string>();
    for (const game of videoGameAuthoringRecords) {
      const bank = catalogueQuotationBankForDefinition(game.definitionId);
      expect(game.defaultQuotationId).toBe(bank[0].quotationId);
      for (const quotation of bank) {
        expect(quotationIds.has(quotation.quotationId), quotation.quotationId).toBe(false);
        quotationIds.add(quotation.quotationId);
        expect(quotation.sourceUrl).toMatch(/^https:\/\//u);
        expect(quotation.personWikipediaUrl).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//u);
      }
    }
    expect(quotationIds).toHaveProperty("size", 100);
  });

  it("builds 150 unique role-complete candidates and deterministic v2 primary prompts", () => {
    expect(videoGameAuthoringCampaign).toHaveLength(50);
    expect(videoGamePrimaryPrompts).toHaveLength(50);
    const candidateKeys = new Set<string>();
    const promptHashes = new Set<string>();
    for (const [index, project] of videoGameAuthoringCampaign.entries()) {
      const game = videoGameAuthoringRecords[index]!;
      expect(project.projectId).toBe(`video-game-project/${game.slug}`);
      expect(project.definitionId).toBe(game.definitionId);
      expect(project.primaryCandidateKey).toBe(`${game.definitionId}:landmark-witness`);
      expect(project.candidates.map(({ styleId }) => styleId)).toEqual(game.candidateStyles);
      expect(new Set(project.candidates.map(({ role }) => role))).toEqual(
        new Set(["landmark-witness", "emblematic-metaphor", "terrain-memory"]),
      );
      for (const candidate of project.candidates) candidateKeys.add(candidate.candidateKey);

      const entry = videoGamePrimaryPrompts[index]!;
      const fresh = compileManufacturableCandidatePrompt(project.brief, project.candidates[0]);
      expect(entry).toEqual({ definitionId: game.definitionId, compiled: fresh });
      expect(entry.compiled.recipe).toEqual({ id: "badge-source-art", revision: 2 });
      expect(entry.compiled.candidateKey).toBe(project.primaryCandidateKey);
      expect(entry.compiled.prompt).toContain("SMALL-BADGE MANUFACTURING CONTRACT");
      promptHashes.add(createHash("sha256").update(entry.compiled.prompt, "utf8").digest("hex"));
    }
    expect(candidateKeys.size).toBe(150);
    expect(promptHashes.size).toBe(50);
  });
});
