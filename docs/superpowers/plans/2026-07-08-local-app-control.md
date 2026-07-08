# Local App Control MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add MCP tools that control the local TheBrain desktop client through TheBrain Local API.

**Architecture:** Add a focused `LocalAppClient` for `/api/app/*` endpoints and a separate app-control tool module. Keep existing TheBrain data tools and their cloud-compatible adapter contracts unchanged.

**Tech Stack:** TypeScript, Node fetch, Zod, MCP TypeScript SDK, Vitest.

## Global Constraints

- Never commit `.env` or secrets.
- Keep TheBrain API key in `THEBRAIN_API_KEY` only.
- All write tools must call `requireWriteEnabled()`.
- Batch writes must go through `create_change_plan` then `commit_change_plan`.
- Do not add destructive tools unless explicitly requested and separately reviewed.
- Preserve MCP tool contracts when changing TheBrain adapter internals.
- Update `docs/development.md` when architecture, testing, or tool behavior changes.
- Do not add arbitrary Local API passthrough.
- `close_brain_tab` must be gated by `WRITE_TOOLS_ENABLED=true`.

---

## File Structure

- Create `src/thebrain/localAppClient.ts`: local desktop app-control HTTP adapter and local error classification.
- Modify `src/config.ts`: add `THEBRAIN_LOCAL_BASE_URL`.
- Modify `src/mcp/schemas.ts`: add app-control input schemas.
- Create `src/tools/app.tools.ts`: register `get_app_state`, `open_brain`, `activate_thought`, and `close_brain_tab`.
- Modify `src/tools/registerAllTools.ts`: add `localApp` to context and register app tools.
- Modify `src/mcp/createServer.ts`: instantiate `LocalAppClient`.
- Modify `src/tools/toolUtils.ts`: recognize new local app error codes.
- Create `tests/localAppClient.test.ts`: adapter tests.
- Create `tests/appTools.test.ts`: tool registration and safety behavior tests.
- Modify `tests/toolSchemas.test.ts`: schema coverage for app tools.
- Modify `.env.example`, `README.md`, `docs/tool-contract.md`, and `docs/development.md`: document setup and contracts.

---

### Task 1: Local App Client

**Files:**
- Create: `src/thebrain/localAppClient.ts`
- Modify: `src/config.ts`
- Modify: `src/tools/toolUtils.ts`
- Test: `tests/localAppClient.test.ts`

**Interfaces:**
- Consumes: `config.THEBRAIN_API_KEY`, `config.THEBRAIN_LOCAL_BASE_URL`, `fetchWithTimeout()`, `TheBrainApiError`.
- Produces:
  - `type AppStateTab`
  - `type AppState`
  - `class LocalAppClient`
  - `LocalAppClient.getAppState(): Promise<AppState>`
  - `LocalAppClient.openBrain(brainId: string): Promise<unknown>`
  - `LocalAppClient.closeBrainTab(brainId: string): Promise<unknown>`
  - `LocalAppClient.activateThought(brainId: string, thoughtId: string): Promise<unknown>`

- [ ] **Step 1: Write the failing LocalAppClient tests**

