export type FetchWithTimeoutOptions = RequestInit & {
  timeoutMs?: number;
};

export async function fetchWithTimeout(url: URL, options: FetchWithTimeoutOptions = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}
