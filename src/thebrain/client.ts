import { config } from "../config.js";
import { fetchWithTimeout } from "../util/fetchWithTimeout.js";
import { endpoints } from "./endpoints.js";
import { TheBrainApiError } from "./errors.js";

export type RequestOptions = {
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  idempotencyKey?: string;
};

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class TheBrainClient {
  constructor(
    private readonly apiKey = config.THEBRAIN_API_KEY,
    private readonly baseUrl = config.THEBRAIN_BASE_URL
  ) {}

  async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const attempts = method.toUpperCase() === "GET" || options.idempotencyKey ? 3 : 1;
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await this.requestOnce<T>(method, path, options);
      } catch (error) {
        lastError = error;
        if (
          !(error instanceof TheBrainApiError) ||
          !RETRYABLE_STATUSES.has(error.status) ||
          attempt === attempts - 1
        ) {
          throw error;
        }
        await delay(50 * 2 ** attempt);
      }
    }

    throw lastError;
  }

  private async requestOnce<T>(method: string, path: string, options: RequestOptions): Promise<T> {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    try {
      const response = await fetchWithTimeout(url, {
        method,
        timeoutMs: options.timeoutMs,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
          ...(options.headers ?? {})
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined
      });

      const contentType = response.headers.get("content-type") ?? "";
      const raw = await response.text();

      if (!response.ok) {
        throw new TheBrainApiError(response.status, raw || response.statusText, method, path);
      }

      if (!raw) return { success: true } as T;
      if (contentType.includes("application/json")) return JSON.parse(raw) as T;
      return raw as T;
    } catch (error) {
      if (error instanceof TheBrainApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new TheBrainApiError(408, "TheBrain API request timed out", method, path);
      }
      throw error;
    }
  }

  listBrains() {
    return this.request<unknown>("GET", endpoints.listBrains);
  }

  getBrain(brainId: string) {
    return this.request<unknown>("GET", endpoints.getBrain(brainId));
  }

  searchThoughts(input: {
    brainId: string;
    queryText: string;
    maxResults?: number;
    onlySearchThoughtNames?: boolean;
  }) {
    return this.request<unknown>("GET", endpoints.searchThoughts(input.brainId), {
      query: {
        queryText: input.queryText,
        maxResults: input.maxResults,
        onlySearchThoughtNames: input.onlySearchThoughtNames
      }
    });
  }

  getThought(brainId: string, thoughtId: string) {
    return this.request<unknown>("GET", endpoints.getThought(brainId, thoughtId));
  }

  getThoughtGraph(brainId: string, thoughtId: string) {
    return this.request<unknown>("GET", endpoints.getThoughtGraph(brainId, thoughtId));
  }

  createThought(brainId: string, body: unknown, idempotencyKey?: string) {
    return this.request<unknown>("POST", endpoints.createThought(brainId), { body, idempotencyKey });
  }

  updateThought(brainId: string, thoughtId: string, patchDocument: unknown[]) {
    return this.request<unknown>("PATCH", endpoints.updateThought(brainId, thoughtId), {
      body: { patchDocument }
    });
  }

  createLink(brainId: string, body: unknown, idempotencyKey?: string) {
    return this.request<unknown>("POST", endpoints.createLink(brainId), { body, idempotencyKey });
  }

  getNote(brainId: string, thoughtId: string, format: "markdown" | "html" | "text") {
    const suffix = format === "html" ? "/html" : format === "text" ? "/text" : "";
    return this.request<unknown>("GET", endpoints.getNote(brainId, thoughtId, suffix));
  }

  appendNote(brainId: string, thoughtId: string, markdown: string) {
    return this.request<unknown>("POST", endpoints.appendNote(brainId, thoughtId), {
      body: { markdown }
    });
  }

  addUrlAttachment(brainId: string, thoughtId: string, url: string, name?: string) {
    return this.request<unknown>("POST", endpoints.addUrlAttachment(brainId, thoughtId), {
      body: { url, name }
    });
  }

  listAttachments(brainId: string, thoughtId: string) {
    return this.request<unknown>("GET", endpoints.listAttachments(brainId, thoughtId));
  }
}
