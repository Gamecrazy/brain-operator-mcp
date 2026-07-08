export function redactSecret(value: string): string {
  if (!value) return value;
  if (value.length <= 8) return "[REDACTED]";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function sanitizeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [REDACTED]")
    };
  }

  return { name: "UnknownError", message: "Unknown error" };
}
