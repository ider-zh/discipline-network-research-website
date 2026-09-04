import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const outputRoot = new URL("../public/data/", import.meta.url);
const legacyBase = process.env.LEGACY_SITE_URL ?? "https://wiki.nikepai.com/v2";
const apiBase = process.env.LEGACY_API_URL ?? "https://wiki.nikepai.com/api";
const syncedAt = new Date().toISOString();

const subjects = [
  "Materials science", "Geology", "Geography", "Environmental science",
  "Medicine", "Psychology", "Philosophy", "Mathematics", "Physics",
  "Chemistry", "Biology", "Sociology", "Economics", "Political science",
  "Linguistics", "History", "Computer science", "Artificial intelligence",
  "Engineering", "Chemical engineering", "Civil engineering",
  "Electrical engineering", "Mechanical engineering", "Biological engineering",
  "Computer engineering", "Industrial engineering", "Environmental engineering",
  "Cognitive science", "Machine learning", "Blockchains", "Deep learning",
  "Theoretical computer science", "Quantum computer", "Genetic engineering",
  "Genome editing", "Anthropology", "Neuroscience", "Literature",
];

const manifest = { generatedAt: syncedAt, datasets: [], warnings: [] };

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error(`Invalid JSON from ${url} (${body.length} bytes)`, { cause: error });
  }
}

async function fetchJsonOptional(url) {
  const response = await fetch(url);
  const body = await response.text();
  if (!response.ok || !body.trim()) {
    manifest.warnings.push(`${url}: ${response.status}, ${body.length} bytes; omitted`);
    return undefined;
  }
  return JSON.parse(body);
}

async function save(relativePath, value, metadata) {
  const path = new URL(relativePath, outputRoot);
  await mkdir(dirname(path.pathname), { recursive: true });
  const contents = `${JSON.stringify(value)}\n`;
  await writeFile(path, contents);
  manifest.datasets.push({
    file: `data/${relativePath}`,
    bytes: Buffer.byteLength(contents),
    sha256: createHash("sha256").update(contents).digest("hex"),
    ...metadata,
  });
}

async function syncLegacyStatic() {
  const files = [
    ["wm/disruption.json", "static/data/wm/average-disrution.json", "wm-disruption"],
    ["wm/connected-papers.json", "static/data/wm/connect-graph-subject-paper-count.json", "wm-disruption"],
  ];
  await Promise.all(files.map(async ([target, source, chart]) => {
    const data = await fetchJson(`${legacyBase}/${source}`);
    await save(target, data, {
      chart,
      source: `${legacyBase}/${source}`,
      transform: "Legacy database-derived snapshot; JSON minified without value changes.",
    });
  }));

  for (const folder of ["degreeEntropy", "structEntropy"]) {
    await Promise.all(subjects.map(async (subject) => {
      const file = `${subject.toLowerCase().replaceAll(" ", "_")}.json`;
      const source = `static/data/openalex/entropy/${folder}/${file}`;
      const data = await fetchJsonOptional(`${legacyBase}/${source}`);
      if (!data) return;
      await save(`openalex-entropy/${folder}/${file}`, data, {
        chart: "openalex-entropy",
        source: `${legacyBase}/${source}`,
        transform: "Legacy database-derived snapshot; values rounded in the browser to three decimals for display.",
      });
    }));
  }
}

async function syncNodeEdgeStats() {
  const result = {};
  for (const type of ["node", "edge", "fos", "node_dx", "edge_dx", "fos_dx"]) {
    const response = await fetchJson(`${apiBase}/wiki/getWikiAndMagCountByYear`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ db: "openAlex_nobook_notypenull", type }),
    });
    result[type] = response.data;
  }
  await save("openalex-node-edge.json", result, {
    chart: "openalex-node-edge",
    source: `${apiBase}/wiki/getWikiAndMagCountByYear`,
    transform: "Six database-backed API responses combined; only x, y, and title retained.",
  });
}

await mkdir(outputRoot, { recursive: true });
await Promise.all([syncLegacyStatic(), syncNodeEdgeStats()]);

const existingNetwork = await readFile(new URL("wikipedia-subject-network.json", outputRoot));
manifest.datasets.push({
  file: "data/wikipedia-subject-network.json",
  bytes: existingNetwork.byteLength,
  sha256: createHash("sha256").update(existingNetwork).digest("hex"),
  chart: "wikipedia-subject-network",
  source: "subject-revelance-super/src/views/demo/wm/wikipedia-subject-algorithm-tree.vue",
  transform: "Top-level subject nodes and minimum spanning-tree links retained; editor state removed.",
});

manifest.datasets.sort((a, b) => a.file.localeCompare(b.file));
await writeFile(join(outputRoot.pathname, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Synced ${manifest.datasets.length} files at ${syncedAt}`);
