import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config } from "../config.js";
import { ok } from "../mcp/result.js";
import { HealthCheckInputSchema } from "../mcp/schemas.js";
import { policy } from "../safety/policy.js";
import type { ToolContext } from "./registerAllTools.js";

export function registerHealthTools(server: McpServer, _ctx: ToolContext) {
  server.registerTool(
    "health_check",
    {
      description: "Check this MCP server configuration without calling TheBrain.",
      inputSchema: HealthCheckInputSchema
    },
    async () =>
      ok(
        {
          server: config.MCP_SERVER_NAME,
          version: config.MCP_SERVER_VERSION,
          mode: config.THEBRAIN_MODE,
          writeToolsEnabled: policy.allowWrite,
          destructiveToolsEnabled: policy.allowDestructive,
          hasDefaultBrainId: Boolean(config.THEBRAIN_DEFAULT_BRAIN_ID)
        },
        "Server configuration is healthy."
      )
  );
}
