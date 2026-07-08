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

  it("accepts proxied requests from Cloudflare tunnels", async () => {
    const baseUrl = await startTestServer();

    const response = await fetch(`${baseUrl}/brain/health`, {
      headers: {
        "X-Forwarded-For": "203.0.113.10"
      }
    });

    expect(response.status).toBe(200);
  });

  it("trusts the first proxy hop for cloudflared", () => {
    const app = createHttpApp();

    expect(app.get("trust proxy")).toBe(1);
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

  it("serves versioned MCP under /brain/v012/mcp", async () => {
    const baseUrl = await startTestServer();
    const healthResponse = await fetch(`${baseUrl}/brain/v012/health`);
    const healthBody = await healthResponse.json();
    const client = new Client({ name: "versioned-route-test", version: "0.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/brain/v012/mcp`));

    await client.connect(transport);
    const result = await client.callTool({ name: "health_check", arguments: {} });
    await client.close();

    expect(healthBody).toMatchObject({ ok: true, name: "brain-operator-mcp" });
    expect(result.structuredContent).toMatchObject({
      ok: true,
      data: {
        server: "brain-operator-mcp"
      }
    });
  });

  it("routes GET /brain/mcp to the streamable HTTP transport", async () => {
    const baseUrl = await startTestServer();

    const response = await fetch(`${baseUrl}/brain/mcp`, {
      headers: {
        Accept: "application/json"
      }
    });
    const body = await response.json();

    expect(response.status).toBe(406);
    expect(body.error.message).toBe("Not Acceptable: Client must accept text/event-stream");
  });
});
