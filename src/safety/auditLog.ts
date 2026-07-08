import { mkdir, appendFile } from "node:fs/promises";
import { dirname } from "node:path";
import { config } from "../config.js";

type AuditPayload = Record<string, unknown>;

function truncate(value: unknown): unknown {
  if (typeof value === "string") return value.length > 500 ? `${value.slice(0, 500)}...` : value;
  if (Array.isArray(value)) return value.map(truncate);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, truncate(item)]));
  }
  return value;
}

export async function auditLog(operation: string, inputSummary: AuditPayload, resultSummary: AuditPayload = {}) {
  if (!config.AUDIT_LOG_ENABLED) return;

  const entry = {
    timestamp: new Date().toISOString(),
    operation,
    inputSummary: truncate(inputSummary),
    resultSummary: truncate(resultSummary),
    requestId: crypto.randomUUID()
  };

  await mkdir(dirname(config.AUDIT_LOG_PATH), { recursive: true });
  await appendFile(config.AUDIT_LOG_PATH, `${JSON.stringify(entry)}\n`, "utf8");
}