Create `tests/localAppClient.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalAppClient } from "../src/thebrain/localAppClient.js";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("LocalAppClient", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("gets app state from the configured local API base URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        currentBrainId: "brain_1",
        currentBrainName: "Main Brain",
        activeThoughtId: "thought_1",
        activeThoughtName: "Home",
        isLoggedIn: true,
        userId: "user_1",
        tabs: [
          {
            id: "tab_1",
            brainId: "brain_1",
            brainName: "Main Brain",
            isActive: true,
            activeThoughtId: "thought_1",
            activeThoughtName: "Home"
          }
        ]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new LocalAppClient("local_key", "http://localhost:8001/api");
    const result = await client.getAppState();

    expect(result.currentBrainId).toBe("brain_1");
    expect(result.tabs).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://localhost:8001/api/app/state"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer local_key" })
      })
    );
  });

  it("posts app-control actions under /app", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new LocalAppClient("local_key", "http://localhost:8001/api/");
    await client.openBrain("brain_1");
    await client.activateThought("brain_1", "thought_1");
    await client.closeBrainTab("brain_1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      new URL("http://localhost:8001/api/app/brain/brain_1/open"),
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      new URL("http://localhost:8001/api/app/brain/brain_1/thought/thought_1/activate"),
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      new URL("http://localhost:8001/api/app/brain/brain_1/close"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("maps auth failures to LOCAL_APP_AUTH_FAILED without leaking the key", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Invalid API Key local_key", { status: 401 })));

    const client = new LocalAppClient("local_key", "http://localhost:8001/api");

    await expect(client.getAppState()).rejects.toMatchObject({
      status: 401,
      message: "LOCAL_APP_AUTH_FAILED"
    });
  });

  it("maps connection failures to LOCAL_APP_UNAVAILABLE", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    const client = new LocalAppClient("local_key", "http://localhost:8001/api");

    await expect(client.getAppState()).rejects.toMatchObject({
      status: 503,
      message: "LOCAL_APP_UNAVAILABLE"
    });
  });
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run:

```bash
npm test -- tests/localAppClient.test.ts
```

Expected: FAIL because `src/thebrain/localAppClient.ts` does not exist.

- [ ] **Step 3: Add `THEBRAIN_LOCAL_BASE_URL` config**

Modify `src/config.ts` so the schema includes the local API base URL:

```ts
const EnvSchema = z.object({
  THEBRAIN_API_KEY: z.string().min(1),
  THEBRAIN_BASE_URL: z.string().url().default("https://api.bra.in"),
  THEBRAIN_LOCAL_BASE_URL: z.string().url().default("http://localhost:8001/api"),
  THEBRAIN_MODE: z.enum(["cloud", "local"]).default("cloud"),
  THEBRAIN_DEFAULT_BRAIN_ID: z.string().optional().default(""),
```

- [ ] **Step 4: Implement `LocalAppClient`**

Create `src/thebrain/localAppClient.ts`:

```ts
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
      if (error instanceof Error && error.name === "AbortError") {
        throw new TheBrainApiError(503, "LOCAL_APP_UNAVAILABLE", method, path);
      }
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
```

- [ ] **Step 5: Add local error codes to `toolUtils`**

Modify the `known` array in `src/tools/toolUtils.ts`:

```ts
    "UNSAFE_URL",
    "LOCAL_APP_UNAVAILABLE",
    "LOCAL_APP_AUTH_FAILED",
    "LOCAL_APP_ACTION_FAILED"
```

- [ ] **Step 6: Run LocalAppClient tests to verify they pass**

Run:

```bash
npm test -- tests/localAppClient.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 1**

```bash
git add src/config.ts src/thebrain/localAppClient.ts src/tools/toolUtils.ts tests/localAppClient.test.ts
git commit -m "feat: add local app client"
```

---

### Task 2: MCP Tool Registration

**Files:**
- Modify: `src/mcp/schemas.ts`
- Create: `src/tools/app.tools.ts`
- Modify: `src/tools/registerAllTools.ts`
- Modify: `src/mcp/createServer.ts`
- Test: `tests/appTools.test.ts`
- Test: `tests/toolSchemas.test.ts`

**Interfaces:**
- Consumes:
  - `LocalAppClient` methods from Task 1.
  - `resolveBrainId(input.brainId)`.
  - `requireWriteEnabled()`.
  - `auditLog(action, input, result?)`.
- Produces:
  - `AppBrainInputSchema`
  - `ActivateThoughtInputSchema`
  - `registerAppTools(server: McpServer, ctx: ToolContext): void`
  - `ToolContext.localApp: LocalAppClient`

- [ ] **Step 1: Write failing schema tests**

Modify `tests/toolSchemas.test.ts`:

```ts
import {
  ActivateThoughtInputSchema,
  AddUrlAttachmentInputSchema,
  AppendNoteInputSchema,
  AppBrainInputSchema
} from "../src/mcp/schemas.js";
```

Add:

```ts
  it("parses local app brain inputs with optional default brain fallback", () => {
    expect(AppBrainInputSchema.parse({})).toEqual({});
    expect(AppBrainInputSchema.parse({ brainId: "brain_1" })).toEqual({ brainId: "brain_1" });
  });

  it("requires a thoughtId for local app activation", () => {
    expect(() => ActivateThoughtInputSchema.parse({ brainId: "brain_1" })).toThrow();
    expect(ActivateThoughtInputSchema.parse({ brainId: "brain_1", thoughtId: "thought_1" })).toEqual({
      brainId: "brain_1",
      thoughtId: "thought_1"
    });
  });
```

- [ ] **Step 2: Write failing app tool tests**

Create `tests/appTools.test.ts`:

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerAppTools } from "../src/tools/app.tools.js";

function makeServer() {
  return new McpServer({ name: "test", version: "0.0.0" });
}

function toolHandlers() {
  const handlers = new Map<string, (input: any) => Promise<any>>();
  const server = makeServer();
  vi.spyOn(server, "registerTool").mockImplementation((name: string, _config: any, handler: any) => {
    handlers.set(name, handler);
    return undefined as never;
  });
  return { server, handlers };
}

describe("app tools", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.WRITE_TOOLS_ENABLED = "true";
    process.env.THEBRAIN_DEFAULT_BRAIN_ID = "brain_default";
  });

  it("registers local app control tools", () => {
    const { server, handlers } = toolHandlers();
    registerAppTools(server, {
      brain: {} as any,
      localApp: {} as any,
      planStore: {} as any
    });

    expect([...handlers.keys()].sort()).toEqual([
      "activate_thought",
      "close_brain_tab",
      "get_app_state",
      "open_brain"
    ]);
  });

  it("returns app state from Local API", async () => {
    const { server, handlers } = toolHandlers();
    registerAppTools(server, {
      brain: {} as any,
      localApp: {
        getAppState: vi.fn().mockResolvedValue({ currentBrainId: "brain_1", tabs: [] })
      } as any,
      planStore: {} as any
    });

    const result = await handlers.get("get_app_state")?.({});

    expect(result.structuredContent).toEqual({
      ok: true,
      data: { state: { currentBrainId: "brain_1", tabs: [] } }
    });
  });

  it("opens the default brain when brainId is omitted", async () => {
    const openBrain = vi.fn().mockResolvedValue({ success: true });
    const { server, handlers } = toolHandlers();
    registerAppTools(server, {
      brain: {} as any,
      localApp: { openBrain } as any,
      planStore: {} as any
    });

    const result = await handlers.get("open_brain")?.({});

    expect(openBrain).toHaveBeenCalledWith("brain_default");
    expect(result.structuredContent.ok).toBe(true);
  });

  it("blocks app-control writes when writes are disabled", async () => {
    process.env.WRITE_TOOLS_ENABLED = "false";
    vi.resetModules();
    const { registerAppTools: registerFreshAppTools } = await import("../src/tools/app.tools.js");
    const openBrain = vi.fn();
    const { server, handlers } = toolHandlers();
    registerFreshAppTools(server, {
      brain: {} as any,
      localApp: { openBrain } as any,
      planStore: {} as any
    });

    const result = await handlers.get("open_brain")?.({ brainId: "brain_1" });

    expect(openBrain).not.toHaveBeenCalled();
    expect(result.structuredContent).toMatchObject({
      ok: false,
      code: "WRITE_DISABLED"
    });
  });
});
```

- [ ] **Step 3: Run schema and app tool tests to verify they fail**

Run:

```bash
npm test -- tests/toolSchemas.test.ts tests/appTools.test.ts
```

Expected: FAIL because app schemas and tools do not exist.

- [ ] **Step 4: Add app-control schemas**

Modify `src/mcp/schemas.ts`:

```ts
export const AppBrainInputSchema = z.object({
  brainId: z.string().optional()
});

