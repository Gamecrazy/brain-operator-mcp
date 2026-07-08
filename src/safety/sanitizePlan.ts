import type { Change, ChangePlan } from "../plans/changePlan.js";
import type { CommitResult } from "../plans/commitExecutor.js";

type SanitizedChange = Record<string, unknown> & {
  id: string;
  op: Change["op"];
};

export type SanitizedChangePlan = Omit<ChangePlan, "changes" | "duplicateCandidates"> & {
  changes: SanitizedChange[];
  duplicateCandidates: Array<{ changeId?: string; candidateCount: number }>;
};

export function sanitizeChangePlanForOutput(plan: ChangePlan): SanitizedChangePlan {
  return {
    ...plan,
    changes: plan.changes.map(sanitizeChangeForOutput),
    duplicateCandidates: plan.duplicateCandidates.map((candidate) => {
      if (!candidate || typeof candidate !== "object") return { candidateCount: 0 };
      const record = candidate as Record<string, unknown>;
      return {
        changeId: typeof record.changeId === "string" ? record.changeId : undefined,
        candidateCount: Array.isArray(record.candidates) ? record.candidates.length : 0
      };
    })
  };
}

export function sanitizeCommitResultForOutput(result: CommitResult): CommitResult & {
  createdThoughts: Array<{ clientRef: string; thoughtId: string; name: string; nameChars: number }>;
} {
  return {
    ...result,
    createdThoughts: result.createdThoughts.map((thought) => ({
      clientRef: thought.clientRef,
      thoughtId: thought.thoughtId,
      name: "[REDACTED]",
      nameChars: thought.name.length
    }))
  };
}

function sanitizeChangeForOutput(change: Change): SanitizedChange {
  if (change.op === "create_thought") {
    return {
      id: change.id,
      op: change.op,
      clientRef: change.clientRef,
      name: "[REDACTED]",
      nameChars: change.name.length,
      label: change.label === undefined ? undefined : "[REDACTED]",
      labelChars: change.label?.length,
      kind: change.kind,
      typeId: change.typeId ? "[REDACTED]" : undefined
    };
  }

  if (change.op === "create_link") {
    return {
      id: change.id,
      op: change.op,
      fromRef: change.fromRef,
      toRef: change.toRef,
      relation: change.relation,
      label: change.label === undefined ? undefined : "[REDACTED]",
      labelChars: change.label?.length
    };
  }

  return {
    id: change.id,
    op: change.op,
    targetRef: change.targetRef,
    markdown: "[REDACTED]",
    markdownChars: change.markdown.length
  };
}
