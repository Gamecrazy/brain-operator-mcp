import type { Server } from "node:http";
import { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, describe, expect, it } from "vitest";
import { createHttpApp } from "../src/mcp/http.js";

let server: Server | undefined;

async function startTestServer() {
  const app = createHttpApp();
  server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, () => resolve(listener));
  });
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

describe("HTTP routes", () => {
  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  });

  it("serves health under /brain/health", async () => {
    const baseUrl = await startTestServer();

    const response = await fetch(`${baseUrl}/brain/health`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      name: "brain-operator-mcp",
      version: "0.1.0"
    });
  });

  it("serves MCP under /brain/mcp", async () => {
    const baseUrl = await startTestServer();
    const client = new Client({ name: "route-test", version: "0.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/brain/mcp`));

    await client.connect(transport);
    const result = await client.callTool({ name: "health_check", arguments: {} });
    await client.close();

    expect(result.structuredContent).toMatchObject({
      ok: true,
      data: {
        server: "brain-operator-mcp",
        version: "0.1.0"
      }
    });
  });
});
