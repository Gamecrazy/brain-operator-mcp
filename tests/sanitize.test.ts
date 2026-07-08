import { describe, expect, it } from "vitest";
import { redactSecret, sanitizeError } from "../src/safety/sanitize.js";

describe("sanitize", () => {
  it("redacts bearer tokens from error messages", () => {
    const sanitized = sanitizeError(new Error("Request failed: Bearer abcdef123456"));

    expect(sanitized.message).toContain("Bearer [REDACTED]");
    expect(sanitized.message).not.toContain("abcdef123456");
  });

  it("does not return API keys in full", () => {
    expect(redactSecret("abcdef1234567890")).toBe("abcd...7890");
    expect(redactSecret("short")).toBe("[REDACTED]");
  });
});
