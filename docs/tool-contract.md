# Tool Contract

All tools return:

```ts
type ToolSuccess<T> = {
  ok: true;
  data: T;
  warning?: string;
};

type ToolFailure = {
  ok: false;
  code: string;
  message: string;
  recoverable: boolean;
  suggestedAction?: string;
};
```

MCP responses use:

- `structuredContent` for concise model-visible data.
- `content[0].text` for a one-sentence human summary.
- `_meta.raw` for raw TheBrain responses when useful and secret-safe.
- Batch plan and commit outputs must redact note markdown, labels, created thought names, and duplicate candidate details from model-visible output and audit result summaries.

## Read Tools

- `health_check`: no input. Returns server mode, version, write flags, and default brain status.
- `list_brains`: no input. Calls `GET /brains`.
- `get_brain`: optional `brainId`. Calls `GET /brains/{brainId}`.
- `search_thoughts`: optional `brainId`, `queryText`, `maxResults`, `onlySearchThoughtNames`. Calls `GET /search/{brainId}`.
- `get_thought`: optional `brainId`, `thoughtId`. Calls `GET /thoughts/{brainId}/{thoughtId}`.
- `get_thought_graph`: optional `brainId`, `thoughtId`. Calls `GET /thoughts/{brainId}/{thoughtId}/graph`.
- `get_note`: optional `brainId`, `thoughtId`, `format`. Calls markdown, HTML, or text note endpoint.
- `list_attachments`: optional `brainId`, `thoughtId`. Calls `GET /thoughts/{brainId}/{thoughtId}/attachments`.

## Write Tools

- `create_thought`: creates a thought. Requires writes enabled.
- `update_thought`: updates `name`, `label`, or `typeId`. Requires at least one patch field.
- `create_link`: creates a relation between two thoughts.
- `append_note`: appends markdown only. It never overwrites an existing note.
- `add_url_attachment`: adds a public HTTP or HTTPS URL attachment.

## Local App Control Tools

- `get_app_state`: no input. Calls `GET /api/app/state` on `THEBRAIN_LOCAL_BASE_URL`.
- `open_brain`: optional `brainId`. Requires writes enabled. Calls `POST /api/app/brain/{brainId}/open`.
- `activate_thought`: optional `brainId`, required `thoughtId`. Requires writes enabled. Calls `POST /api/app/brain/{brainId}/thought/{thoughtId}/activate`.
- `close_brain_tab`: optional `brainId`. Requires writes enabled. Calls `POST /api/app/brain/{brainId}/close`.

Local app-control tools authenticate with `THEBRAIN_LOCAL_API_TOKEN`, not `THEBRAIN_API_KEY`.

## Plan Tools

- `create_change_plan`: validates and stores a pending batch plan. Does not write to TheBrain.
- `get_change_plan`: reads a stored plan with content fields redacted for output.
- `discard_change_plan`: marks a stored plan as discarded.
- `commit_change_plan`: executes a stored plan. Accepts only `planId` and `confirm: true`. Returns IDs and counts, not full imported content.

## Error Codes

Common codes include `BRAIN_ID_REQUIRED`, `WRITE_DISABLED`, `UNSAFE_URL`, `RELATION_REQUIRED`, `NO_PATCH_FIELDS`, `PLAN_NOT_FOUND`, `PLAN_EXPIRED`, `PLAN_NOT_PENDING`, `PLAN_VALIDATION_FAILED`, `LOCAL_APP_TOKEN_REQUIRED`, `LOCAL_APP_UNAVAILABLE`, `LOCAL_APP_AUTH_FAILED`, `LOCAL_APP_ACTION_FAILED`, and `UNKNOWN_ERROR`.
