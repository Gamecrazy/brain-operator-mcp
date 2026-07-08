export type ToolSuccess<T> = {
  ok: true;
  data: T;
  warning?: string;
};

export type ToolFailure = {
  ok: false;
  code: string;
  message: string;
  recoverable: boolean;
  suggestedAction?: string;
};

export function ok<T>(data: T, text = "Done.", meta: Record<string, unknown> = {}) {
  return {
    structuredContent: { ok: true, data } satisfies ToolSuccess<T>,
    content: [{ type: "text" as const, text }],
    _meta: meta
  };
}

export function fail(code: string, message: string, suggestedAction?: string, recoverable = true) {
  return {
    structuredContent: { ok: false, code, message, recoverable, suggestedAction } satisfies ToolFailure,
    content: [{ type: "text" as const, text: `${code}: ${message}` }],
    _meta: {}
  };
}
