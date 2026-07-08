import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { ChangePlanSchema, type ChangePlan } from "./changePlan.js";

const PlanFileSchema = z.object({
  plans: z.array(ChangePlanSchema)
});

export interface PlanStore {
  save(plan: ChangePlan): Promise<void>;
  get(planId: string): Promise<ChangePlan | null>;
  update(plan: ChangePlan): Promise<void>;
  list(): Promise<ChangePlan[]>;
}

export class FilePlanStore implements PlanStore {
  private queue = Promise.resolve();

  constructor(private readonly path: string) {}

  async save(plan: ChangePlan): Promise<void> {
    await this.withLock(async () => {
      const file = await this.read();
      const existing = file.plans.filter((item) => item.planId !== plan.planId);
      await this.write({ plans: [...existing, plan] });
    });
  }

  async get(planId: string): Promise<ChangePlan | null> {
    const file = await this.read();
    return file.plans.find((plan) => plan.planId === planId) ?? null;
  }

  async update(plan: ChangePlan): Promise<void> {
    await this.withLock(async () => {
      const file = await this.read();
      await this.write({
        plans: file.plans.map((item) => (item.planId === plan.planId ? plan : item))
      });
    });
  }

  async list(): Promise<ChangePlan[]> {
    const file = await this.read();
    return file.plans;
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const previous = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  private async read(): Promise<{ plans: ChangePlan[] }> {
    try {
      const raw = await readFile(this.path, "utf8");
      return PlanFileSchema.parse(JSON.parse(raw));
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        await this.write({ plans: [] });
        return { plans: [] };
      }
      throw error;
    }
  }

  private async write(file: { plans: ChangePlan[] }): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    await writeFile(tmp, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    await rename(tmp, this.path);
  }
}
