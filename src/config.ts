import "dotenv/config";
import { z } from "zod";

const BooleanFromEnv = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  return value;
}, z.boolean());

const EnvSchema = z.object({
  THEBRAIN_API_KEY: z.string().optional().default(""),
  THEBRAIN_BASE_URL: z.string().url().default("https://api.bra.in"),
  THEBRAIN_LOCAL_API_TOKEN: z.string().optional().default(""),
  THEBRAIN_LOCAL_BASE_URL: z.string().url().default("http://localhost:8001/api"),
  THEBRAIN_MODE: z.enum(["cloud", "local"]).default("cloud"),
  THEBRAIN_DEFAULT_BRAIN_ID: z.string().optional().default(""),

  MCP_SERVER_NAME: z.string().default("brain-operator-mcp"),
  MCP_SERVER_VERSION: z.string().default("0.1.5"),
  PORT: z.coerce.number().int().positive().default(3000),

  WRITE_TOOLS_ENABLED: BooleanFromEnv.default(true),
  DESTRUCTIVE_TOOLS_ENABLED: BooleanFromEnv.default(false),
  MAX_NOTE_CHARS: z.coerce.number().int().positive().default(10000),
  MAX_SEARCH_RESULTS: z.coerce.number().int().positive().max(100).default(50),
  MAX_PLAN_CHANGES: z.coerce.number().int().positive().max(500).default(100),
  PLAN_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  AUDIT_LOG_ENABLED: BooleanFromEnv.default(true),
  AUDIT_LOG_PATH: z.string().default(".data/audit.log"),
  PLAN_STORE_PATH: z.string().default(".data/plans.json"),

  MCP_API_TOKEN: z.string().optional().default(""),
  LOG_LEVEL: z.string().default("info"),
  NODE_ENV: z.string().default("development")
}).superRefine((env, ctx) => {
  if (env.THEBRAIN_MODE === "cloud" && !env.THEBRAIN_API_KEY) {
    ctx.addIssue({
      code: "custom",
      path: ["THEBRAIN_API_KEY"],
      message: "THEBRAIN_API_KEY is required when THEBRAIN_MODE=cloud"
    });
  }
  if (env.THEBRAIN_MODE === "local" && !env.THEBRAIN_LOCAL_API_TOKEN) {
    ctx.addIssue({
      code: "custom",
      path: ["THEBRAIN_LOCAL_API_TOKEN"],
      message: "THEBRAIN_LOCAL_API_TOKEN is required when THEBRAIN_MODE=local"
    });
  }
});

export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return EnvSchema.parse(env);
}

export const config = loadConfig();
