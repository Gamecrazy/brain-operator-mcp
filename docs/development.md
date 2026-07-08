# Development Guide

This project is maintained as a small, layered MCP server.

## Layers

- `src/config.ts`: env parsing. Do not log full env values.
- `src/thebrain/*`: TheBrain REST API adapter. If TheBrain changes field names, adapt them here.
- `src/safety/*`: policy, audit log, sanitization, URL safety, and brain ID resolution.
- `src/plans/*`: batch plan schema, file store, and commit executor.
- `src/mcp/*`: MCP server, HTTP transport, shared schemas, and result wrappers.
- `src/tools/*`: MCP tool registration. Keep tool descriptions explicit and short.

## Adding Or Changing A Tool

1. Add or update the Zod input schema in `src/mcp/schemas.ts`.
2. Add focused unit tests when behavior changes.
3. Register the tool in the relevant `src/tools/*.tools.ts` file.
4. For write tools, call `requireWriteEnabled()` before the API call.
5. Add audit logging for successful writes.
6. Update `docs/tool-contract.md` and this guide when behavior changes.

## TheBrain Adapter Rule

Do not leak TheBrain API quirks into MCP tool contracts. Keep field mapping in `src/thebrain/client.ts`, `src/thebrain/endpoints.ts`, or a focused adapter helper.

## Plan Workflow Rule

Batch writes must remain two-step:

1. `create_change_plan` validates and stores a pending plan.
2. `commit_change_plan` accepts only `planId` and `confirm: true`.

Do not add a commit API that accepts fresh changes.

Plan content may contain private source notes. Keep full content only in the local `PlanStore` for execution. Model-visible outputs, `_meta.raw`, and audit summaries must use `sanitizeChangePlanForOutput()` or `sanitizeCommitResultForOutput()` from `src/safety/sanitizePlan.ts`.

## Testing

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Optional real integration tests are gated by:

```bash
RUN_THEBRAIN_INTEGRATION=true THEBRAIN_API_KEY=... THEBRAIN_TEST_BRAIN_ID=... npm test -- tests/thebrain.integration.test.ts
```

Integration tests create `[MCP_TEST]` data and do not delete it because v0.1 intentionally has no destructive tools.
