import { z } from "zod";
import { ChangeSchema } from "../plans/changePlan.js";
import { policy } from "../safety/policy.js";
import { isSafePublicUrl } from "../safety/validators.js";

export const RelationSchema = z.enum(["child", "parent", "jump", "sibling"]);

export const OptionalBrainIdSchema = {
  brainId: z.string().optional()
};

export const HealthCheckInputSchema = z.object({});

export const GetBrainInputSchema = z.object({
  brainId: z.string().optional()
});

export const SearchThoughtsInputSchema = z.object({
  brainId: z.string().optional(),
  queryText: z.string().min(1).max(500),
  maxResults: z.number().int().min(1).max(policy.maxSearchResults).default(20),
  onlySearchThoughtNames: z.boolean().default(false)
});

export const ThoughtIdInputSchema = z.object({
  brainId: z.string().optional(),
  thoughtId: z.string().min(1)
});

export const GetNoteInputSchema = z.object({
  brainId: z.string().optional(),
  thoughtId: z.string().min(1),
  format: z.enum(["markdown", "html", "text"]).default("markdown")
});

export const CreateThoughtInputSchema = z.object({
  brainId: z.string().optional(),
  name: z.string().min(1).max(200),
  label: z.string().max(500).optional(),
  kind: z.number().int().optional().default(1),
  typeId: z.string().optional(),
  sourceThoughtId: z.string().optional(),
  relation: RelationSchema.optional(),
  acType: z.number().int().optional().default(0),
  idempotencyKey: z.string().optional()
});

export const UpdateThoughtInputSchema = z.object({
  brainId: z.string().optional(),
  thoughtId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  label: z.string().max(500).optional(),
  typeId: z.string().nullable().optional()
});

export const CreateLinkInputSchema = z.object({
  brainId: z.string().optional(),
  thoughtIdA: z.string().min(1),
  thoughtIdB: z.string().min(1),
  relation: RelationSchema,
  name: z.string().max(200).optional(),
  label: z.string().max(500).optional(),
  idempotencyKey: z.string().optional()
});

export const AppendNoteInputSchema = z.object({
  brainId: z.string().optional(),
  thoughtId: z.string().min(1),
  markdown: z.string().min(1).max(policy.maxNoteChars),
  addSeparator: z.boolean().default(true)
});

export const AddUrlAttachmentInputSchema = z.object({
  brainId: z.string().optional(),
  thoughtId: z.string().min(1),
  url: z.string().url().refine(isSafePublicUrl, "URL must be public http/https"),
  name: z.string().max(200).optional()
});

export const AppBrainInputSchema = z.object({
  brainId: z.string().optional()
});

export const ActivateThoughtInputSchema = z.object({
  brainId: z.string().optional(),
  thoughtId: z.string().min(1)
});

export const CreateChangePlanInputSchema = z.object({
  brainId: z.string().optional(),
  title: z.string().min(1).max(200),
  changes: z.array(ChangeSchema).min(1).max(policy.maxPlanChanges),
  duplicateCheck: z.boolean().default(true)
});

export const PlanIdInputSchema = z.object({
  planId: z.string().min(1)
});

export const CommitChangePlanInputSchema = z.object({
  planId: z.string().min(1),
  confirm: z.literal(true)
});
