import { describe, expect, it } from "vitest";

import { StudioOperationGate } from "./studio-operation.js";

describe("StudioOperationGate", () => {
  it("synchronously excludes publish while upload is still active", () => {
    const gate = new StudioOperationGate();

    expect(gate.tryBegin("uploading")).toBe(true);
    expect(gate.tryBegin("publishing")).toBe(false);
    expect(gate.active).toBe("uploading");
    gate.finish("uploading");
    expect(gate.tryBegin("publishing")).toBe(true);
  });

  it("does not let an older completion clear a newer operation", () => {
    const gate = new StudioOperationGate();
    expect(gate.tryBegin("processing")).toBe(true);
    gate.finish("uploading");
    expect(gate.active).toBe("processing");
  });

  it("synchronously excludes uploads and edits once publication begins", () => {
    const gate = new StudioOperationGate();

    expect(gate.tryBegin("publishing")).toBe(true);
    expect(gate.tryBegin("uploading")).toBe(false);
    expect(gate.tryBegin("processing")).toBe(false);
    expect(gate.active).toBe("publishing");
  });
});
