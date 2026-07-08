# Local App Control MCP Design

## Purpose

Add MCP tools that control the local TheBrain desktop client through TheBrain Local API. This first version focuses on app state and tab/thought activation, not replacing the existing cloud-compatible data tools.

## Scope

The feature adds four local-only MCP tools:

- `get_app_state`: read the local desktop client's current brain, active thought, login state, and open tabs.
- `open_brain`: open a brain tab in the local desktop client.
- `activate_thought`: activate a thought in the local desktop client.
- `close_brain_tab`: close a brain tab in the local desktop client.

The feature does not add arbitrary Local API passthrough, destructive data operations, or new note/thought mutation semantics.

## Architecture

Add a small desktop-control adapter beside the existing TheBrain REST adapter:

- `src/thebrain/localAppClient.ts` handles Local API HTTP requests under `/api/app/*`.
- `src/tools/app.tools.ts` registers local app MCP tools.
- `src/tools/registerAllTools.ts` wires the new tool group into the server.
- `src/config.ts` adds `THEBRAIN_LOCAL_BASE_URL`, defaulting to `http://localhost:8001/api`.

This keeps app-control behavior separate from `src/thebrain/client.ts`, which remains responsible for normal TheBrain data endpoints.

## Configuration

The first version uses:

- `THEBRAIN_API_KEY`: bearer token for Local API requests. The key must remain in `.env` only.
- `THEBRAIN_LOCAL_BASE_URL`: Local API base URL, default `http://localhost:8001/api`.
- `WRITE_TOOLS_ENABLED`: required for `open_brain`, `activate_thought`, and `close_brain_tab`.

`THEBRAIN_MODE` is not required to be `local` for these tools. The tools are explicitly local-only by name and implementation.

## Tool Contracts

`get_app_state`

- Input: none.
- Calls: `GET /api/app/state`.
- Returns concise structured state:
  - `currentBrainId`
  - `currentBrainName`
  - `activeThoughtId`
  - `activeThoughtName`
  - `isLoggedIn`
  - `userId`
  - `tabs`

`open_brain`

- Input: optional `brainId`, resolved through the existing default brain ID helper.
- Requires `WRITE_TOOLS_ENABLED=true`.
- Calls: `POST /api/app/brain/{brainId}/open`.
- Returns the opened `brainId`.

`activate_thought`

- Input: optional `brainId`, required `thoughtId`.
- Requires `WRITE_TOOLS_ENABLED=true`.
- Calls: `POST /api/app/brain/{brainId}/thought/{thoughtId}/activate`.
- Returns the target `brainId` and `thoughtId`.

`close_brain_tab`

- Input: optional `brainId`, resolved through the existing default brain ID helper.
- Requires `WRITE_TOOLS_ENABLED=true`.
- Calls: `POST /api/app/brain/{brainId}/close`.
- Returns the closed `brainId`.

## Safety

- Do not log or return `THEBRAIN_API_KEY`.
- Do not add arbitrary Local API request tools.
- Keep `close_brain_tab` behind `WRITE_TOOLS_ENABLED`; it changes local client UI state even though it does not delete data.
- Audit successful app-control actions with action name, `brainId`, and `thoughtId` where applicable.
- Preserve the existing rule that all write tools call `requireWriteEnabled()`.

## Error Handling

Local API errors should be normalized through the same user-facing MCP result shape as existing tools:

- `LOCAL_APP_UNAVAILABLE`: local client is closed, port is wrong, or Local API is disabled.
- `LOCAL_APP_AUTH_FAILED`: Local API rejected the API key.
- `LOCAL_APP_ACTION_FAILED`: request reached Local API but the action failed.
- `BRAIN_ID_REQUIRED`: no input brain ID and no configured default brain ID.

The underlying HTTP response may be kept in `_meta.raw` only when it is safe and does not contain secrets.

## Testing

Use test-first implementation:

- Unit test `LocalAppClient` builds URLs under `THEBRAIN_LOCAL_BASE_URL`, sends bearer auth, parses JSON state, and converts failed HTTP responses into sanitized errors.
- Unit test app tool registration covers tool names and input schemas.
- Unit test write tools call `requireWriteEnabled()` behavior by verifying disabled writes fail before HTTP calls.
- Existing test commands remain required:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm run build`

Manual smoke test with the real desktop client:

1. Enable Local API in TheBrain desktop settings.
2. Put the Local API key in `THEBRAIN_API_KEY`.
3. Start MCP server.
4. Call `get_app_state`.
5. Call `open_brain`.
6. Call `activate_thought` for a known thought.
7. Call `close_brain_tab`.

## Documentation

Update:

- `.env.example`: add `THEBRAIN_LOCAL_BASE_URL`.
- `README.md`: document Local App Control tools and setup.
- `docs/tool-contract.md`: add the four tool contracts and local error codes.
- `docs/development.md`: document the separation between data API adapter and local app-control adapter.
