import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { fail } from "../mcp/result.js";
import { sanitizeError } from "../safety/sanitize.js";

// Every tool must declare all four hints as explicit booleans so MCP clients and
// directories (Claude, OpenAI, M8ven) can reason about side effects.
// This server only talks to TheBrain (cloud or local desktop), never to an open set of
// external services, so openWorldHint is always false.
export const READ_ONLY_TOOL: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
};

/** Creates something new on each call (thoughts, links, appended notes, plans). */
export const CREATE_TOOL: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false
};

/** Sets state to a target value; repeating the call has no additional effect. */
export const IDEMPOTENT_WRITE_TOOL: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
};

export function toolFailure(defaultCode: string, error: unknown, suggestedAction?: string) {
  const sanitized = sanitizeError(error);
  const known = KNOWN_ERRORS[sanitized.message];
  if (known) {
    return fail(sanitized.message, known.message, known.suggestedAction);
  }
  return fail(defaultCode, sanitized.message, suggestedAction);
}

// Errors thrown internally use their code as the Error message. Map them to a
// human-readable message and a code-specific suggested action so callers are not
// shown the tool's generic default action (e.g. "Check thoughtId." for a missing brainId).
const KNOWN_ERRORS: Record<string, { message: string; suggestedAction: string }> = {
  BRAIN_ID_REQUIRED: {
    message: "No brainId was provided and THEBRAIN_DEFAULT_BRAIN_ID is not set.",
    suggestedAction: "Pass brainId explicitly, or call list_brains and set THEBRAIN_DEFAULT_BRAIN_ID."
  },
  WRITE_DISABLED: {
    message: "Write tools are disabled on this server.",
    suggestedAction: "Set WRITE_TOOLS_ENABLED=true to allow write operations."
  },
  DESTRUCTIVE_DISABLED: {
    message: "Destructive tools are disabled on this server.",
    suggestedAction: "Destructive operations are intentionally blocked; use a non-destructive tool."
  },
  RELATION_REQUIRED: {
    message: "A link relation is required.",
    suggestedAction: "Provide a valid relation for the link."
  },
  NO_PATCH_FIELDS: {
    message: "No fields were provided to update.",
    suggestedAction: "Provide at least one field to change."
  },
  PLAN_NOT_FOUND: {
    message: "The change plan does not exist.",
    suggestedAction: "Check planId or create a new plan with create_change_plan."
  },
  PLAN_EXPIRED: {
    message: "The change plan has expired.",
    suggestedAction: "Create a new plan with create_change_plan and commit it within PLAN_TTL_MINUTES."
  },
  PLAN_NOT_PENDING: {
    message: "The change plan is not pending and cannot be committed or discarded again.",
    suggestedAction: "Inspect the plan with get_change_plan or create a new plan."
  },
  PLAN_VALIDATION_FAILED: {
    message: "The change plan failed validation.",
    suggestedAction: "Review the plan changes and fix the reported validation issues."
  },
  UNSAFE_URL: {
    message: "The URL is not a safe public http(s) URL.",
    suggestedAction: "Use a public http:// or https:// URL that does not point at localhost or private networks."
  },
  LOCAL_APP_TOKEN_REQUIRED: {
    message: "TheBrain Local API token is not configured.",
    suggestedAction: "Set THEBRAIN_LOCAL_API_TOKEN."
  },
  LOCAL_APP_UNAVAILABLE: {
    message: "TheBrain desktop Local API is not reachable.",
    suggestedAction: "Make sure TheBrain desktop is running with the Local API enabled and check THEBRAIN_LOCAL_BASE_URL."
  },
  LOCAL_APP_AUTH_FAILED: {
    message: "TheBrain Local API rejected the token.",
    suggestedAction: "Check THEBRAIN_LOCAL_API_TOKEN."
  },
  LOCAL_APP_ACTION_FAILED: {
    message: "TheBrain Local API rejected the action.",
    suggestedAction: "Check the request parameters and retry."
  }
};

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
