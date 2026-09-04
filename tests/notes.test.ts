import { describe, expect, it } from "vitest";
import { chartHasNote } from "../src/notes";

describe("chart note routing", () => {
  it("loads note code only for routes with recovered content", () => {
    expect(chartHasNote("/charts/wikipedia-structural-entropy")).toBe(true);
    expect(chartHasNote("/charts/snapshots/mag-small-world")).toBe(true);
    expect(chartHasNote("/charts/openalex-node-edge")).toBe(false);
    expect(chartHasNote("/")).toBe(false);
  });
});
