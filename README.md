# Brain Operator MCP

A TypeScript MCP server that lets ChatGPT and other MCP clients read and safely modify TheBrain through the TheBrain REST API.

## Setup

```bash
npm install
cp .env.example .env
# edit .env and set THEBRAIN_API_KEY
npm run dev
```

The server defaults to:

- `GET /health`
- `POST /mcp`
- `GET /brain/health`
- `POST /brain/mcp`
- `GET /brain/v012/health`
- `POST /brain/v012/mcp`
- TheBrain Cloud API base URL: `https://api.bra.in`
- TheBrain Local API base URL: `http://localhost:8001/api`

Set `THEBRAIN_MODE=local` when you want the normal brain, thought, note, link, and attachment tools to use TheBrain desktop Local API instead of TheBrain Cloud API. In local mode those tools authenticate with `THEBRAIN_LOCAL_API_TOKEN` and use `THEBRAIN_LOCAL_BASE_URL`; `THEBRAIN_API_KEY` is only required in cloud mode.

## Health

```bash
curl http://localhost:3000/health
```

Expected:

```json
{
  "ok": true,
  "name": "brain-operator-mcp",
  "version": "0.1.5"
}
```

## MCP Inspector

```bash
npm run inspect
```

Use `http://localhost:3000/mcp` as the Streamable HTTP endpoint.

## ChatGPT App Endpoint

For development, expose the local server through HTTPS:

```bash
npm run dev
ngrok http 3000
```

Then add this MCP server endpoint in ChatGPT developer mode:

```text
https://<ngrok-subdomain>.ngrok.app/mcp
```

If `MCP_API_TOKEN` is set, clients must send:

```http
Authorization: Bearer <MCP_API_TOKEN>
```

### Shared Domain Path Routing

If `mcp.gamescrazy.win` is already used by another MCP service, keep that service on `/mcp` and expose this server under `/brain/mcp`.

Cloudflared ingress example:

```yaml
ingress:
  - hostname: mcp.gamescrazy.win
    path: /brain/.*
    service: http://127.0.0.1:3000
  - hostname: mcp.gamescrazy.win
    service: http://127.0.0.1:7676
  - service: http_status:404
```

Then use this MCP endpoint:

```text
https://mcp.gamescrazy.win/brain/mcp
```

## Tools

Read-only:

- `health_check`
- `list_brains`
- `get_brain`
- `search_thoughts`
- `get_thought`
- `get_thought_graph`
- `get_note`
- `list_attachments`

Safe writes:

- `create_thought`
- `update_thought`
- `create_link`
- `append_note`
- `replace_note`
- `add_url_attachment`

Local app control:

- `get_app_state`
- `open_brain`
- `activate_thought`
- `close_brain_tab`

Plan workflow:

- `create_change_plan`
- `create_note_update_plan`
- `get_change_plan`
- `discard_change_plan`
- `commit_change_plan`

Batch plans support `create_thought`, `create_link`, `append_note`, and `replace_note` changes.
Use `create_note_update_plan` when a client hides or blocks the direct `replace_note` tool; it creates a pending plan for a full note update and still requires `commit_change_plan` with `confirm: true` before TheBrain is changed.

## Local App Control

The MCP server can control the local TheBrain desktop client through TheBrain Local API.

1. In TheBrain desktop, enable Local API in settings.
2. Copy the Local API token into `THEBRAIN_LOCAL_API_TOKEN` in `.env`.
3. Set `THEBRAIN_LOCAL_BASE_URL` if your Local API is not on `http://localhost:8001/api`.

Local-only tools:

- `get_app_state`
- `open_brain`
- `activate_thought`
- `close_brain_tab`

`open_brain`, `activate_thought`, and `close_brain_tab` require `WRITE_TOOLS_ENABLED=true` because they change local client UI state.

## Safety

- Never put a real API key in source, docs, tests, logs, screenshots, or commits.
- Single-step write tools respect `WRITE_TOOLS_ENABLED`.
- Destructive tools are not registered in v0.1.
- Batch writes must be created as a plan, reviewed by the user, then committed by `planId`.
- Notes are append-only and limited by `MAX_NOTE_CHARS`.
- `replace_note` is the explicit full-note content setting tool. It sends the provided Markdown body to TheBrain's note update endpoint and is kept separate from `append_note`.
- URL attachments reject local and private-network hosts.

## Manual Smoke Tests

Read-only:

```text
Call list_brains.
Pick a brainId.
Call search_thoughts with queryText = "test".
Call get_thought on one result.
```

Single-step write:

```text
Call create_thought:
- name: "[MCP_TEST] Brain Operator Smoke Test"
- label: "Created by brain-operator-mcp smoke test"

Call append_note on created thought:
- markdown: "This is a smoke test note."
```

Batch plan/commit:

The example below uses redacted placeholders. Do not paste private source notes into public docs, issues, or screenshots.

```json
{
  "title": "[MCP_TEST] Redacted Import",
  "changes": [
    {
      "id": "c1",
      "op": "create_thought",
      "clientRef": "t_root",
      "name": "[MCP_TEST] REDACTED_ROOT_TOPIC",
      "label": "[REDACTED_LABEL]"
    },
    {
      "id": "c2",
      "op": "create_thought",
      "clientRef": "t_core_loop",
      "name": "[MCP_TEST] REDACTED_CHILD_TOPIC"
    },
    {
      "id": "c3",
      "op": "create_link",
      "fromRef": "t_root",
      "toRef": "t_core_loop",
      "relation": "child"
    },
    {
      "id": "c4",
      "op": "append_note",
      "targetRef": "t_root",
      "markdown": "[REDACTED_MARKDOWN_CONTENT]"
    },
    {
      "id": "c5",
      "op": "replace_note",
      "targetRef": "t_core_loop",
      "markdown": "[REDACTED_REPLACEMENT_MARKDOWN]"
    }
  ]
}
```

Then call `commit_change_plan` with:

```json
{
  "planId": "returned_plan_id",
  "confirm": true
}
```

Single-note update plan:

```json
{
  "brainId": "brain_id",
  "thoughtId": "thought_id",
  "title": "Update note",
  "markdown": "[REDACTED_REPLACEMENT_MARKDOWN]"
}
```

Then call `commit_change_plan` with the returned `planId` and `confirm: true`.

## Common Errors

- `BRAIN_ID_REQUIRED`: pass `brainId` or set `THEBRAIN_DEFAULT_BRAIN_ID`.
- `WRITE_DISABLED`: set `WRITE_TOOLS_ENABLED=true` when you intentionally want writes.
- `UNSAFE_URL`: use a public `http` or `https` URL.
- `PLAN_NOT_PENDING`: the plan was already committed, discarded, or expired.
- `LOCAL_APP_TOKEN_REQUIRED`: set `THEBRAIN_LOCAL_API_TOKEN` from TheBrain desktop Local API settings.
- `LOCAL_APP_UNAVAILABLE`: enable TheBrain Local API and check `THEBRAIN_LOCAL_BASE_URL`.
- `LOCAL_APP_AUTH_FAILED`: use the Local API token from TheBrain desktop settings.
- `LOCAL_APP_ACTION_FAILED`: check the brain/thought IDs and local client state.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
