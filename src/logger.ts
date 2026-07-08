import pino from "pino";
import { config } from "./config.js";

export const logger = pino({
  level: config.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "headers.authorization",
      "THEBRAIN_API_KEY",
      "THEBRAIN_LOCAL_API_TOKEN",
      "apiKey",
      "token",
      "accessToken"
    ],
    censor: "[REDACTED]"
  }
});
