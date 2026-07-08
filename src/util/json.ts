export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function maybeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
