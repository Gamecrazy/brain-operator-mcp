import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ok } from "../mcp/result.js";
import { CreateLinkInputSchema } from "../mcp/schemas.js";
import { auditLog } from "../safety/auditLog.js";
import { requireWriteEnabled } from "../safety/policy.js";
import { resolveBrainId } from "../safety/validators.js";
import { relationToApiValue } from "../thebrain/relation.js";
import type { ToolContext } from "./registerAllTools.js";
import { extractId, toolFailure } from "./toolUtils.js";

export function registerLinkTools(server: McpServer, ctx: ToolContext) {
  server.registerTool(
    "create_link",
    {
      description: "Create a link between two TheBrain thoughts. Write operation.",
      inputSchema: CreateLinkInputSchema
    },
    async (input) => {
      try {
        requireWriteEnabled();
        const brainId = resolveBrainId(input.brainId);
        const raw = await ctx.brain.createLink(
          brainId,
          {
            thoughtIdA: input.thoughtIdA,
            thoughtIdB: input.thoughtIdB,
            relation: relationToApiValue(input.relation),
            name: input.name ?? "",
            label: input.label ?? ""
          },
          input.idempotencyKey
        );
        await auditLog("create_link", {
          brainId,
          thoughtIdA: input.thoughtIdA,
          thoughtIdB: input.thoughtIdB,
          relation: input.relation
        });
        return ok({ brainId, linkId: extractId(raw) }, "Link created.", { raw });
      } catch (error) {
        return toolFailure("UNKNOWN_ERROR", error, "Check thought IDs and relation.");
      }
    }
  );
}
