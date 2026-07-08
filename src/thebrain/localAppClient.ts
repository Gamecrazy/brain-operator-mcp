import { config } from "../config.js";
import { fetchWithTimeout } from "../util/fetchWithTimeout.js";
import { TheBrainApiError } from "./errors.js";

export type AppStateTab = {
  id?: string | null;
  brainId?: string | null;
  brainName?: string | null;
  isActive?: boolean;
  activeThoughtId?: string | null;
  activeThoughtName?: string | null;
};

export type AppState = {
  currentBrainId?: string | null;
  currentBrainName?: string | null;
  activeThoughtId?: string | null;
  activeThoughtName?: string | null;
  isLoggedIn?: boolean;
  userId?: string | null;
  tabs?: AppStateTab[] | null;
};

export class LocalAppClient {
  constructor(
    private readonly apiKey = config.THEBRAIN_API_KEY,
    private readonly baseUrl = config.THEBRAIN_LOCAL_BASE_URL
  ) {}

  async request<T>(method: string, path: string): Promise<T> {
    const url = new URL(path.replace(/^\/+/, ""), ensureTrailingSlash(this.baseUrl));

    try {
      const response = await fetchWithTimeout(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        }
      });
      const contentType = response.headers.get("content-type") ?? "";
      const raw = await response.text();

      if (!response.ok) {
        throw new TheBrainApiError(response.status, classifyLocalAppHttpError(response.status), method, path);
      }

      if (!raw) return { success: true } as T;
      if (contentType.includes("application/json")) return JSON.parse(raw) as T;
      return raw as T;
    } catch (error) {
      if (error instanceof TheBrainApiError) throw error;
      throw new TheBrainApiError(503, "LOCAL_APP_UNAVAILABLE", method, path);
    }
  }

  getAppState() {
    return this.request<AppState>("GET", "app/state");
  }

  openBrain(brainId: string) {
    return this.request<unknown>("POST", `app/brain/${encodeURIComponent(brainId)}/open`);
  }

  closeBrainTab(brainId: string) {
    return this.request<unknown>("POST", `app/brain/${encodeURIComponent(brainId)}/close`);
  }

  activateThought(brainId: string, thoughtId: string) {
    return this.request<unknown>(
      "POST",
      `app/brain/${encodeURIComponent(brainId)}/thought/${encodeURIComponent(thoughtId)}/activate`
    );
  }
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function classifyLocalAppHttpError(status: number) {
  if (status === 401 || status === 403) return "LOCAL_APP_AUTH_FAILED";
  return "LOCAL_APP_ACTION_FAILED";
}
