import { describe, expect, it } from "vitest";
import { AddUrlAttachmentInputSchema, AppendNoteInputSchema } from "../src/mcp/schemas.js";

describe("tool schemas", () => {
  it("rejects unsafe URL attachments", () => {
    expect(() =>
      AddUrlAttachmentInputSchema.parse({
        thoughtId: "thought_1",
        url: "http://127.0.0.1/admin"
      })
    ).toThrow();
  });

  it("rejects notes over the configured limit", () => {
    expect(() =>
      AppendNoteInputSchema.parse({
        thoughtId: "thought_1",
        markdown: "x".repeat(10001)
      })
    ).toThrow();
  });
});
