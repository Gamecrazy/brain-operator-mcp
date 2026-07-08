import { config } from "../config.js";

export const policy = {
  allowRead: true,
  allowWrite: config.WRITE_TOOLS_ENABLED,
  allowDestructive: config.DESTRUCTIVE_TOOLS_ENABLED,
  maxNoteChars: config.MAX_NOTE_CHARS,
  maxSearchResults: config.MAX_SEARCH_RESULTS,
  maxPlanChanges: config.MAX_PLAN_CHANGES,
  planTtlMinutes: config.PLAN_TTL_MINUTES
};

export function requireWriteEnabled() {
  if (!policy.allowWrite) {
    const error = new Error("WRITE_DISABLED");
    error.name = "WriteDisabledError";
    throw error;
  }
}

export function requireDestructiveEnabled() {
  if (!policy.allowDestructive) {
    const error = new Error("DESTRUCTIVE_DISABLED");
    error.name = "DestructiveDisabledError";
    throw error;
  }
}
