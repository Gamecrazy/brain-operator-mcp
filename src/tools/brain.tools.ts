import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ok } from "../mcp/result.js";
import { GetBrainInputSchema, HealthCheckInputSchema } from "../mcp/schemas.js";
import { resolveBrainId } from "../safety/validators.js";
import type { ToolContext } from "./registerAllTools.js";
import { summaryArray, toolFailure } from "./toolUtils.js";

export function registerBrainTools(server: McpServer, ctx: ToolContext) {
  server.registerTool(
    "list_brains",
    {
      description: "List TheBrain brains available to the configured API key. Read-only.",
      inputSchema: HealthCheckInputSchema
    },
    async () => {
      try {
        const raw = await ctx.brain.listBrains();
        return ok({ brains: summaryArray(raw) }, "Brains listed.", { raw });
      } catch (error) {
        return toolFailure("AUTH_FAILED", error, "Check THEBRAIN_API_KEY.");
      }
    }
  );

  server.registerTool(
    "get_brain",
    {
      description: "Get details for one TheBrain brain. Read-only.",
      inputSchema: GetBrainInputSchema
    },
    async (input) => {
      try {
        const brainId = resolveBrainId(input.brainId);
        const raw = await ctx.brain.getBrain(brainId);
        return ok({ brainId, brain: raw }, "Brain loaded.", { raw });
      } catch (error) {
        return toolFailure("BRAIN_NOT_FOUND", error, "Pass a valid brainId or configure THEBRAIN_DEFAULT_BRAIN_ID.");
      }
    }
  );
}
