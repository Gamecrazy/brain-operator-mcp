import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ok } from "../mcp/result.js";
import {
  CommitChangePlanInputSchema,
  CreateChangePlanInputSchema,
  PlanIdInputSchema
} from "../mcp/schemas.js";
import { ChangePlanSchema, type Change } from "../plans/changePlan.js";
import { commitChangePlan } from "../plans/commitExecutor.js";
import { auditLog } from "../safety/auditLog.js";
import { policy, requireWriteEnabled } from "../safety/policy.js";
import { sanitizeChangePlanForOutput, sanitizeCommitResultForOutput } from "../safety/sanitizePlan.js";
import { resolveBrainId } from "../safety/validators.js";
import { addMinutes } from "../util/time.js";
import type { ToolContext } from "./registerAllTools.js";
import { toolFailure } from "./toolUtils.js";

export function registerPlanTools(server: McpServer, ctx: ToolContext) {
  server.registerTool(
    "create_change_plan",
    {
      description: "Create a pending batch write plan for TheBrain. Does not write to TheBrain.",
      inputSchema: CreateChangePlanInputSchema
    },
    async (input) => {
      try {
        const brainId = resolveBrainId(input.brainId);
        validatePlanRefs(input.changes);
        const now = new Date();
        const duplicateCandidates = input.duplicateCheck
          ? await collectDuplicateCandidates(ctx, brainId, input.changes)
          : [];
        const plan = ChangePlanSchema.parse({
          planId: `plan_${compactTimestamp(now)}_${crypto.randomUUID().slice(0, 8)}`,
          brainId,
          title: input.title,
          createdAt: now.toISOString(),
          expiresAt: addMinutes(now, policy.planTtlMinutes).toISOString(),
          status: "pending",
          changes: input.changes,
          duplicateCandidates
        });
        await ctx.planStore.save(plan);
        const sanitizedPlan = sanitizeChangePlanForOutput(plan);
        return ok(
          {
            planId: plan.planId,
            status: plan.status,
            summary: summarizeChanges(plan.changes, duplicateCandidates.length),
            preview: previewChanges(plan.changes),
            expiresAt: plan.expiresAt
          },
          "Change plan created.",
          { raw: sanitizedPlan }
        );
      } catch (error) {
        return toolFailure("PLAN_VALIDATION_FAILED", error, "Fix invalid changes and try again.");
      }
    }
  );

  server.registerTool(
    "get_change_plan",
    {
      description: "Get a saved TheBrain change plan. Read-only.",
      inputSchema: PlanIdInputSchema
    },
    async (input) => {
      try {
        const plan = await ctx.planStore.get(input.planId);
        if (!plan) throw new Error("PLAN_NOT_FOUND");
        return ok({ plan: sanitizeChangePlanForOutput(plan) }, "Change plan loaded.");
      } catch (error) {
        return toolFailure("PLAN_NOT_FOUND", error, "Check planId.");
      }
    }
  );

  server.registerTool(
    "discard_change_plan",
    {
      description: "Discard a pending TheBrain change plan. Does not write to TheBrain.",
      inputSchema: PlanIdInputSchema
    },
    async (input) => {
      try {
        const plan = await ctx.planStore.get(input.planId);
        if (!plan) throw new Error("PLAN_NOT_FOUND");
        const discarded = { ...plan, status: "discarded" as const };
        await ctx.planStore.update(discarded);
        return ok({ planId: input.planId, status: "discarded" }, "Change plan discarded.");
      } catch (error) {
        return toolFailure("PLAN_NOT_FOUND", error, "Check planId.");
      }
    }
  );

  server.registerTool(
    "commit_change_plan",
    {
      description:
        "Commit a previously created TheBrain change plan. Write operation. Only call after the user explicitly confirms a previously created change plan.",
      inputSchema: CommitChangePlanInputSchema
    },
    async (input) => {
      try {
        requireWriteEnabled();
        const result = await commitChangePlan({ brain: ctx.brain, planStore: ctx.planStore, planId: input.planId });
        const sanitizedResult = sanitizeCommitResultForOutput(result);
        await auditLog("commit_change_plan_tool", { planId: input.planId }, sanitizedResult);
        return ok(
          sanitizedResult,
          result.partialFailure ? "Change plan committed with failures." : "Change plan committed."
        );
      } catch (error) {
        return toolFailure("UNKNOWN_ERROR", error, "Check plan status and confirmation.");
      }
    }
  );
}

function validatePlanRefs(changes: Change[]) {
  const refs = new Set<string>();
  for (const change of changes) {
    if (change.op === "create_thought") {
      if (refs.has(change.clientRef)) throw new Error("PLAN_VALIDATION_FAILED");
      refs.add(change.clientRef);
    }
  }
  for (const change of changes) {
    if (change.op === "create_link") {
      if (!refs.has(change.fromRef) && !looksLikeExistingId(change.fromRef)) throw new Error("PLAN_VALIDATION_FAILED");
      if (!refs.has(change.toRef) && !looksLikeExistingId(change.toRef)) throw new Error("PLAN_VALIDATION_FAILED");
    }
    if (change.op === "append_note") {
      if (!refs.has(change.targetRef) && !looksLikeExistingId(change.targetRef)) throw new Error("PLAN_VALIDATION_FAILED");
    }
  }
}

async function collectDuplicateCandidates(ctx: ToolContext, brainId: string, changes: Change[]) {
  const creates = changes.filter((change) => change.op === "create_thought");
  const candidates = [];
  for (const change of creates) {
    const raw = await ctx.brain.searchThoughts({
      brainId,
      queryText: change.name,
      maxResults: 3,
      onlySearchThoughtNames: true
    });
    candidates.push({ changeId: change.id, name: change.name, candidates: raw });
  }
  return candidates;
}

function summarizeChanges(changes: Change[], duplicateCandidateCount: number) {
  return {
    createThoughts: changes.filter((change) => change.op === "create_thought").length,
    createLinks: changes.filter((change) => change.op === "create_link").length,
    appendNotes: changes.filter((change) => change.op === "append_note").length,
    duplicateCandidateCount
  };
}

function previewChanges(changes: Change[]) {
  return changes.slice(0, 20).map((change) => {
    if (change.op === "create_thought") return `create_thought: ${change.name}`;
    if (change.op === "create_link") return `create_link: ${change.fromRef} -> ${change.toRef} ${change.relation}`;
    return `append_note: ${change.targetRef}`;
  });
}

function compactTimestamp(date: Date) {
  return date.toISOString().replace(/\D/g, "").slice(0, 14);
}

function looksLikeExistingId(ref: string): boolean {
  return /^[A-Za-z0-9_-]{8,}$/.test(ref);
}
