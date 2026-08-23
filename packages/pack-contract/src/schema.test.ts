import { describe, expect, it } from "vitest";

import { packManifestSchema } from "./schema.js";
import { catalogueManifestFixture } from "./test-fixtures.js";

describe("closed pack schemas", () => {
  it("accepts a complete catalogue manifest", () => {
    expect(packManifestSchema.parse(catalogueManifestFixture).kind).toBe("catalogue");
  });

  it("rejects unknown manifest fields", () => {
    expect(() =>
      packManifestSchema.parse({ ...catalogueManifestFixture, generateMissingArt: true }),
    ).toThrow();
  });

  it.each(["image/jpeg", "image/webp"])(
    "rejects %s objects at the published-pack schema boundary",
    (mimeType) => {
      const manifest = {
        ...catalogueManifestFixture,
        objects: [{ ...catalogueManifestFixture.objects[0], mimeType }],
      };

      expect(() => packManifestSchema.parse(manifest)).toThrow(/normalize.*metadata-free PNG/i);
    },
  );

  it("rejects semantic fields in a targeted visual entry", () => {
    const visual = catalogueManifestFixture.entries[0].visual;
    const targeted = {
      ...catalogueManifestFixture,
      kind: "targeted-visual",
      target: {
        localDefinitionId: "local-yosemite",
        semanticRevision: 1,
        requestId: "019d2d9a-d1e2-7a19-9c01-0123456789ab",
        requestDigest: "a".repeat(64),
        title: "Must not cross the boundary",
      },
      visual,
    };
    delete (targeted as Partial<typeof targeted>).collections;
    delete (targeted as Partial<typeof targeted>).entries;

    expect(() => packManifestSchema.parse(targeted)).toThrow();
  });

  it("rejects dangling collection and composite references", () => {
    const danglingCollection = {
      ...catalogueManifestFixture,
      entries: [
        {
          ...catalogueManifestFixture.entries[0],
          definition: {
            ...catalogueManifestFixture.entries[0].definition,
            collectionIds: ["missing-collection"],
          },
        },
      ],
    };
    const danglingComposite = {
      ...catalogueManifestFixture,
      entries: [
        {
          ...catalogueManifestFixture.entries[0],
          definition: {
            ...catalogueManifestFixture.entries[0].definition,
            compositeRule: {
              version: 1 as const,
              kind: "allOf" as const,
              definitionIds: ["missing-definition"],
            },
          },
        },
      ],
    };

    expect(() => packManifestSchema.parse(danglingCollection)).toThrow(/collection/i);
    expect(() => packManifestSchema.parse(danglingComposite)).toThrow(/composite/i);
  });

  it("rejects source-art role confusion and same-version dependency forks", () => {
    const wrongRole = {
      ...catalogueManifestFixture,
      objects: [{ ...catalogueManifestFixture.objects[0], role: "normal-map" as const }],
    };
    const themeRef = catalogueManifestFixture.dependencies[0];
    const dependencyFork = {
      ...catalogueManifestFixture,
      dependencies: [themeRef, { ...themeRef, packDigest: "c".repeat(64) }],
    };

    expect(() => packManifestSchema.parse(wrongRole)).toThrow(/source-art/i);
    expect(() => packManifestSchema.parse(dependencyFork)).toThrow(/duplicate dependency/i);
  });
});
