import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TheBrainClient } from "../thebrain/client.js";
import type { LocalAppClient } from "../thebrain/localAppClient.js";
import type { PlanStore } from "../plans/planStore.js";
import { registerAppTools } from "./app.tools.js";
import { registerAttachmentTools } from "./attachment.tools.js";
import { registerBrainTools } from "./brain.tools.js";
import { registerHealthTools } from "./health.tools.js";
import { registerLinkTools } from "./link.tools.js";
import { registerNoteTools } from "./note.tools.js";
import { registerPlanTools } from "./plan.tools.js";
import { registerThoughtTools } from "./thought.tools.js";

export type ToolContext = {
  brain: TheBrainClient;
  localApp: LocalAppClient;
  planStore: PlanStore;
};

export function registerAllTools(server: McpServer, ctx: ToolContext) {
  registerHealthTools(server, ctx);
  registerBrainTools(server, ctx);
  registerThoughtTools(server, ctx);
  registerLinkTools(server, ctx);
  registerNoteTools(server, ctx);
  registerAttachmentTools(server, ctx);
  registerAppTools(server, ctx);
  registerPlanTools(server, ctx);
}
