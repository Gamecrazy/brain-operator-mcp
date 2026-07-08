import { describe, expect, it } from "vitest";
import {
  ActivateThoughtInputSchema,
  AddUrlAttachmentInputSchema,
  AppendNoteInputSchema,
  AppBrainInputSchema,
  CreateNoteUpdatePlanInputSchema,
  ReplaceNoteInputSchema
} from "../src/mcp/schemas.js";

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

  it("rejects replacement notes over the configured limit", () => {
    expect(() =>
      ReplaceNoteInputSchema.parse({
        thoughtId: "thought_1",
        markdown: "x".repeat(10001)
      })
    ).toThrow();
  });

  it("rejects note update plans over the configured limit", () => {
    expect(() =>
      CreateNoteUpdatePlanInputSchema.parse({
        thoughtId: "thought_1",
        markdown: "x".repeat(10001)
      })
    ).toThrow();
  });

  it("parses local app brain inputs with optional default brain fallback", () => {
    expect(AppBrainInputSchema.parse({})).toEqual({});
    expect(AppBrainInputSchema.parse({ brainId: "brain_1" })).toEqual({ brainId: "brain_1" });
  });

  it("requires a thoughtId for local app activation", () => {
    expect(() => ActivateThoughtInputSchema.parse({ brainId: "brain_1" })).toThrow();
    expect(ActivateThoughtInputSchema.parse({ brainId: "brain_1", thoughtId: "thought_1" })).toEqual({
      brainId: "brain_1",
      thoughtId: "thought_1"
    });
  });
});
