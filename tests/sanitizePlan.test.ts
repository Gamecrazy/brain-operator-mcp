import { describe, expect, it } from "vitest";
import { sanitizeChangePlanForOutput, sanitizeCommitResultForOutput } from "../src/safety/sanitizePlan.js";
import type { ChangePlan } from "../src/plans/changePlan.js";
import type { CommitResult } from "../src/plans/commitExecutor.js";

describe("sanitizePlan", () => {
  it("redacts batch plan labels and note markdown while preserving execution-safe summary fields", () => {
    const plan: ChangePlan = {
      planId: "plan_1",
      brainId: "brain_1",
      title: "Sensitive import",
      createdAt: "2026-07-08T00:00:00.000Z",
      expiresAt: "2026-07-08T00:30:00.000Z",
      status: "pending",
      duplicateCandidates: [
        {
          changeId: "c1",
          name: "Sensitive thought",
          candidates: [{ id: "thought_existing", name: "Existing private thought" }]
        }
      ],
      changes: [
        {
          id: "c1",
          op: "create_thought",
          clientRef: "root",
          name: "Sensitive thought",
          label: "private design label",
          kind: 1
        },
        {
          id: "c2",
          op: "append_note",
          targetRef: "root",
          markdown: "secret game design details"
        },
        {
          id: "c3",
          op: "replace_note",
          targetRef: "root",
          markdown: "secret replacement details"
        }
      ]
    };

    const sanitized = sanitizeChangePlanForOutput(plan);
    const serialized = JSON.stringify(sanitized);

    expect(serialized).not.toContain("private design label");
    expect(serialized).not.toContain("secret game design details");
    expect(serialized).not.toContain("Existing private thought");
    expect(sanitized.changes[0]).toMatchObject({ label: "[REDACTED]", nameChars: 17 });
    expect(sanitized.changes[1]).toMatchObject({ markdown: "[REDACTED]", markdownChars: 26 });
    expect(sanitized.changes[2]).toMatchObject({ markdown: "[REDACTED]", markdownChars: 26 });
    expect(sanitized.duplicateCandidates).toEqual([{ changeId: "c1", candidateCount: 1 }]);
  });

  it("redacts created thought names from commit results", () => {
    const result: CommitResult = {
      planId: "plan_1",
      committed: true,
      partialFailure: false,
      createdThoughts: [{ clientRef: "root", thoughtId: "thought_1", name: "Sensitive thought" }],
      createdLinks: [],
      appendedNotes: [],
      replacedNotes: [],
      failures: []
    };

    const sanitized = sanitizeCommitResultForOutput(result);

    expect(JSON.stringify(sanitized)).not.toContain("Sensitive thought");
    expect(sanitized.createdThoughts).toEqual([
      { clientRef: "root", thoughtId: "thought_1", name: "[REDACTED]", nameChars: 17 }
    ]);
  });
});