export const ActivateThoughtInputSchema = z.object({
  brainId: z.string().optional(),
  thoughtId: z.string().min(1)
});
```

- [ ] **Step 5: Add `app.tools.ts`**

Create `src/tools/app.tools.ts`:

```ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ok } from "../mcp/result.js";
import { ActivateThoughtInputSchema, AppBrainInputSchema, HealthCheckInputSchema } from "../mcp/schemas.js";
import { auditLog } from "../safety/auditLog.js";
import { requireWriteEnabled } from "../safety/policy.js";
import { resolveBrainId } from "../safety/validators.js";
import type { ToolContext } from "./registerAllTools.js";
import { toolFailure } from "./toolUtils.js";

export function registerAppTools(server: McpServer, ctx: ToolContext) {
  server.registerTool(
    "get_app_state",
    {
      description: "Get the local TheBrain desktop client's active brain, active thought, login state, and open tabs. Local API only.",
      inputSchema: HealthCheckInputSchema
    },
    async () => {
      try {
        const state = await ctx.localApp.getAppState();
        return ok({ state }, "Local app state loaded.", { raw: state });
      } catch (error) {
        return toolFailure("LOCAL_APP_UNAVAILABLE", error, "Enable TheBrain Local API and check THEBRAIN_LOCAL_BASE_URL.");
      }
    }
  );

  server.registerTool(
    "open_brain",
    {
      description: "Open a brain tab in the local TheBrain desktop client. Local API only.",
      inputSchema: AppBrainInputSchema
    },
    async (input) => {
      try {
        requireWriteEnabled();
        const brainId = resolveBrainId(input.brainId);
        const raw = await ctx.localApp.openBrain(brainId);
        await auditLog("open_brain", { brainId });
        return ok({ brainId }, "Brain opened in local app.", { raw });
      } catch (error) {
        return toolFailure("LOCAL_APP_ACTION_FAILED", error, "Check brainId and Local API settings.");
      }
    }
  );

  server.registerTool(
    "activate_thought",
    {
      description: "Activate a thought in the local TheBrain desktop client. Local API only.",
      inputSchema: ActivateThoughtInputSchema
    },
    async (input) => {
      try {
        requireWriteEnabled();
        const brainId = resolveBrainId(input.brainId);
        const raw = await ctx.localApp.activateThought(brainId, input.thoughtId);
        await auditLog("activate_thought", { brainId, thoughtId: input.thoughtId });
        return ok({ brainId, thoughtId: input.thoughtId }, "Thought activated in local app.", { raw });
      } catch (error) {
        return toolFailure("LOCAL_APP_ACTION_FAILED", error, "Check brainId, thoughtId, and Local API settings.");
      }
    }
  );

  server.registerTool(
    "close_brain_tab",
    {
      description: "Close a brain tab in the local TheBrain desktop client. Local API only.",
      inputSchema: AppBrainInputSchema
    },
    async (input) => {
      try {
        requireWriteEnabled();
        const brainId = resolveBrainId(input.brainId);
        const raw = await ctx.localApp.closeBrainTab(brainId);
        await auditLog("close_brain_tab", { brainId });
        return ok({ brainId }, "Brain tab closed in local app.", { raw });
      } catch (error) {
        return toolFailure("LOCAL_APP_ACTION_FAILED", error, "Check brainId and Local API settings.");
      }
    }
  );
}
```

- [ ] **Step 6: Wire app tools into server context**

Modify `src/tools/registerAllTools.ts`:

```ts
import type { LocalAppClient } from "../thebrain/localAppClient.js";
import { registerAppTools } from "./app.tools.js";
```

Update `ToolContext`:

```ts
export type ToolContext = {
  brain: TheBrainClient;
  localApp: LocalAppClient;
  planStore: PlanStore;
};
```

Update `registerAllTools`:

```ts
  registerHealthTools(server, ctx);
  registerBrainTools(server, ctx);
  registerThoughtTools(server, ctx);
  registerLinkTools(server, ctx);
  registerNoteTools(server, ctx);
  registerAttachmentTools(server, ctx);
  registerAppTools(server, ctx);
  registerPlanTools(server, ctx);
