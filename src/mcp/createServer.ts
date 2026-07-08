import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config } from "../config.js";
import { FilePlanStore } from "../plans/planStore.js";
import { TheBrainClient } from "../thebrain/client.js";
import { registerAllTools } from "../tools/registerAllTools.js";

export function createMcpServer() {
  const server = new McpServer(
    { name: config.MCP_SERVER_NAME, version: config.MCP_SERVER_VERSION },
    {
      instructions:
        "Use read tools before write tools when IDs are uncertain. For batch writes, first create_change_plan, then wait for explicit user confirmation before commit_change_plan. Destructive operations are disabled. Never expose API keys."
    }
  );

  registerAllTools(server, {
    brain: new TheBrainClient(),
    planStore: new FilePlanStore(config.PLAN_STORE_PATH)
  });

  return server;
}
