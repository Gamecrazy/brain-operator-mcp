import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { createMcpServer } from "./createServer.js";

export function createHttpApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(express.json({ limit: "2mb" }));
  app.use(cors({ origin: true }));
  app.use(rateLimit({ windowMs: 60_000, limit: 120 }));

  const healthHandler: express.RequestHandler = (_req, res) => {
    res.json({ ok: true, name: config.MCP_SERVER_NAME, version: config.MCP_SERVER_VERSION });
  };

  const mcpHandler: express.RequestHandler = async (req, res) => {
    try {
      if (config.MCP_API_TOKEN) {
        const header = req.header("authorization") ?? "";
        if (header !== `Bearer ${config.MCP_API_TOKEN}`) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
      }

      const server = createMcpServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error({ error }, "MCP request failed");
      if (!res.headersSent) res.status(500).json({ error: "MCP request failed" });
    }
  };

  app.get("/health", healthHandler);
  app.get("/brain/health", healthHandler);
  app.get("/brain/v012/health", healthHandler);
  app.get("/mcp", mcpHandler);
  app.get("/brain/mcp", mcpHandler);
  app.get("/brain/v012/mcp", mcpHandler);
  app.post("/mcp", mcpHandler);
  app.post("/brain/mcp", mcpHandler);
  app.post("/brain/v012/mcp", mcpHandler);

  return app;
}
