import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";
import { registerAllTools } from "../src/tools/registerAllTools.js";

const READ_ONLY_TOOLS = [
  "health_check",
  "list_brains",
  "get_brain",
  "search_thoughts",
  "get_thought",
  "get_thought_graph",
  "get_note",
  "list_attachments",
  "get_app_state",
  "get_change_plan"
];

function collectToolConfigs() {
  const configs = new Map<string, any>();
  const server = new McpServer({ name: "test", version: "0.0.0" });
  vi.spyOn(server, "registerTool").mockImplementation((name: string, config: any) => {
    configs.set(name, config);
    return undefined as never;
  });
  registerAllTools(server, { brain: {} as any, localApp: {} as any, planStore: {} as any });
  return configs;
}

describe("tool annotations", () => {
  it("declares all four MCP hints as explicit booleans on every tool", () => {
    const configs = collectToolConfigs();
    expect(configs.size).toBeGreaterThan(0);

    for (const [name, config] of configs) {
      const annotations = config.annotations;
      expect(annotations, `${name} is missing annotations`).toBeDefined();
      for (const hint of ["readOnlyHint", "destructiveHint", "idempotentHint", "openWorldHint"]) {
        expect(typeof annotations[hint], `${name}.${hint} must be a boolean`).toBe("boolean");
      }
    }
  });

  it("marks read-only tools as read-only and every write tool as non-read-only", () => {
    const configs = collectToolConfigs();

    for (const [name, config] of configs) {
      const expectedReadOnly = READ_ONLY_TOOLS.includes(name);
      expect(config.annotations.readOnlyHint, `${name}.readOnlyHint`).toBe(expectedReadOnly);
      // Destructive tools are intentionally not offered by this server.
      expect(config.annotations.destructiveHint, `${name}.destructiveHint`).toBe(false);
    }
  });
});
