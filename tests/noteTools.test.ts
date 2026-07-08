import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerNoteTools } from "../src/tools/note.tools.js";

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

describe("note tools", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.WRITE_TOOLS_ENABLED = "true";
  });

  it("registers replace_note beside existing note tools", () => {
    const { server, handlers } = toolHandlers();
    registerNoteTools(server, {
      brain: {} as any,
      localApp: {} as any,
      planStore: {} as any
    });

    expect([...handlers.keys()].sort()).toEqual(["append_note", "get_note", "replace_note"]);
  });

  it("replaces note content and returns character count", async () => {
    const updateNote = vi.fn().mockResolvedValue({ success: true });
    const { server, handlers } = toolHandlers();
    registerNoteTools(server, {
      brain: { updateNote } as any,
      localApp: {} as any,
      planStore: {} as any
    });

    const result = await handlers.get("replace_note")?.({
      brainId: "brain_1",
      thoughtId: "thought_1",
      markdown: "replacement markdown"
    });

    expect(updateNote).toHaveBeenCalledWith("brain_1", "thought_1", "replacement markdown");
    expect(result.structuredContent).toEqual({
      ok: true,
      data: { brainId: "brain_1", thoughtId: "thought_1", chars: 20 }
    });
  });
});
