# Replace Note MCP Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `replace_note` MCP tool that replaces an entire TheBrain thought note with new Markdown content.

**Architecture:** Extend the existing note tool path with a new schema, client method, endpoint helper, and MCP tool registration. Keep replacement separate from `append_note` so overwrite semantics are visible to ChatGPT and users.

**Tech Stack:** TypeScript, Zod, MCP TypeScript SDK, Vitest.

## Global Constraints

- Never commit `.env` or secrets.
- Keep TheBrain API key in `THEBRAIN_API_KEY` only.
- All write tools must call `requireWriteEnabled()`.
- Batch writes must go through `create_change_plan` then `commit_change_plan`.
- Do not add destructive tools unless explicitly requested and separately reviewed.
- Preserve MCP tool contracts when changing TheBrain adapter internals.
- Update `docs/development.md` when architecture, testing, or tool behavior changes.
- `replace_note` must replace full note content and must not append separators.
- Audit logs must not store full replacement Markdown.

---

## File Structure

- Modify `src/mcp/schemas.ts`: add `ReplaceNoteInputSchema`.
- Modify `src/thebrain/endpoints.ts`: add `updateNote(brainId, thoughtId)`.
- Modify `src/thebrain/client.ts`: add `updateNote(brainId, thoughtId, markdown)`.
- Modify `src/tools/note.tools.ts`: register `replace_note`.
- Modify `tests/toolSchemas.test.ts`: cover replacement note length validation.
- Modify `tests/thebrainClient.test.ts`: cover update endpoint URL/body.
- Create `tests/noteTools.test.ts`: cover tool registration, write gating, API call, and response.
- Modify `README.md`, `docs/tool-contract.md`, and `docs/development.md`: document the new tool.

---

### Task 1: Tests

**Files:**
- Modify: `tests/toolSchemas.test.ts`
- Modify: `tests/thebrainClient.test.ts`
- Create: `tests/noteTools.test.ts`

**Interfaces:**
- Consumes existing `AppendNoteInputSchema`, `TheBrainClient`, and `registerNoteTools`.
- Produces failing tests for `ReplaceNoteInputSchema`, `TheBrainClient.updateNote()`, and `replace_note`.

- [ ] **Step 1: Add failing schema coverage**

Add imports:

```ts
import { ReplaceNoteInputSchema } from "../src/mcp/schemas.js";
```

Add test:

```ts
it("rejects replacement notes over the configured limit", () => {
  expect(() =>
    ReplaceNoteInputSchema.parse({
      thoughtId: "thought_1",
      markdown: "x".repeat(10001)
    })
  ).toThrow();
});
```

- [ ] **Step 2: Add failing client coverage**

Add to `tests/thebrainClient.test.ts`:

```ts
it("updates note content through the update endpoint", async () => {
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
  vi.stubGlobal("fetch", fetchMock);

  const client = new TheBrainClient("local_token", "http://localhost:8001/api");
  await client.updateNote("brain_1", "thought_1", "replacement markdown");

  expect(fetchMock).toHaveBeenCalledWith(
    new URL("http://localhost:8001/api/notes/brain_1/thought_1/update"),
    expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "Content-Type": "application/json" }),
      body: JSON.stringify({ markdown: "replacement markdown" })
    })
  );
});
```

- [ ] **Step 3: Add failing tool coverage**

Create `tests/noteTools.test.ts`:

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerNoteTools } from "../src/tools/note.tools.js";

function makeServer() {
  return new McpServer({ name: "test", version: "0.0.0" });
}

function toolHandlers() {
  const handlers = new Map<string, (input: any) => Promise<any>>();
  const server = makeServer();
  vi.spyOn(server, "registerTool").mockImplementation((name: string, _config: any, handler: any) => {
    handlers.set(name, handler);
    return undefined as never;
  });
  return { server, handlers };
}

