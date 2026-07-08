import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ok } from "../mcp/result.js";
import { AppendNoteInputSchema, GetNoteInputSchema, ReplaceNoteInputSchema } from "../mcp/schemas.js";
import { auditLog } from "../safety/auditLog.js";
import { requireWriteEnabled } from "../safety/policy.js";
import { resolveBrainId } from "../safety/validators.js";
import type { ToolContext } from "./registerAllTools.js";
import { toolFailure } from "./toolUtils.js";

export function registerNoteTools(server: McpServer, ctx: ToolContext) {
  server.registerTool(
    "get_note",
    {
      description: "Get a thought note as markdown, HTML, or text. Read-only.",
      inputSchema: GetNoteInputSchema
    },
    async (input) => {
      try {
        const brainId = resolveBrainId(input.brainId);
        const raw = await ctx.brain.getNote(brainId, input.thoughtId, input.format);
        return ok({ brainId, thoughtId: input.thoughtId, format: input.format, note: raw }, "Note loaded.", { raw });
      } catch (error) {
        return toolFailure("THOUGHT_NOT_FOUND", error, "Check thoughtId and note format.");
      }
    }
  );

  server.registerTool(
    "append_note",
    {
      description: "Append markdown content to an existing TheBrain thought note. Write operation. Does not overwrite existing note content.",
      inputSchema: AppendNoteInputSchema
    },
    async (input) => {
      try {
        requireWriteEnabled();
        const brainId = resolveBrainId(input.brainId);
        const markdown = input.addSeparator ? `\n\n---\n\n${input.markdown}` : input.markdown;
        const raw = await ctx.brain.appendNote(brainId, input.thoughtId, markdown);
        await auditLog("append_note", {
          brainId,
          thoughtId: input.thoughtId,
          markdownPreview: input.markdown.slice(0, 500),
          chars: input.markdown.length
        });
        return ok({ brainId, thoughtId: input.thoughtId, chars: input.markdown.length }, "Note appended.", { raw });
      } catch (error) {
        return toolFailure("APPEND_NOTE_FAILED", error, "Check thoughtId and note length.");
      }
    }
  );

  server.registerTool(
    "replace_note",
    {
      description:
        "Replace the entire Markdown note for an existing TheBrain thought. Write operation. Overwrites existing note content.",
      inputSchema: ReplaceNoteInputSchema
    },
    async (input) => {
      try {
        requireWriteEnabled();
        const brainId = resolveBrainId(input.brainId);
        const raw = await ctx.brain.updateNote(brainId, input.thoughtId, input.markdown);
        await auditLog("replace_note", {
          brainId,
          thoughtId: input.thoughtId,
          markdownPreview: input.markdown.slice(0, 500),
          chars: input.markdown.length
        });
        return ok({ brainId, thoughtId: input.thoughtId, chars: input.markdown.length }, "Note replaced.", { raw });
      } catch (error) {
        return toolFailure("REPLACE_NOTE_FAILED", error, "Check thoughtId, note length, and write settings.");
      }
    }
  );
}
