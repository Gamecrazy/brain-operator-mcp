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

  it("opens the requested brain", async () => {
    const openBrain = vi.fn().mockResolvedValue({ success: true });
    const { server, handlers } = toolHandlers();
    registerAppTools(server, {
      brain: {} as any,
      localApp: { openBrain } as any,
      planStore: {} as any
    });

    const result = await handlers.get("open_brain")?.({ brainId: "brain_1" });

    expect(openBrain).toHaveBeenCalledWith("brain_1");
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
