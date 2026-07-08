import { describe, expect, it, vi } from "vitest";

describe("policy", () => {
  it("throws when write tools are disabled", async () => {
    vi.resetModules();
    process.env.WRITE_TOOLS_ENABLED = "false";

    const { requireWriteEnabled } = await import("../src/safety/policy.js");

    expect(() => requireWriteEnabled()).toThrow("WRITE_DISABLED");
  });
});