```

Modify `src/mcp/createServer.ts`:

```ts
import { LocalAppClient } from "../thebrain/localAppClient.js";
```

Update the context:

```ts
  registerAllTools(server, {
    brain: new TheBrainClient(),
    localApp: new LocalAppClient(),
    planStore: new FilePlanStore(config.PLAN_STORE_PATH)
  });
```

- [ ] **Step 7: Run schema and app tool tests to verify they pass**

Run:

```bash
npm test -- tests/toolSchemas.test.ts tests/appTools.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit Task 2**

```bash
git add src/mcp/schemas.ts src/tools/app.tools.ts src/tools/registerAllTools.ts src/mcp/createServer.ts tests/appTools.test.ts tests/toolSchemas.test.ts
git commit -m "feat: add local app mcp tools"
```

---

### Task 3: Documentation And Verification

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/tool-contract.md`
- Modify: `docs/development.md`

**Interfaces:**
- Consumes: tool names and config from Tasks 1 and 2.
- Produces: documented setup, local app tool contracts, and development guidance.

- [ ] **Step 1: Update `.env.example`**

Add `THEBRAIN_LOCAL_BASE_URL` near existing TheBrain config:

```dotenv
# Local API used by local desktop app-control tools.
THEBRAIN_LOCAL_BASE_URL=http://localhost:8001/api
```

- [ ] **Step 2: Update README setup and tool list**

Add a Local App Control section to `README.md`:

```md
## Local App Control

