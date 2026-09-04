import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { chartCatalog } from "../src/catalog";
import { catalogMeta, datasetCount, datasetOrder, matchesCatalog } from "../src/catalogMeta";

describe("chart catalog", () => {
  it("contains forty-two unique static chart routes", () => {
    expect(chartCatalog).toHaveLength(42);
    expect(new Set(chartCatalog.map((chart) => chart.path)).size).toBe(42);
    expect(chartCatalog.every((chart) => chart.path.startsWith("/charts/"))).toBe(true);
  });

  it("links the externally maintained OpenAlex 2026 tree directly", () => {
    const tree = chartCatalog.find((chart) => chart.path === "/charts/openalex-concepts");
    expect(tree?.externalUrl).toBe("https://openalex-omni-tree-demo.nikepai.com/");
    expect(tree?.title).toContain("2026");
    expect(existsSync("public/data/openalex-concepts.json")).toBe(false);
  });

  it("has a checked-in bundle for every snapshot route", () => {
    const snapshotSlugs = chartCatalog.flatMap((chart) => chart.path.startsWith("/charts/snapshots/") ? [chart.path.split("/").at(-1)] : []);
    expect(snapshotSlugs.every((slug) => existsSync(`public/data/snapshots/${slug}.json`))).toBe(true);
  });

  it("resolves every snapshot bundle's default variant", () => {
    const snapshotSlugs = chartCatalog.flatMap((chart) => chart.path.startsWith("/charts/snapshots/") ? [chart.path.split("/").at(-1)] : []);
    for (const slug of snapshotSlugs) {
      const bundle = JSON.parse(readFileSync(`public/data/snapshots/${slug}.json`, "utf8")) as {
        dimensions: Array<{ default: string }>;
        defaults: string[];
        variants: Record<string, { series: Record<string, unknown> }>;
      };
      const variant = bundle.variants[bundle.dimensions.map((dimension) => dimension.default).join("|")];
      expect(variant, `${slug} default variant`).toBeDefined();
      expect(Object.keys(variant.series).length, `${slug} default series`).toBeGreaterThan(0);
      expect(bundle.defaults.every((name) => name in variant.series), `${slug} selected defaults`).toBe(true);
    }
  });

  it("classifies every chart with searchable dataset, topic, and chart-kind metadata", () => {
    for (const chart of chartCatalog) {
      const meta = catalogMeta(chart);
      expect(datasetOrder).toContain(meta.dataset);
      expect(meta.datasets.length, chart.path).toBeGreaterThan(0);
      expect(meta.topics.length, chart.path).toBeGreaterThan(0);
      expect(meta.kind, chart.path).toBeTruthy();
    }
    expect(datasetOrder.slice(0, 4).every((dataset) => datasetCount(dataset, chartCatalog) > 0)).toBe(true);
  });

  it("searches across copy and taxonomy while combining active filters", () => {
    const entropy = chartCatalog.find((chart) => chart.path === "/charts/openalex-entropy")!;
    expect(matchesCatalog(entropy, "complexity", "OpenAlex", "熵与复杂度")).toBe(true);
    expect(matchesCatalog(entropy, "network entropy", "Wikipedia", "")).toBe(false);
    expect(chartCatalog.filter((chart) => matchesCatalog(chart, "small world")).length).toBeGreaterThan(0);
  });
});
