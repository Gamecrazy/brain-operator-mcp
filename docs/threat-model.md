# Threat Model

## Assets

- TheBrain Cloud API key.
- TheBrain desktop Local API token.
- User brain IDs, thought IDs, notes, links, and attachments.
- Local plan store data in `.data/plans.json`.
- Local audit log data in `.data/audit.log`.

## Main Risks

- Secret exposure through logs, tool output, tests, docs, or commits.
- Accidental writes caused by ambiguous natural language.
- Batch writes changing after user confirmation.
- SSRF through URL attachments.
- Long note append failures or accidental note overwrites.
- Remote `/mcp` endpoint abuse.

## Controls

- Cloud API key is loaded only from `THEBRAIN_API_KEY`.
- TheBrain desktop Local API token is loaded only from `THEBRAIN_LOCAL_API_TOKEN`.
- Logger redacts authorization headers and token-like keys.
- Tool errors are sanitized before model-visible output.
- Destructive tools are not registered.
- Write tools call `requireWriteEnabled()`.
- Batch writes use immutable stored plans; commit accepts only `planId` and `confirm: true`.
- URL attachment schema rejects local and private network hosts.
- Notes are append-only and capped by `MAX_NOTE_CHARS`.
- Optional `MCP_API_TOKEN` protects remote MCP access.
- Express rate limit caps request bursts.

## Residual Risks

- DNS rebinding protection is limited in v0.1 because URL safety checks are hostname-based.
- TheBrain API field changes may require adapter updates.
- Local JSON plan storage is suitable for v0.1 but not ideal for high-concurrency production use.
