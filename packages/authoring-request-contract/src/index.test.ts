import { describe, expect, it } from "vitest";

import { authoringRequestSchema, createAuthoringRequest, verifyAuthoringRequestDigest } from "./index";

const payload = {
  schemaVersion: 1,
  requestId: "019d2d9a-d1e2-7a19-9c01-0123456789ab",
  localDefinitionId: "yosemite-memory",
  semanticRevision: 1,
  title: "Visited Yosemite",
  criterion: "Spend meaningful time in Yosemite National Park.",
} as const;

describe("BadgeAuthoringRequest", () => {
  it("creates and verifies a digest over canonical semantic fields", async () => {
    const request = await createAuthoringRequest(payload);

    expect(request.requestDigest).toBe("117729f6420c5635a2f0677e5ce9ffb701c72a52f87cfe59f3661d67a2145424");
    await expect(verifyAuthoringRequestDigest(request)).resolves.toBe(true);
  });

  it("rejects personal and visual-authoring fields", async () => {
    const request = await createAuthoringRequest(payload);

    expect(() => authoringRequestSchema.parse({ ...request, note: "private" })).toThrow();
    expect(() => authoringRequestSchema.parse({ ...request, prompt: "paint it" })).toThrow();
  });

  it("detects semantic tampering", async () => {
    const request = await createAuthoringRequest(payload);

    await expect(
      verifyAuthoringRequestDigest({ ...request, criterion: "A different criterion." }),
    ).resolves.toBe(false);
  });
});
