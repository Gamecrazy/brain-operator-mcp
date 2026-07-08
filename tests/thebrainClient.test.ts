import { beforeEach, describe, expect, it, vi } from "vitest";
import { TheBrainClient } from "../src/thebrain/client.js";
import { TheBrainApiError } from "../src/thebrain/errors.js";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("TheBrainClient", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("returns JSON responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "brain_1" }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new TheBrainClient("secret_key", "https://api.bra.in");
    const result = await client.getBrain("brain_1");

    expect(result).toEqual({ id: "brain_1" });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://api.bra.in/brains/brain_1"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer secret_key" })
      })
    );
  });

  it("returns text responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("plain note", { headers: { "content-type": "text/plain" } }))
    );

    const client = new TheBrainClient("secret_key", "https://api.bra.in");

    await expect(client.getNote("brain_1", "thought_1", "text")).resolves.toBe("plain note");
  });

  it("turns non-ok responses into sanitized TheBrainApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response("Bearer secret_key rejected", { status: 401 }))
        .mockResolvedValueOnce(new Response("Bearer secret_key rejected", { status: 401 }))
    );

    const client = new TheBrainClient("secret_key", "https://api.bra.in");

    await expect(client.listBrains()).rejects.toMatchObject({
      status: 401,
      method: "GET",
      path: "/brains"
    });

    try {
      await client.listBrains();
    } catch (error) {
      expect(error).toBeInstanceOf(TheBrainApiError);
      expect(String(error)).not.toContain("secret_key");
    }
  });

  it("turns timeout aborts into 408 TheBrainApiError", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: URL, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        });
      })
    );

    const client = new TheBrainClient("secret_key", "https://api.bra.in");
    const request = client.request("GET", "/brains", { timeoutMs: 5 });
    const assertion = expect(request).rejects.toMatchObject({ status: 408 });
    await vi.advanceTimersByTimeAsync(10);

    await assertion;
  });

  it("retries GET requests for transient statuses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new TheBrainClient("secret_key", "https://api.bra.in");
    const result = await client.request("GET", "/brains");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
