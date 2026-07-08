# Brain Operator MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `brain-operator-mcp` TypeScript Remote MCP server described in `/Users/jimjiang/Downloads/thebrain_mcp_implementation_spec.md`.

**Architecture:** The server is split into config, MCP transport, TheBrain API adapter, safety helpers, plan execution, and tool registration layers. MCP-facing contracts stay stable; SDK or TheBrain API differences are absorbed in adapter modules.

**Tech Stack:** Node.js 20+, TypeScript 5, ESM, Express, MCP SDK, Zod, Pino, Vitest, ESLint.

## Global Constraints

- Do not hardcode or commit real TheBrain API keys.
- Do not register destructive tools in v0.1.
- Do not overwrite notes; only append note content.
- Keep model-visible output compact and secret-free.
- Write tools must call `requireWriteEnabled()`.
- Batch writes must use `create_change_plan` then `commit_change_plan`.
- Maintain project docs, including `docs/development.md`, when architecture or tool behavior changes.

---

### Task 1: Project Scaffold And Baseline Tests

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `eslint.config.js`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `src/config.ts`
- Create: `src/logger.ts`
- Create: `src/safety/sanitize.ts`
- Create: `src/safety/policy.ts`
- Test: `tests/sanitize.test.ts`
- Test: `tests/policy.test.ts`

**Interfaces:**
- Produces: `config`, `logger`, `redactSecret(value: string)`, `sanitizeError(error: unknown)`, `policy`, `requireWriteEnabled()`.

- [ ] Write failing tests for secret redaction and disabled-write policy.
- [ ] Run `npm test tests/sanitize.test.ts tests/policy.test.ts` and confirm failure.
- [ ] Implement config, logger, sanitize, and policy modules.
- [ ] Run targeted tests and confirm pass.

### Task 2: TheBrain Adapter

**Files:**
- Create: `src/thebrain/endpoints.ts`
- Create: `src/thebrain/errors.ts`
- Create: `src/thebrain/relation.ts`
- Create: `src/thebrain/types.ts`
- Create: `src/util/fetchWithTimeout.ts`
- Create: `src/thebrain/client.ts`
- Test: `tests/relation.test.ts`
- Test: `tests/thebrainClient.test.ts`

**Interfaces:**
- Produces: `TheBrainClient`, `TheBrainApiError`, `relationToApiValue(relation)`.

- [ ] Verify official TheBrain endpoints at `https://api.bra.in/index.html`.
- [ ] Write failing tests for relation mapping and client JSON/text/error/timeout behavior.
- [ ] Implement endpoint constants, typed API error, relation mapping, and client request/retry logic.
- [ ] Run targeted tests and confirm pass.

### Task 3: Safety Validators And Plan Store

**Files:**
- Create: `src/safety/validators.ts`
- Create: `src/safety/auditLog.ts`
- Create: `src/safety/idempotency.ts`
- Create: `src/plans/changePlan.ts`
- Create: `src/plans/planStore.ts`
- Test: `tests/planStore.test.ts`
- Test: `tests/toolSchemas.test.ts`

**Interfaces:**
- Produces: `resolveBrainId`, `isSafePublicUrl`, `auditLog`, `ChangePlanSchema`, `FilePlanStore`.

- [ ] Write failing tests for file plan store lifecycle and schema rejection of unsafe URLs / long notes.
- [ ] Implement validators, JSONL audit logging, change plan schemas, and atomic JSON file plan store.
- [ ] Run targeted tests and confirm pass.

### Task 4: Commit Executor

**Files:**
- Create: `src/plans/commitExecutor.ts`
- Test: `tests/commitExecutor.test.ts`

**Interfaces:**
- Produces: `commitChangePlan({ brain, planStore, planId }): Promise<CommitResult>`.

- [ ] Write failing tests for created thought ref mapping, link ref resolution, and unresolved link failure.
- [ ] Implement sequential commit execution with partial failure reporting and audit logging.
- [ ] Run targeted tests and confirm pass.

### Task 5: MCP Server And Tools

**Files:**
- Create: `src/mcp/createServer.ts`
- Create: `src/mcp/http.ts`
- Create: `src/mcp/result.ts`
- Create: `src/mcp/schemas.ts`
- Create: `src/server.ts`
- Create: `src/index.ts`
- Create: `src/tools/health.tools.ts`
- Create: `src/tools/brain.tools.ts`
- Create: `src/tools/thought.tools.ts`
- Create: `src/tools/link.tools.ts`
- Create: `src/tools/note.tools.ts`
- Create: `src/tools/attachment.tools.ts`
- Create: `src/tools/plan.tools.ts`
- Create: `src/tools/registerAllTools.ts`

**Interfaces:**
- Produces: Express app with `GET /health`, `POST /mcp`, and all 17 v0.1 MCP tools.

- [ ] Register health/read/write/plan tools with Zod input schemas.
- [ ] Ensure every write tool calls `requireWriteEnabled()`.
- [ ] Ensure compact tool responses use `ok()` / `fail()`.
- [ ] Run `npm run typecheck` and fix SDK type mismatches.

### Task 6: Documentation And Verification

**Files:**
- Create: `README.md`
- Create: `AGENTS.md`
- Create: `docs/tool-contract.md`
- Create: `docs/threat-model.md`
- Create: `docs/api-endpoint-map.md`
- Create: `docs/development.md`

**Interfaces:**
- Produces: user setup docs, future-agent guidance, tool contract, threat model, endpoint map, developer guide.

- [ ] Document setup, health check, MCP Inspector, ChatGPT endpoint, tools, safety, and manual smoke tests.
- [ ] Document internal architecture and maintenance conventions in `docs/development.md`.
- [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
- [ ] Start the server with a placeholder-safe local env and verify `/health`.
