# Replace Note MCP Tool Design

## Purpose

Add a safe, explicit MCP write tool for replacing a thought note's full Markdown content. The current `append_note` tool only appends; users need a separate tool that maps to TheBrain's note update endpoint and clearly communicates overwrite semantics.

## Scope

The feature adds one MCP tool:

- `replace_note`: replace the entire Markdown note for a thought.

The feature does not add partial note patching, destructive thought deletion, arbitrary Local API passthrough, or a mode switch on `append_note`.

## Architecture

Extend the existing note path:

- `src/thebrain/endpoints.ts`: add `updateNote(brainId, thoughtId)`.
- `src/thebrain/client.ts`: add `updateNote(brainId, thoughtId, markdown)`.
- `src/mcp/schemas.ts`: add `ReplaceNoteInputSchema`.
- `src/tools/note.tools.ts`: register `replace_note` beside `append_note`.

The tool uses the existing `TheBrainClient` connection selection. In `THEBRAIN_MODE=local`, it calls TheBrain desktop Local API with `THEBRAIN_LOCAL_API_TOKEN` and preserves the `/api` base URL prefix.

## Tool Contract

`replace_note`

- Input:
  - optional `brainId`
  - required `thoughtId`
  - required `markdown`, length `1..MAX_NOTE_CHARS`
- Requires `WRITE_TOOLS_ENABLED=true`.
- Calls `POST /notes/{brainId}/{thoughtId}/update`.
- Sends request body `{ markdown }`.
- Returns `{ brainId, thoughtId, chars }`.
- Does not append a separator or preserve existing note content.

## Safety

- The tool name must be `replace_note`, not `update_note`, so overwrite semantics are visible.
- The tool must call `requireWriteEnabled()` before the API call.
- The tool must not require `DESTRUCTIVE_TOOLS_ENABLED`; it changes note content but does not delete thoughts, links, attachments, or brains.
- Audit logs may include `brainId`, `thoughtId`, `chars`, and a short `markdownPreview`, but must not log the full note.
- Errors should return `REPLACE_NOTE_FAILED` with a suggestion to check `thoughtId`, note length, and write settings.

## Testing

Use test-first implementation:

- Schema test rejects over-limit replacement markdown.
- Client test confirms `updateNote()` posts to `/notes/{brainId}/{thoughtId}/update` with `{ markdown }`.
- Tool test confirms `replace_note` calls `requireWriteEnabled()`, invokes `ctx.brain.updateNote()`, and returns character count.
- Full verification remains:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm run build`

## Documentation

Update:

- `README.md`: add `replace_note` to safe writes and clarify append vs replace.
- `docs/tool-contract.md`: document `replace_note`.
- `docs/development.md`: note that full note replacement is an explicit tool and must stay separate from `append_note`.
