import { config } from "../config.js";

export class BrainIdRequiredError extends Error {
  constructor() {
    super("BRAIN_ID_REQUIRED");
    this.name = "BrainIdRequiredError";
  }
}

export function resolveBrainId(brainId?: string): string {
  const resolved = brainId || config.THEBRAIN_DEFAULT_BRAIN_ID;
  if (!resolved) throw new BrainIdRequiredError();
  return resolved;
}

export function isSafePublicUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) return false;

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost")) return false;
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd")) return false;
  if (host.startsWith("169.254.")) return false;

  const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    if (a === 10) return false;
    if (a === 127) return false;
    if (a === 192 && b === 168) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 169 && b === 254) return false;
  }

  return true;
}
