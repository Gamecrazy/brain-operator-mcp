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

## Note Write Tools

`append_note` appends Markdown and must not overwrite existing content.
`replace_note` replaces the entire Markdown note and must remain separate from `append_note`; do not hide full-note replacement behind an append mode flag.

## TheBrain Adapter Rule

Do not leak TheBrain API quirks into MCP tool contracts. Keep field mapping in `src/thebrain/client.ts`, `src/thebrain/endpoints.ts`, or a focused adapter helper.
`src/thebrain/client.ts` selects its default connection from `THEBRAIN_MODE`: `cloud` uses `THEBRAIN_API_KEY` and `THEBRAIN_BASE_URL`; `local` uses `THEBRAIN_LOCAL_API_TOKEN` and `THEBRAIN_LOCAL_BASE_URL`.
When the selected base URL includes a path prefix such as `/api`, request URL construction must preserve that prefix.

## Local App Control Adapter

`src/thebrain/localAppClient.ts` is only for TheBrain desktop Local API app-control endpoints under `/api/app/*`.
Keep it separate from `src/thebrain/client.ts`, which owns normal TheBrain data endpoints.
Authenticate Local API app-control requests with `THEBRAIN_LOCAL_API_TOKEN`; keep cloud API requests on `THEBRAIN_API_KEY`.
Do not add a raw Local API passthrough tool. Add named MCP tools with narrow schemas instead.
Local app-control tools that change client UI state must call `requireWriteEnabled()`.

## Plan Workflow Rule

Batch writes must remain two-step:

1. `create_change_plan` validates and stores a pending plan.
2. `commit_change_plan` accepts only `planId` and `confirm: true`.

Do not add a commit API that accepts fresh changes.

Plan content may contain private source notes. Keep full content only in the local `PlanStore` for execution. Model-visible outputs, `_meta.raw`, and audit summaries must use `sanitizeChangePlanForOutput()` or `sanitizeCommitResultForOutput()` from `src/safety/sanitizePlan.ts`.
Batch note changes may be `append_note` or `replace_note`; both must redact Markdown in model-visible plan output.

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
