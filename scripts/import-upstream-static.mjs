import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const revision = "a3b702d1feee9f0bd5c365fee717d885df19a352";
const base = `https://raw.githubusercontent.com/iwuzhen/subject-relevance/${revision}/src/assets/data`;
const localRoot = process.env.UPSTREAM_ASSET_DIR;
const outputRoot = new URL("../public/data/", import.meta.url);
const files = [
  ["MAGSubjectEntropy.json", "mag-subject-entropy.json", "mag-subject-entropy"],
  ["subject_article_count.json", "wikipedia-article-count.json", "wikipedia-article-count"],
  ["wikipediaNetwork_Quarter.json", "wikipedia-network-quarter.json", "wikipedia-network-profile"],
  ["wikipedia_network_entropy_lv2_log2.json", "wikipedia-degree-entropy-lv2.json", "wikipedia-degree-entropy"],
  ["wikipedia_network_entropy_lv3_log2.json", "wikipedia-degree-entropy-lv3.json", "wikipedia-degree-entropy"],
  ["wikipedia_struct_entropy_lv2_log2.json", "wikipedia-struct-entropy-lv2.json", "wikipedia-struct-entropy"],
  ["wikipedia_struct_entropy_lv3_log2.json", "wikipedia-struct-entropy-lv3.json", "wikipedia-struct-entropy"],
  ["wikipediaDirectNetWorkXueShu.json", "wikipedia-network-academic-lv2.json", "wikipedia-network-profile"],
  ["wikipediaDirectNetWorkXueShuLV3.json", "wikipedia-network-academic-lv3.json", "wikipedia-network-profile"],
  ["node_2016_v2.json", "mag-network-nodes-2016.json", "mag-citation-network"],
  ["node_2017_v2.json", "mag-network-nodes-2017.json", "mag-citation-network"],
  ["edge_linksin_2016_v2.json", "mag-network-linksin-2016.json", "mag-citation-network"],
  ["edge_linksout_2016_v2.json", "mag-network-linksout-2016.json", "mag-citation-network"],
  ["edge_linksin_2017_v2.json", "mag-network-linksin-2017.json", "mag-citation-network"],
  ["edge_linksout_2017_v2.json", "mag-network-linksout-2017.json", "mag-citation-network"],
  ["disruption.json", "mag-disruption-structure.json", "mag-disruption-structure"],
];

const manifestPath = new URL("manifest.json", outputRoot);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const importedCharts = new Set(files.map(([, , chart]) => chart));
manifest.datasets = manifest.datasets.filter((item) => !importedCharts.has(item.chart));

for (const [sourceName, targetName, chart] of files) {
  const source = `${base}/${sourceName}`;
  let sourceText;
  if (localRoot) {
    sourceText = await readFile(`${localRoot}/${sourceName}`, "utf8");
  } else {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`${response.status} ${source}`);
    sourceText = await response.text();
  }
  const data = JSON.parse(sourceText);
  const contents = `${JSON.stringify(data)}\n`;
  const target = new URL(targetName, outputRoot);
  await mkdir(dirname(target.pathname), { recursive: true });
  await writeFile(target, contents);
  manifest.datasets.push({
    file: `data/${targetName}`,
    bytes: Buffer.byteLength(contents),
    sha256: createHash("sha256").update(contents).digest("hex"),
    chart,
    source,
    transform: "Pinned upstream static snapshot; JSON minified without value changes.",
  });
}

manifest.generatedAt = new Date().toISOString();
manifest.datasets.sort((a, b) => a.file.localeCompare(b.file));
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Imported ${files.length} pinned upstream datasets.`);
