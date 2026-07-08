import { describe, expect, it } from "vitest";
import { TheBrainClient } from "../src/thebrain/client.js";

const runIntegration = process.env.RUN_THEBRAIN_INTEGRATION === "true";
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration("TheBrain integration", () => {
  it("lists, searches, creates, and appends using a real test brain", async () => {
    const brainId = process.env.THEBRAIN_TEST_BRAIN_ID;
    expect(brainId).toBeTruthy();

    const client = new TheBrainClient();
    await expect(client.listBrains()).resolves.toBeTruthy();
    await expect(
      client.searchThoughts({
        brainId: brainId!,
        queryText: "test",
        maxResults: 3,
        onlySearchThoughtNames: true
      })
    ).resolves.toBeTruthy();

    const name = `[MCP_TEST] Brain Operator ${Date.now()}`;
    const created = await client.createThought(brainId!, {
      name,
      kind: 1,
      label: "Created by brain-operator-mcp integration test"
    });
    const thoughtId =
      created && typeof created === "object" && "id" in created && typeof created.id === "string"
        ? created.id
        : null;

    expect(thoughtId).toBeTruthy();
    await expect(client.appendNote(brainId!, thoughtId!, "This is an integration test note.")).resolves.toBeTruthy();
  });
});
