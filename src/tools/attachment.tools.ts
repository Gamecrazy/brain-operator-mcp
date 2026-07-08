import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ok, fail } from "../mcp/result.js";
import { AddUrlAttachmentInputSchema, ThoughtIdInputSchema } from "../mcp/schemas.js";
import { auditLog } from "../safety/auditLog.js";
import { requireWriteEnabled } from "../safety/policy.js";
import { isSafePublicUrl, resolveBrainId } from "../safety/validators.js";
import type { ToolContext } from "./registerAllTools.js";
import { extractId, summaryArray, toolFailure } from "./toolUtils.js";

export function registerAttachmentTools(server: McpServer, ctx: ToolContext) {
  server.registerTool(
    "list_attachments",
    {
      description: "List attachments for a TheBrain thought. Read-only.",
      inputSchema: ThoughtIdInputSchema
    },
    async (input) => {
      try {
        const brainId = resolveBrainId(input.brainId);
        const raw = await ctx.brain.listAttachments(brainId, input.thoughtId);
        return ok({ brainId, thoughtId: input.thoughtId, attachments: summaryArray(raw) }, "Attachments listed.", { raw });
      } catch (error) {
        return toolFailure("THOUGHT_NOT_FOUND", error, "Check thoughtId.");
      }
    }
  );

  server.registerTool(
    "add_url_attachment",
    {
      description: "Add a public HTTP or HTTPS URL attachment to a TheBrain thought. Write operation.",
      inputSchema: AddUrlAttachmentInputSchema
    },
    async (input) => {
      try {
        requireWriteEnabled();
        if (!isSafePublicUrl(input.url)) return fail("UNSAFE_URL", "UNSAFE_URL", "Use a public http or https URL.");
        const brainId = resolveBrainId(input.brainId);
        const raw = await ctx.brain.addUrlAttachment(brainId, input.thoughtId, input.url, input.name);
        await auditLog("add_url_attachment", { brainId, thoughtId: input.thoughtId, url: input.url, name: input.name });
        return ok({ brainId, thoughtId: input.thoughtId, attachmentId: extractId(raw) }, "URL attachment added.", { raw });
      } catch (error) {
        return toolFailure("UNKNOWN_ERROR", error, "Check URL and thoughtId.");
      }
    }
  );
}