The MCP server can also control the local TheBrain desktop client through TheBrain Local API.

1. In TheBrain desktop, enable Local API in settings.
2. Copy the Local API key into `THEBRAIN_API_KEY` in `.env`.
3. Set `THEBRAIN_LOCAL_BASE_URL` if your Local API is not on `http://localhost:8001/api`.

Local-only tools:

- `get_app_state`
- `open_brain`
- `activate_thought`
- `close_brain_tab`

`open_brain`, `activate_thought`, and `close_brain_tab` require `WRITE_TOOLS_ENABLED=true` because they change local client UI state.
```

Add the four tools to the README tool list under a new `Local app control:` group.

- [ ] **Step 3: Update tool contract docs**

Add to `docs/tool-contract.md`:

```md
## Local App Control Tools

- `get_app_state`: no input. Calls `GET /api/app/state` on `THEBRAIN_LOCAL_BASE_URL`.
- `open_brain`: optional `brainId`. Requires writes enabled. Calls `POST /api/app/brain/{brainId}/open`.
- `activate_thought`: optional `brainId`, required `thoughtId`. Requires writes enabled. Calls `POST /api/app/brain/{brainId}/thought/{thoughtId}/activate`.
- `close_brain_tab`: optional `brainId`. Requires writes enabled. Calls `POST /api/app/brain/{brainId}/close`.
```

Add local error codes to the error list:

```md
`LOCAL_APP_UNAVAILABLE`, `LOCAL_APP_AUTH_FAILED`, `LOCAL_APP_ACTION_FAILED`
```

- [ ] **Step 4: Update development guide**

Add to `docs/development.md`:

```md
## Local App Control Adapter

`src/thebrain/localAppClient.ts` is only for TheBrain desktop Local API app-control endpoints under `/api/app/*`.
Keep it separate from `src/thebrain/client.ts`, which owns normal TheBrain data endpoints.
Do not add a raw Local API passthrough tool. Add named MCP tools with narrow schemas instead.
Local app-control tools that change client UI state must call `requireWriteEnabled()`.
```

- [ ] **Step 5: Run full verification**

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Expected: all commands pass. The integration test remains skipped unless `RUN_THEBRAIN_INTEGRATION=true`.

- [ ] **Step 6: Optional manual local smoke check**

Only run this after confirming the local TheBrain desktop Local API key is set in `.env`.

```bash
set -a
. ./.env
set +a
curl -sS -H "Authorization: Bearer ${THEBRAIN_API_KEY}" "${THEBRAIN_LOCAL_BASE_URL:-http://localhost:8001/api}/app/state"
```

Expected: JSON containing `currentBrainId`, `isLoggedIn`, and `tabs`. Do not print or commit the API key.

- [ ] **Step 7: Commit Task 3**

```bash
git add .env.example README.md docs/tool-contract.md docs/development.md
git commit -m "docs: document local app control tools"
```

- [ ] **Step 8: Push after all implementation commits**

```bash
git status --short --branch
git push origin main
```

Expected: branch pushes successfully to `Gamecrazy/brain-operator-mcp`.
