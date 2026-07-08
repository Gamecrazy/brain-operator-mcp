import { z } from "zod";
import { policy } from "../safety/policy.js";

export const CreateThoughtChangeSchema = z.object({
  id: z.string().min(1),
  op: z.literal("create_thought"),
  clientRef: z.string().min(1),
  name: z.string().min(1).max(200),
  label: z.string().max(500).optional(),
  kind: z.number().int().optional().default(1),
  typeId: z.string().optional()
});

export const CreateLinkChangeSchema = z.object({
  id: z.string().min(1),
  op: z.literal("create_link"),
  fromRef: z.string().min(1),
  toRef: z.string().min(1),
  relation: z.enum(["child", "parent", "jump", "sibling"]),
  label: z.string().max(500).optional()
});

export const AppendNoteChangeSchema = z.object({
  id: z.string().min(1),
  op: z.literal("append_note"),
  targetRef: z.string().min(1),
  markdown: z.string().min(1).max(policy.maxNoteChars)
});

export const ChangeSchema = z.discriminatedUnion("op", [
  CreateThoughtChangeSchema,
  CreateLinkChangeSchema,
  AppendNoteChangeSchema
]);

export const ChangePlanSchema = z.object({
  planId: z.string().min(1),
  brainId: z.string().min(1),
  title: z.string().min(1).max(200),
  createdAt: z.string(),
  expiresAt: z.string(),
  status: z.enum(["pending", "committed", "discarded", "expired"]),
  changes: z.array(ChangeSchema).min(1).max(policy.maxPlanChanges),
  duplicateCandidates: z.array(z.unknown()).default([])
});

export type CreateThoughtChange = z.infer<typeof CreateThoughtChangeSchema>;
export type CreateLinkChange = z.infer<typeof CreateLinkChangeSchema>;
export type AppendNoteChange = z.infer<typeof AppendNoteChangeSchema>;
export type Change = z.infer<typeof ChangeSchema>;
export type ChangePlan = z.infer<typeof ChangePlanSchema>;
