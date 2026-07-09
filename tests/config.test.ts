import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("does not require a cloud API key in local mode", () => {
    const config = loadConfig({
      THEBRAIN_MODE: "local",
      THEBRAIN_LOCAL_API_TOKEN: "local_token"
    } as NodeJS.ProcessEnv);

    expect(config.THEBRAIN_MODE).toBe("local");
    expect(config.THEBRAIN_API_KEY).toBe("");
    expect(config.THEBRAIN_LOCAL_API_TOKEN).toBe("local_token");
  });

  it("requires a cloud API key in cloud mode", () => {
    expect(() => loadConfig({ THEBRAIN_MODE: "cloud" } as NodeJS.ProcessEnv)).toThrow();
  });
});
