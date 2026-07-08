import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FilePlanStore } from "../src/plans/planStore.js";
import { ChangePlanSchema, type ChangePlan } from "../src/plans/changePlan.js";

let dir: string;

function plan(overrides: Partial<ChangePlan> = {}): ChangePlan {
  return {
    planId: "plan_1",
    brainId: "brain_1",
    title: "Test plan",
    createdAt: new Date("2026-07-08T00:00:00.000Z").toISOString(),
    expiresAt: new Date("2026-07-08T00:30:00.000Z").toISOString(),
    status: "pending",
    duplicateCandidates: [],
    changes: [
      {
        id: "c1",
        op: "create_thought",
        clientRef: "root",
        name: "Root",
        kind: 1
      }
    ],
    ...overrides
  };
}

describe("FilePlanStore", () => {
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "brain-plan-store-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("saves, gets, updates, and lists plans", async () => {
    const store = new FilePlanStore(join(dir, "plans.json"));
    const pending = ChangePlanSchema.parse(plan());

    await store.save(pending);
    await expect(store.get("plan_1")).resolves.toEqual(pending);

    const discarded = ChangePlanSchema.parse(plan({ status: "discarded" }));
    await store.update(discarded);

    await expect(store.get("plan_1")).resolves.toEqual(discarded);
    await expect(store.list()).resolves.toEqual([discarded]);
  });
});
