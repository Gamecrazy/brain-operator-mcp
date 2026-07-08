import { config } from "./config.js";
import { createHttpApp } from "./mcp/http.js";
import { logger } from "./logger.js";

export function startServer() {
  const app = createHttpApp();
  return app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, "brain-operator-mcp listening");
  });
}
