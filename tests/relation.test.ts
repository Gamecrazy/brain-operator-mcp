import { describe, expect, it } from "vitest";
import { relationToApiValue } from "../src/thebrain/relation.js";

describe("relationToApiValue", () => {
  it("maps semantic relations to TheBrain API values", () => {
    expect(relationToApiValue("child")).toBe(1);
    expect(relationToApiValue("parent")).toBe(2);
    expect(relationToApiValue("jump")).toBe(3);
    expect(relationToApiValue("sibling")).toBe(4);
  });
});
