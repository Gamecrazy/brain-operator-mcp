import { auditLog } from "../safety/auditLog.js";
import { requireWriteEnabled } from "../safety/policy.js";
import { relationToApiValue } from "../thebrain/relation.js";
import type { Change, ChangePlan } from "./changePlan.js";
import type { PlanStore } from "./planStore.js";

type BrainWriteClient = {
  createThought?: (brainId: string, body: unknown) => Promise<unknown>;
  createLink?: (brainId: string, body: unknown) => Promise<unknown>;
  appendNote?: (brainId: string, thoughtId: string, markdown: string) => Promise<unknown>;
};

export type CommitFailure = {
  changeId: string;
  op: Change["op"];
  message: string;
};

export type CommitResult = {
  planId: string;
  committed: true;
  partialFailure: boolean;
  createdThoughts: Array<{ clientRef: string; thoughtId: string; name: string }>;
  createdLinks: Array<{ changeId: string; linkId?: string }>;
  appendedNotes: Array<{ changeId: string; thoughtId: string; chars: number }>;
  failures: CommitFailure[];
};

export async function commitChangePlan(input: {
  brain: BrainWriteClient;
  planStore: PlanStore;
  planId: string;
}): Promise<CommitResult> {
  requireWriteEnabled();

  const plan = await input.planStore.get(input.planId);
  if (!plan) throw new Error("PLAN_NOT_FOUND");
  if (plan.status !== "pending") throw new Error("PLAN_NOT_PENDING");
  if (new Date(plan.expiresAt).getTime() <= Date.now()) throw new Error("PLAN_EXPIRED");

  const refMap: Record<string, string> = {};
  const result: CommitResult = {
    planId: plan.planId,
    committed: true,
    partialFailure: false,
    createdThoughts: [],
    createdLinks: [],
    appendedNotes: [],
    failures: []
  };

  for (const change of plan.changes) {
    try {
      await executeChange(input.brain, plan, change, refMap, result);
    } catch (error) {
      result.failures.push({
        changeId: change.id,
        op: change.op,
        message: error instanceof Error ? error.message : "Unknown commit failure"
      });
    }
  }

  result.partialFailure = result.failures.length > 0;
  await input.planStore.update({ ...plan, status: "committed" });
  await auditLog("commit_change_plan", { planId: plan.planId, brainId: plan.brainId }, result);

  return result;
}

async function executeChange(
  brain: BrainWriteClient,
  plan: ChangePlan,
  change: Change,
  refMap: Record<string, string>,
  result: CommitResult
) {
  if (change.op === "create_thought") {
    if (!brain.createThought) throw new Error("createThought unavailable");
    const raw = await brain.createThought(plan.brainId, {
      name: change.name,
      kind: change.kind ?? 1,
      label: change.label ?? "",
      typeId: change.typeId ?? null
    });
    const thoughtId = extractId(raw);
    refMap[change.clientRef] = thoughtId;
    result.createdThoughts.push({ clientRef: change.clientRef, thoughtId, name: change.name });
    return;
  }

  if (change.op === "create_link") {
    const thoughtIdA = resolveRef(change.fromRef, refMap);
    const thoughtIdB = resolveRef(change.toRef, refMap);
    if (!thoughtIdA || !thoughtIdB) {
      throw new Error(`Unable to resolve link refs: ${change.fromRef} -> ${change.toRef}`);
    }
    if (!brain.createLink) throw new Error("createLink unavailable");
    const raw = await brain.createLink(plan.brainId, {
      thoughtIdA,
      thoughtIdB,
      relation: relationToApiValue(change.relation),
      label: change.label ?? ""
    });
    result.createdLinks.push({ changeId: change.id, linkId: extractOptionalId(raw) });
    return;
  }

  if (change.op === "append_note") {
    if (!brain.appendNote) throw new Error("appendNote unavailable");
    const thoughtId = resolveRef(change.targetRef, refMap);
    if (!thoughtId) throw new Error(`Unable to resolve note ref: ${change.targetRef}`);
    await brain.appendNote(plan.brainId, thoughtId, change.markdown);
    result.appendedNotes.push({ changeId: change.id, thoughtId, chars: change.markdown.length });
  }
}

function resolveRef(ref: string, refMap: Record<string, string>): string | null {
  return refMap[ref] ?? (looksLikeExistingId(ref) ? ref : null);
}

function looksLikeExistingId(ref: string): boolean {
  return /^[A-Za-z0-9_-]{8,}$/.test(ref);
}

function extractId(raw: unknown): string {
  const id = extractOptionalId(raw);
  if (!id) throw new Error("TheBrain response did not include an id");
  return id;
}

function extractOptionalId(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;
  return typeof record.id === "string"
    ? record.id
    : typeof record.thoughtId === "string"
      ? record.thoughtId
      : typeof record.linkId === "string"
        ? record.linkId
        : undefined;
}
