import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { round, subjectFileName } from "../src/data";

describe("data helpers", () => {
  it("creates stable subject snapshot filenames", () => {
    expect(subjectFileName("Materials science")).toBe("materials_science.json");
  });

  it("rounds finite data and rejects invalid values", () => {
    expect(round(1.23456)).toBe(1.235);
    expect(round("not-a-number")).toBeNull();
    expect(round(null)).toBeNull();
    expect(round("")).toBeNull();
  });

  it("keeps the complete static snapshot within the review budget", () => {
    const manifest = JSON.parse(readFileSync("public/data/manifest.json", "utf8")) as {
      datasets: Array<{ bytes: number; file: string }>;
    };
    const total = manifest.datasets.reduce((sum, dataset) => sum + dataset.bytes, 0);
    expect(total).toBeLessThan(10 * 1024 * 1024);
    expect(Math.max(...manifest.datasets.map((dataset) => dataset.bytes))).toBeLessThan(8 * 1024 * 1024);
  });

  it("ships polished read-only notes within a small route-scoped budget", () => {
    const manifest = JSON.parse(readFileSync("public/data/notes/manifest.json", "utf8")) as {
      notes: Array<{ bytes: number; file: string }>;
    };
    expect(manifest.notes.length).toBeGreaterThanOrEqual(30);
    expect(manifest.notes.reduce((sum, note) => sum + note.bytes, 0)).toBeLessThan(100 * 1024);
    expect(manifest.notes.every((note) => !note.file.includes("edit"))).toBe(true);

    const home = JSON.parse(readFileSync("public/data/notes/home.json", "utf8")) as { markdown: string };
    expect(home.markdown).toContain("The Table of Growth Rates");
    expect(home.markdown).not.toContain("编辑指南");

    const entropy = JSON.parse(readFileSync("public/data/notes/wikipedia-structural-entropy.json", "utf8")) as { markdown: string };
    expect(entropy.markdown).toContain("```echarts");
    expect(entropy.markdown).toContain("$$");
    expect(entropy.markdown).not.toContain("```AsciiMath");
  });
});
