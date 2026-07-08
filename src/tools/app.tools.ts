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
      description:
        "Get the local TheBrain desktop client's active brain, active thought, login state, and open tabs. Local API only.",
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
