# AGENTS.md

## Rules

- Never commit `.env` or secrets.
- Keep TheBrain API key in `THEBRAIN_API_KEY` only.
- All write tools must call `requireWriteEnabled()`.
- Batch writes must go through `create_change_plan` then `commit_change_plan`.
- Do not add destructive tools unless explicitly requested and separately reviewed.
- Preserve MCP tool contracts when changing TheBrain adapter internals.
- Update `docs/development.md` when architecture, testing, or tool behavior changes.

## Commands

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
