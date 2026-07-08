import "dotenv/config";
import { z } from "zod";

const BooleanFromEnv = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  return value;
}, z.boolean());

const EnvSchema = z.object({
  THEBRAIN_API_KEY: z.string().min(1),
  THEBRAIN_BASE_URL: z.string().url().default("https://api.bra.in"),
  THEBRAIN_MODE: z.enum(["cloud", "local"]).default("cloud"),
  THEBRAIN_DEFAULT_BRAIN_ID: z.string().optional().default(""),

  MCP_SERVER_NAME: z.string().default("brain-operator-mcp"),
  MCP_SERVER_VERSION: z.string().default("0.1.0"),
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
});

export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return EnvSchema.parse(env);
}

export const config = loadConfig();