describe("note tools", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.WRITE_TOOLS_ENABLED = "true";
  });

  it("registers replace_note beside existing note tools", () => {
    const { server, handlers } = toolHandlers();
    registerNoteTools(server, {
      brain: {} as any,
      localApp: {} as any,
      planStore: {} as any
    });

    expect([...handlers.keys()].sort()).toEqual(["append_note", "get_note", "replace_note"]);
  });

  it("replaces note content and returns character count", async () => {
    const updateNote = vi.fn().mockResolvedValue({ success: true });
    const { server, handlers } = toolHandlers();
    registerNoteTools(server, {
      brain: { updateNote } as any,
      localApp: {} as any,
      planStore: {} as any
    });

    const result = await handlers.get("replace_note")?.({
      brainId: "brain_1",
      thoughtId: "thought_1",
      markdown: "replacement markdown"
    });

    expect(updateNote).toHaveBeenCalledWith("brain_1", "thought_1", "replacement markdown");
    expect(result.structuredContent).toEqual({
      ok: true,
      data: { brainId: "brain_1", thoughtId: "thought_1", chars: 20 }
    });
  });
});
```

- [ ] **Step 4: Run tests and verify they fail**

Run:

```bash
npm test -- tests/toolSchemas.test.ts tests/thebrainClient.test.ts tests/noteTools.test.ts
```

Expected: FAIL because `ReplaceNoteInputSchema`, `updateNote`, and `replace_note` do not exist.

---

### Task 2: Implementation

**Files:**
- Modify: `src/mcp/schemas.ts`
- Modify: `src/thebrain/endpoints.ts`
- Modify: `src/thebrain/client.ts`
- Modify: `src/tools/note.tools.ts`

**Interfaces:**
- Produces `ReplaceNoteInputSchema`.
- Produces `TheBrainClient.updateNote(brainId: string, thoughtId: string, markdown: string): Promise<unknown>`.
- Produces MCP tool `replace_note`.

- [ ] **Step 1: Add schema**

Add:

```ts
export const ReplaceNoteInputSchema = z.object({
  brainId: z.string().optional(),
  thoughtId: z.string().min(1),
  markdown: z.string().min(1).max(policy.maxNoteChars)
});
```

- [ ] **Step 2: Add endpoint and client method**

Add to `endpoints`:

```ts
updateNote: (brainId: string, thoughtId: string) =>
  `/notes/${encodeURIComponent(brainId)}/${encodeURIComponent(thoughtId)}/update`,
```

Add to `TheBrainClient`:

```ts
updateNote(brainId: string, thoughtId: string, markdown: string) {
  return this.request<unknown>("POST", endpoints.updateNote(brainId, thoughtId), {
    body: { markdown }
  });
}
```

- [ ] **Step 3: Register tool**

Import `ReplaceNoteInputSchema` in `src/tools/note.tools.ts` and register:

```ts
server.registerTool(
  "replace_note",
  {
    description:
      "Replace the entire Markdown note for an existing TheBrain thought. Write operation. Overwrites existing note content.",
    inputSchema: ReplaceNoteInputSchema
  },
  async (input) => {
    try {
      requireWriteEnabled();
      const brainId = resolveBrainId(input.brainId);
      const raw = await ctx.brain.updateNote(brainId, input.thoughtId, input.markdown);
      await auditLog("replace_note", {
        brainId,
        thoughtId: input.thoughtId,
        markdownPreview: input.markdown.slice(0, 500),
        chars: input.markdown.length
      });
      return ok({ brainId, thoughtId: input.thoughtId, chars: input.markdown.length }, "Note replaced.", { raw });
    } catch (error) {
      return toolFailure("REPLACE_NOTE_FAILED", error, "Check thoughtId, note length, and write settings.");
    }
  }
);
```

- [ ] **Step 4: Run targeted tests**

Run:

```bash
npm test -- tests/toolSchemas.test.ts tests/thebrainClient.test.ts tests/noteTools.test.ts
```

Expected: PASS.

---

### Task 3: Documentation And Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/tool-contract.md`
- Modify: `docs/development.md`

**Interfaces:**
- Documents `replace_note` separately from `append_note`.

- [ ] **Step 1: Update docs**

Add `replace_note` to the safe write tools list in `README.md` and state that it overwrites the full Markdown note.

Add to `docs/tool-contract.md`:

```md
- `replace_note`: replaces the entire Markdown note for a thought. Requires writes enabled. Calls `POST /notes/{brainId}/{thoughtId}/update`.
```

Add to `docs/development.md`:

```md
`replace_note` must remain separate from `append_note`; do not hide full-note replacement behind an append mode flag.
```

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Expected: all commands pass.

- [ ] **Step 3: Commit implementation**

```bash
git add src/mcp/schemas.ts src/thebrain/endpoints.ts src/thebrain/client.ts src/tools/note.tools.ts tests/toolSchemas.test.ts tests/thebrainClient.test.ts tests/noteTools.test.ts README.md docs/tool-contract.md docs/development.md
git commit -m "feat: add replace note tool"
```
