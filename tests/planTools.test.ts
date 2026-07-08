import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChangePlan } from "../src/plans/changePlan.js";
import type { PlanStore } from "../src/plans/planStore.js";
import { registerPlanTools } from "../src/tools/plan.tools.js";

class MemoryPlanStore implements PlanStore {
  plans: ChangePlan[] = [];

  async save(plan: ChangePlan) {
    this.plans.push(plan);
  }

  async get(planId: string) {
    return this.plans.find((plan) => plan.planId === planId) ?? null;
  }

  async update(plan: ChangePlan) {
    this.plans = this.plans.map((existing) => (existing.planId === plan.planId ? plan : existing));
  }

  async list() {
    return this.plans;
  }
}

function makeServer() {
  return new McpServer({ name: "test", version: "0.0.0" });
}

function toolHandlers() {
  const handlers = new Map<string, (input: any) => Promise<any>>();
  const server = makeServer();
  vi.spyOn(server, "registerTool").mockImplementation((name: string, _config: any, handler: any) => {
    handlers.set(name, handler);
    return undefined as never;
  });
  return { server, handlers };
}

describe("plan tools", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.WRITE_TOOLS_ENABLED = "true";
  });

  it("registers a note update plan tool beside batch plan tools", () => {
    const { server, handlers } = toolHandlers();
    registerPlanTools(server, {
      brain: {} as any,
      localApp: {} as any,
      planStore: new MemoryPlanStore()
    });

    expect([...handlers.keys()].sort()).toEqual([
      "commit_change_plan",
      "create_change_plan",
      "create_note_update_plan",
      "discard_change_plan",
      "get_change_plan"
    ]);
  });

  it("creates a sanitized pending plan that can later replace note content", async () => {
    const planStore = new MemoryPlanStore();
    const { server, handlers } = toolHandlers();
    registerPlanTools(server, {
      brain: {} as any,
      localApp: {} as any,
      planStore
    });

    const result = await handlers.get("create_note_update_plan")?.({
      brainId: "brain_1",
      thoughtId: "thought_1",
      title: "Set note",
      markdown: "sensitive replacement markdown"
    });

    expect(planStore.plans).toHaveLength(1);
    expect(planStore.plans[0].changes).toEqual([
      {
        id: "replace_note_1",
        op: "replace_note",
        targetRef: "thought_1",
        markdown: "sensitive replacement markdown"
      }
    ]);
    expect(result.structuredContent.data).toMatchObject({
      planId: planStore.plans[0].planId,
      status: "pending",
      summary: {
        createThoughts: 0,
        createLinks: 0,
        appendNotes: 0,
        replaceNotes: 1,
        duplicateCandidateCount: 0
      },
      preview: ["replace_note: thought_1"]
    });
    expect(JSON.stringify(result)).not.toContain("sensitive replacement markdown");
    expect(result._meta.raw.changes[0]).toMatchObject({
      op: "replace_note",
      markdown: "[REDACTED]",
      markdownChars: 30
    });
  });
});
