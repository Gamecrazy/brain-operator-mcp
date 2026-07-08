import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalAppClient } from "../src/thebrain/localAppClient.js";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("LocalAppClient", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("gets app state from the configured local API base URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        currentBrainId: "brain_1",
        currentBrainName: "Main Brain",
        activeThoughtId: "thought_1",
        activeThoughtName: "Home",
        isLoggedIn: true,
        userId: "user_1",
        tabs: [
          {
            id: "tab_1",
            brainId: "brain_1",
            brainName: "Main Brain",
            isActive: true,
            activeThoughtId: "thought_1",
            activeThoughtName: "Home"
          }
        ]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new LocalAppClient("local_key", "http://localhost:8001/api");
    const result = await client.getAppState();

    expect(result.currentBrainId).toBe("brain_1");
    expect(result.tabs).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://localhost:8001/api/app/state"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer local_key" })
      })
    );
  });

  it("posts app-control actions under /app", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ success: true })));
    vi.stubGlobal("fetch", fetchMock);

    const client = new LocalAppClient("local_key", "http://localhost:8001/api/");
    await client.openBrain("brain_1");
    await client.activateThought("brain_1", "thought_1");
    await client.closeBrainTab("brain_1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      new URL("http://localhost:8001/api/app/brain/brain_1/open"),
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      new URL("http://localhost:8001/api/app/brain/brain_1/thought/thought_1/activate"),
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      new URL("http://localhost:8001/api/app/brain/brain_1/close"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("maps auth failures to LOCAL_APP_AUTH_FAILED without leaking the key", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Invalid API Key local_key", { status: 401 })));

    const client = new LocalAppClient("local_key", "http://localhost:8001/api");

    await expect(client.getAppState()).rejects.toMatchObject({
      status: 401,
      message: "LOCAL_APP_AUTH_FAILED"
    });
  });

  it("maps connection failures to LOCAL_APP_UNAVAILABLE", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    const client = new LocalAppClient("local_key", "http://localhost:8001/api");

    await expect(client.getAppState()).rejects.toMatchObject({
      status: 503,
      message: "LOCAL_APP_UNAVAILABLE"
    });
  });
});
