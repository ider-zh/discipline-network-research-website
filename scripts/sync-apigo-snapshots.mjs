import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const apiBase = process.env.APIGO_API_URL ?? "https://wiki.nikepai.com/apigo/v2";
const legacyApiBase = process.env.LEGACY_API_URL ?? "https://wiki.nikepai.com/api";
const outputRoot = new URL("../public/data/snapshots/", import.meta.url);
const years = Array.from({ length: 71 }, (_, index) => 1950 + index);
const subjects = ["Biology", "Chemistry", "Computer science", "Economics", "Engineering disciplines", "Environmental science", "Geography", "Geology", "History", "Materials science", "Mathematics", "Medicine", "Philosophy", "Physics", "Political science", "Psychology", "Sociology"];
const ranges = [
  ["disruptive", "高颠覆度（-1 至 -0.5）", -1, -0.5],
  ["balanced", "近中性（-0.1 至 0.1）", -0.1, 0.1],
  ["consolidating", "高巩固度（0.5 至 1）", 0.5, 1],
];

async function fetchCachedTrend(startD, endD) {
  const response = await fetch(`${apiBase}/mag/disruption_trend_by_year`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ startYear: 1950, endYear: 2020, startD, endD, type: "d" }),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json();
  if (!response.ok || payload.code !== 0 || !Array.isArray(payload.data)) {
    throw new Error(`Invalid disruption response for ${startD}..${endD}`);
  }
  if (payload.data.length !== years.length || payload.data.every((value) => value === 0)) {
    throw new Error(`Missing cached disruption data for ${startD}..${endD}`);
  }
  return payload.data.map(Number);
}

async function fetchLegacy(path, body) {
  const response = await fetch(`${legacyApiBase}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json();
  if (!response.ok || payload.msg !== "success" || !payload.data?.x?.length || !payload.data?.legend?.length) {
    throw new Error(`Invalid legacy response for ${path}`);
  }
  return payload.data;
}

function lineVariant(data) {
  return {
    title: data.title ?? "value",
    x: data.x,
    chartType: "line",
    series: Object.fromEntries(data.legend.map((name, index) => [name === "Engineering disciplines" ? "Engineering" : name, data.y[index].map(Number)])),
  };
}

const entries = await Promise.all(ranges.map(async ([key, , startD, endD]) => [key, await fetchCachedTrend(startD, endD)]));
const disruptionBundle = {
  slug: "mag-disruption-trend",
  eyebrow: "MAG · Disruption",
  title: "Disruption Trend by Year",
  description: "比较高颠覆、近中性和高巩固论文在 1950–2020 年间的年度数量。",
  source: "apigo/v2/mag/disruption_trend_by_year (verified historical cache)",
  dimensions: [{
    key: "range",
    label: "颠覆度区间",
    default: "balanced",
    options: ranges.map(([value, label]) => ({ value, label })),
  }],
  defaults: ["papers"],
  variants: Object.fromEntries(entries.map(([key, data]) => [key, {
    title: "papers",
    x: years,
    chartType: "line",
    series: { papers: data },
  }])),
};

const subjectString = subjects.join(",");
const citationConfigs = [
  ["linksin|all", "linksin", "v2"],
  ["linksin|cited", "linksin", "delete_noref_v2"],
  ["linksout|all", "linksout", "v2"],
  ["linksout|cited", "linksout", "delete_noref_v2"],
];
const citationEntries = await Promise.all(citationConfigs.map(async ([key, method, version]) => [key, lineVariant(await fetchLegacy("mag/getLinkTj_year_v2", {
  str: subjectString, method, version, authorType: 0, from: 1950, to: 2020,
}))]));
const citationBundle = {
  slug: "mag-average-citations",
  eyebrow: "MAG · Citation Statistics",
  title: "Average Citations by Year",
  description: "比较主要学科论文的逐年平均入链与出链数量，并可排除零引用论文。",
  source: "mag/getLinkTj_year_v2",
  dimensions: [
    { key: "direction", label: "引用方向", default: "linksin", options: [{ value: "linksin", label: "平均入链" }, { value: "linksout", label: "平均出链" }] },
    { key: "scope", label: "论文范围", default: "all", options: [{ value: "all", label: "全部论文" }, { value: "cited", label: "排除零引用" }] },
  ],
  defaults: ["Biology", "Computer science", "Mathematics", "Physics"],
  variants: Object.fromEntries(citationEntries),
};

const fosConfigs = [["all", "v2"], ["cited", "delete_noref_v2"]];
const fosEntries = await Promise.all(fosConfigs.map(async ([key, version]) => [key, lineVariant(await fetchLegacy("mag/getFosTj_year_v2", {
  str: subjectString, version, from: 1950, to: 2020,
}))]));
const fosBundle = {
  slug: "mag-field-count",
  eyebrow: "MAG · Fields of Study",
  title: "Fields of Study by Year",
  description: "比较主要学科论文每年的平均 MAG 领域标签数量。",
  source: "mag/getFosTj_year_v2",
  dimensions: [{ key: "scope", label: "论文范围", default: "all", options: [{ value: "all", label: "全部论文" }, { value: "cited", label: "排除零引用" }] }],
  defaults: ["Biology", "Computer science", "Mathematics", "Physics"],
  variants: Object.fromEntries(fosEntries),
};

const bundles = [disruptionBundle, citationBundle, fosBundle];
await mkdir(outputRoot, { recursive: true });
const manifestPath = new URL("../manifest.json", outputRoot);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const chartNames = new Set(bundles.map((bundle) => `snapshot-${bundle.slug}`));
manifest.datasets = manifest.datasets.filter((item) => !chartNames.has(item.chart));
for (const bundle of bundles) {
  const contents = `${JSON.stringify(bundle)}\n`;
  await writeFile(new URL(`${bundle.slug}.json`, outputRoot), contents);
  const sourceBase = bundle === disruptionBundle ? apiBase : legacyApiBase;
  const sourcePath = bundle === disruptionBundle ? "mag/disruption_trend_by_year" : bundle.source;
  manifest.datasets.push({
    file: `data/snapshots/${bundle.slug}.json`,
    bytes: Buffer.byteLength(contents),
    sha256: createHash("sha256").update(contents).digest("hex"),
    chart: `snapshot-${bundle.slug}`,
    source: `${sourceBase}/${sourcePath}`,
    transform: bundle === disruptionBundle
      ? "Build-time export restricted to verified non-zero historical cache keys."
      : "Build-time API export validated for non-empty axes and series.",
  });
}
manifest.generatedAt = new Date().toISOString();
manifest.datasets.sort((a, b) => a.file.localeCompare(b.file));
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Synced ${bundles.length} verified available chart snapshots.`);
