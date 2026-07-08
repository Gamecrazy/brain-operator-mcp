# Brain Operator MCP Design

## Decision

Build the TypeScript project `brain-operator-mcp` essentially as specified in `/Users/jimjiang/Downloads/thebrain_mcp_implementation_spec.md`.

The implementation will preserve the MCP tool contracts from the supplied spec. If the current MCP SDK or TheBrain REST API differs from examples in the spec, compatibility changes will stay inside transport, registration, or TheBrain adapter code. Tool names, inputs, safety behavior, and response shape remain stable.

## Architecture

The project is a Node.js 20+ ESM TypeScript MCP server with a Streamable HTTP endpoint at `POST /mcp` and a plain health endpoint at `GET /health`.

Core layers:

- `src/config.ts` loads and validates environment variables with Zod.
- `src/thebrain/*` owns TheBrain endpoint paths, relation mapping, API errors, and HTTP client behavior.
- `src/safety/*` owns write policy, sanitization, audit logging, URL safety, and input helpers.
- `src/tools/*` registers MCP tools and keeps tool-level summaries compact.
- `src/plans/*` stores, validates, previews, and commits batch change plans.
- `src/mcp/*` owns MCP server creation, HTTP transport, schemas, and result formatting.

## Tool Scope

Implement all v0.1 tools from the spec:

- Read tools: `health_check`, `list_brains`, `get_brain`, `search_thoughts`, `get_thought`, `get_thought_graph`, `get_note`, `list_attachments`.
- Safe write tools: `create_thought`, `update_thought`, `create_link`, `append_note`, `add_url_attachment`.
- Plan tools: `create_change_plan`, `get_change_plan`, `discard_change_plan`, `commit_change_plan`.

Do not implement destructive tools, note overwrite, batch rename, duplicate merge, file upload, OAuth, or UI widgets in v0.1.

## Safety

No real TheBrain API key may appear in source, docs, examples, tests, logs, or committed files. `.env.example` contains placeholders only, and `.env` plus `.data/` are ignored.

Write tools must call `requireWriteEnabled()`. Batch writes must go through `create_change_plan` and `commit_change_plan`; `commit_change_plan` accepts only `planId` plus `confirm: true` so the confirmed plan cannot be silently changed at commit time.

Tool output uses compact `structuredContent` and one-sentence `content`; raw TheBrain responses may be placed in `_meta.raw` after secret-safe handling.

## TheBrain API Compatibility

The implementation will check the official TheBrain API documentation during development. Endpoint names and request body details may be adapted in `src/thebrain/client.ts` and `src/thebrain/endpoints.ts`, while MCP-facing tool contracts remain as specified.

Relation numbers are isolated in `src/thebrain/relation.ts`.

## Documentation

In addition to the spec-required documentation:

- `README.md`
- `AGENTS.md`
- `docs/tool-contract.md`
- `docs/threat-model.md`
- `docs/api-endpoint-map.md`

the project will also maintain an internal developer guide at `docs/development.md`. This file will document the local architecture, test strategy, implementation conventions, and how future agents should extend the project without breaking safety guarantees.

## Testing

Use Vitest for unit tests and mocked client tests. The required verification commands are:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

The optional real TheBrain integration tests will be gated by `RUN_THEBRAIN_INTEGRATION=true` and will not run by default.

## Acceptance

The delivered project should install with `npm install`, start with a user-provided `THEBRAIN_API_KEY`, expose `/health`, register all 17 v0.1 tools, and keep secrets out of model-visible output, logs, tests, and repository files.
