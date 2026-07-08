import { fail } from "../mcp/result.js";
import { sanitizeError } from "../safety/sanitize.js";

export function toolFailure(defaultCode: string, error: unknown, suggestedAction?: string) {
  const sanitized = sanitizeError(error);
  const message = sanitized.message;
  const code = knownCode(message) ?? defaultCode;
  return fail(code, message, suggestedAction);
}

function knownCode(message: string): string | null {
  const known = [
    "BRAIN_ID_REQUIRED",
    "WRITE_DISABLED",
    "DESTRUCTIVE_DISABLED",
    "RELATION_REQUIRED",
    "NO_PATCH_FIELDS",
    "PLAN_NOT_FOUND",
    "PLAN_EXPIRED",
    "PLAN_NOT_PENDING",
    "PLAN_VALIDATION_FAILED",
    "UNSAFE_URL",
    "LOCAL_APP_TOKEN_REQUIRED",
    "LOCAL_APP_UNAVAILABLE",
    "LOCAL_APP_AUTH_FAILED",
    "LOCAL_APP_ACTION_FAILED"
  ];
  return known.includes(message) ? message : null;
}

export function summaryArray(raw: unknown, limit = 10): unknown[] {
  if (Array.isArray(raw)) return raw.slice(0, limit);
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    for (const key of ["brains", "results", "thoughts", "attachments", "items"]) {
      const value = record[key];
      if (Array.isArray(value)) return value.slice(0, limit);
    }
  }
  return [];
}

export function extractId(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;
  for (const key of ["id", "thoughtId", "linkId", "attachmentId"]) {
    const value = record[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}
