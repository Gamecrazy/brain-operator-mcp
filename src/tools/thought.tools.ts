import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ok, fail } from "../mcp/result.js";
import {
  CreateThoughtInputSchema,
  SearchThoughtsInputSchema,
  ThoughtIdInputSchema,
  UpdateThoughtInputSchema
} from "../mcp/schemas.js";
import { auditLog } from "../safety/auditLog.js";
import { requireWriteEnabled } from "../safety/policy.js";
import { resolveBrainId } from "../safety/validators.js";
import { relationToApiValue } from "../thebrain/relation.js";
import type { ToolContext } from "./registerAllTools.js";
import { extractId, summaryArray, toolFailure } from "./toolUtils.js";

export function registerThoughtTools(server: McpServer, ctx: ToolContext) {
  server.registerTool(
    "search_thoughts",
    {
      description:
        "Search thoughts, notes, and related content in a TheBrain brain. Read-only. Use this before write operations when the target thought ID is uncertain.",
      inputSchema: SearchThoughtsInputSchema
    },
    async (input) => {
      try {
        const brainId = resolveBrainId(input.brainId);
        const raw = await ctx.brain.searchThoughts({ ...input, brainId });
        const results = summaryArray(raw);
        return ok(
          { brainId, queryText: input.queryText, count: results.length, results },
          `Search completed for "${input.queryText}".`,
          { raw }
        );
      } catch (error) {
        return toolFailure("SEARCH_FAILED", error, "Check brainId and queryText.");
      }
    }
  );

  server.registerTool(
    "get_thought",
    {
      description: "Get details for a TheBrain thought. Read-only.",
      inputSchema: ThoughtIdInputSchema
    },
    async (input) => {
      try {
        const brainId = resolveBrainId(input.brainId);
        const raw = await ctx.brain.getThought(brainId, input.thoughtId);
        return ok({ brainId, thoughtId: input.thoughtId, thought: raw }, "Thought loaded.", { raw });
      } catch (error) {
        return toolFailure("THOUGHT_NOT_FOUND", error, "Check thoughtId.");
      }
    }
  );

  server.registerTool(
    "get_thought_graph",
    {
      description: "Get a thought graph with related thoughts, links, and attachments. Read-only.",
      inputSchema: ThoughtIdInputSchema
    },
    async (input) => {
      try {
        const brainId = resolveBrainId(input.brainId);
        const raw = await ctx.brain.getThoughtGraph(brainId, input.thoughtId);
        return ok({ brainId, thoughtId: input.thoughtId, graph: raw }, "Thought graph loaded.", { raw });
      } catch (error) {
        return toolFailure("THOUGHT_NOT_FOUND", error, "Check thoughtId.");
      }
    }
  );

  server.registerTool(
    "create_thought",
    {
      description: "Create a TheBrain thought. Write operation.",
      inputSchema: CreateThoughtInputSchema
    },
    async (input) => {
      try {
        requireWriteEnabled();
        if (input.sourceThoughtId && !input.relation) return fail("RELATION_REQUIRED", "RELATION_REQUIRED");
        const brainId = resolveBrainId(input.brainId);
        const body = {
          name: input.name,
          kind: input.kind,
          label: input.label ?? "",
          typeId: input.typeId ?? null,
          sourceThoughtId: input.sourceThoughtId ?? null,
          relation: input.relation ? relationToApiValue(input.relation) : undefined,
          acType: input.acType
        };
        const raw = await ctx.brain.createThought(brainId, body, input.idempotencyKey);
        await auditLog("create_thought", { brainId, name: input.name }, { id: extractId(raw) });
        return ok({ brainId, thoughtId: extractId(raw), name: input.name }, "Thought created.", { raw });
      } catch (error) {
        return toolFailure("UNKNOWN_ERROR", error, "Check write settings and thought input.");
      }
    }
  );

  server.registerTool(
    "update_thought",
    {
      description: "Update a TheBrain thought name, label, or type. Write operation.",
      inputSchema: UpdateThoughtInputSchema
    },
    async (input) => {
      try {
        requireWriteEnabled();
        const patchDocument: Array<{ op: "replace"; path: string; value: unknown }> = [];
        if (input.name !== undefined) patchDocument.push({ op: "replace", path: "/name", value: input.name });
        if (input.label !== undefined) patchDocument.push({ op: "replace", path: "/label", value: input.label });
        if (input.typeId !== undefined) patchDocument.push({ op: "replace", path: "/typeId", value: input.typeId });
        if (patchDocument.length === 0) return fail("NO_PATCH_FIELDS", "NO_PATCH_FIELDS");

        const brainId = resolveBrainId(input.brainId);
        const raw = await ctx.brain.updateThought(brainId, input.thoughtId, patchDocument);
        await auditLog("update_thought", { brainId, thoughtId: input.thoughtId, fields: patchDocument.length });
        return ok({ brainId, thoughtId: input.thoughtId, updatedFields: patchDocument.length }, "Thought updated.", { raw });
      } catch (error) {
        return toolFailure("UNKNOWN_ERROR", error, "Check thoughtId and patch fields.");
      }
    }
  );
}
