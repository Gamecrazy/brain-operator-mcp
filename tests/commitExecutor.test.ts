import { describe, expect, it } from "vitest";
import { commitChangePlan } from "../src/plans/commitExecutor.js";
import type { ChangePlan } from "../src/plans/changePlan.js";
import type { PlanStore } from "../src/plans/planStore.js";

class MemoryPlanStore implements PlanStore {
  constructor(public current: ChangePlan) {}

  async save(plan: ChangePlan) {
    this.current = plan;
  }

  async get(planId: string) {
    return this.current.planId === planId ? this.current : null;
  }

  async update(plan: ChangePlan) {
    this.current = plan;
  }

  async list() {
    return [this.current];
  }
}

function basePlan(changes: ChangePlan["changes"]): ChangePlan {
  return {
    planId: "plan_1",
    brainId: "brain_1",
    title: "Import",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    status: "pending",
    duplicateCandidates: [],
    changes
  };
}

describe("commitChangePlan", () => {
  it("stores created thought IDs in the ref map", async () => {
    const plan = basePlan([
      { id: "c1", op: "create_thought", clientRef: "root", name: "Root", kind: 1 }
    ]);
    const store = new MemoryPlanStore(plan);
    const brain = {
      createThought: async () => ({ id: "thought_created" })
    };

    const result = await commitChangePlan({ brain, planStore: store, planId: "plan_1" });

    expect(result.createdThoughts).toEqual([
      { clientRef: "root", thoughtId: "thought_created", name: "Root" }
    ]);
    expect(store.current.status).toBe("committed");
  });

  it("resolves link refs from created thoughts", async () => {
    const calls: unknown[] = [];
    const plan = basePlan([
      { id: "c1", op: "create_thought", clientRef: "root", name: "Root", kind: 1 },
      { id: "c2", op: "create_thought", clientRef: "child", name: "Child", kind: 1 },
      { id: "c3", op: "create_link", fromRef: "root", toRef: "child", relation: "child" }
    ]);
    const brain = {
      createThought: async (_brainId: string, body: unknown) => {
        const name = (body as { name: string }).name;
        return { id: name === "Root" ? "thought_root" : "thought_child" };
      },
      createLink: async (_brainId: string, body: unknown) => {
        calls.push(body);
        return { id: "link_1" };
      }
    };

    const result = await commitChangePlan({ brain, planStore: new MemoryPlanStore(plan), planId: "plan_1" });

    expect(result.partialFailure).toBe(false);
    expect(calls).toEqual([
      {
        thoughtIdA: "thought_root",
        thoughtIdB: "thought_child",
        relation: 1,
        label: ""
      }
    ]);
  });

  it("reports unresolved link failures without throwing", async () => {
    const plan = basePlan([{ id: "c1", op: "create_link", fromRef: "missing", toRef: "other", relation: "jump" }]);

    const result = await commitChangePlan({ brain: {}, planStore: new MemoryPlanStore(plan), planId: "plan_1" });

    expect(result.partialFailure).toBe(true);
    expect(result.failures).toEqual([
      {
        changeId: "c1",
        op: "create_link",
        message: "Unable to resolve link refs: missing -> other"
      }
    ]);
  });

  it("replaces notes in batch plans", async () => {
    const calls: unknown[] = [];
    const plan = basePlan([
      {
        id: "c1",
        op: "replace_note",
        targetRef: "thought_existing",
        markdown: "replacement markdown"
      }
    ]);
    const brain = {
      updateNote: async (_brainId: string, thoughtId: string, markdown: string) => {
        calls.push({ thoughtId, markdown });
        return { success: true };
      }
    };

    const result = await commitChangePlan({ brain, planStore: new MemoryPlanStore(plan), planId: "plan_1" });

    expect(result.partialFailure).toBe(false);
    expect(calls).toEqual([{ thoughtId: "thought_existing", markdown: "replacement markdown" }]);
    expect(result.replacedNotes).toEqual([{ changeId: "c1", thoughtId: "thought_existing", chars: 20 }]);
  });
});
