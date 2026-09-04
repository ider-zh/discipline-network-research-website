import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { AsciiMath } from "asciimath-parser";

const legacyBase = process.env.LEGACY_NOTE_URL ?? "https://wiki.nikepai.com/goapi/storage/first";
const notebookBase = process.env.NOTEBOOK_URL ?? "https://api.nikepai.com:10444/v/1.0/fresh/notebok";
const outputRoot = new URL("../public/data/notes/", import.meta.url);
const homeSource = process.env.HOME_NOTE_SOURCE;
const asciiMath = new AsciiMath({ display: false });

const notes = {
  "openalex-entropy": [{ notebook: "openalex-subject-complexity" }],
  "wikipedia-network-profile": [{ key: "wiki 学科小世界_chart_1" }],
  "wikipedia-degree-entropy": [{ key: "wiki_network_entropy_chart_1" }],
  "wikipedia-structural-entropy": [{ key: "wiki 结构熵_chart_1" }],
  "mag-subject-entropy": [{ key: "MAG Subject 熵_chart_1" }],
  "mag-citation-network": [{ key: "Mag_graph_2020_Chart_1" }],
  "mag-disruption-structure": [
    { key: "MagDisruption_graph_1", title: "总体口径" },
    { key: "MagDisruption_graph_2", title: "百分位趋势" },
    { key: "MagDisruption_graph_4", title: "跨学科引用流" },
  ],
  "mag-disruption-trend": [{ key: "DisruptionByYear_graph_1" }],
  "mag-node-edge": [{ key: "mag 逐年点边统计数据_chart_1" }],
  "mag-citation-half-life": [{ key: "引用半衰期_chart_1" }],
  "mag-article-totals": [{ key: "统计学科论文数量_chart_1" }],
  "mag-author-statistics": [{ key: "作者数逐年统计_chart_1" }],
  "wikipedia-self-citation": [{ key: "wiki 自恋度_chart_1" }],
  "wikipedia-core-scale": [{ key: "wiki Core 文章数_chart_1" }],
  "wm-network-scale": [{ key: "WM总文章和边数按年趋势_chart_1" }],
  "mag-top-cited-papers": [{ key: "各学科引用最高的文章的逐年引用情况_chart_1" }],
  "mag-reference-age": [{ key: "MAG N年之后的文章所引用的文章的逐年趋势_chart_1" }],
  "wikipedia-global-evolution": [{ key: "wiki 拟合数据_chart_1" }],
  "wikipedia-article-length": [{ key: "wikipedia 文章长度_chart_1" }],
  "wikipedia-words-links": [{ key: "wikipedia 各学科的总字数和linksout的一些规律_chart_1" }],
  "wikipedia-reference-patterns": [{ key: "wikipedia 各学科的总字数和linksout的一些规律_chart_1" }],
  "degree-distributions": [
    { key: "DbfMAG2020_graph_1", title: "数据范围" },
    { key: "CoreZipfByNodes_new_graph_2", title: "读图说明" },
  ],
  "mag-degree-exponent": [{ key: "ZipfAndInnerzipfByYearV3_graph_1" }],
  "mag-discipline-citation-flow": [{ key: "学科引用其他学科的逐年分布趋势_chart_1" }],
  "discipline-dependency": [{ key: "MagTrade_Chart_2" }],
  "mag-small-world": [{ key: "Mag_small_world_2020_Chart" }],
  "wikipedia-directed-distance": [{ key: "wikipedia_smallworld_Chart_2021_1" }],
  "mag-distance-bubbles": [{ key: "Mag_bubbles_distance_Chart_2020_1" }],
  "mag-distance-network": [{ key: "Mag_graph_2019v2_Chart_1" }],
  "mag-self-citation-ranking": [{ key: "MAG 学科topN 每隔5000的自恋度_chart_1" }],
  "mag-reference-age-average": [{ key: "MAG 各学科linksout的论文的平均寿命_chart_1" }],
};

const replacements = new Map([
  ["https://wiki.nikepai.com/v2/demo/openalex/concept-tree-2022", "/charts/openalex-concepts"],
  ["/charts/openalex-concepts", "https://openalex-omni-tree-demo.nikepai.com/"],
  ["https://wiki.nikepai.com/v2/demo/openalex/subject-complexity-2022", "/charts/openalex-entropy"],
  ["https://wiki.nikepai.com/v2/demo/openalex/node-edges", "/charts/openalex-node-edge"],
  ["https://wiki.nikepai.com/v1/wikipedia-build/wikipediaNetworkEntropy", "/charts/wikipedia-degree-entropy"],
  ["https://wiki.nikepai.com/v1/wikipedia-build/wikipediaEntropy", "/charts/wikipedia-structural-entropy"],
  ["https://wiki.nikepai.com/v1/mag2020/networkEntropy", "/charts/mag-subject-entropy"],
  ["https://wiki.nikepai.com/v1/mag2020/MAGSubjectEntropy", "/charts/mag-subject-entropy"],
  ["https://wiki.nikepai.com/v1/mag2020/ZipfAndInnerzipfByYearv3", "/charts/snapshots/mag-degree-exponent"],
  ["https://wiki.nikepai.com/v1/wikipedia-build/DegreeDistribution", "/charts/snapshots/degree-distributions"],
  ["https://wiki.nikepai.com/v1/wikipedia-build/CoreZipfByNodes_wiki", "/charts/snapshots/degree-distributions"],
  ["https://wiki.nikepai.com/v1/wikipedia-build/Xueke_words_linksout", "/charts/snapshots/wikipedia-words-links"],
  ["https://wiki.nikepai.com/v1/wm/AuthorsAndArticleInfoByYear", "/charts/snapshots/mag-author-statistics"],
  ["https://wiki.nikepai.com/v1/mag2020/AuthorsAndArticleInfoByYear", "/charts/snapshots/mag-author-statistics"],
]);

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function fetchEntry(entry) {
  if (entry.key) {
    const payload = await fetchJson(`${legacyBase}?path=${encodeURIComponent(entry.key)}`);
    return { key: entry.key, markdown: payload?.data?.Data?.content ?? "" };
  }
  const payload = await fetchJson(`${notebookBase}/${encodeURIComponent(entry.notebook)}`);
  return { key: entry.notebook, markdown: payload?.data?.data ?? "" };
}

function convertAsciiMath(markdown) {
  const block = markdown.replace(/```AsciiMath\s*\n([\s\S]*?)```/gi, (_, value) => {
    const expressions = value.split("\n").map((line) => line.trim()).filter(Boolean);
    return expressions.map((expression) => `$$\n${asciiMath.toTex(expression)}\n$$`).join("\n");
  });
  return block.replace(/`@([^`]+)@`/g, (_, value) => `$${asciiMath.toTex(value)}$`);
}

function polish(markdown) {
  let result = markdown.replace(/\r\n?/g, "\n").trim();
  result = result.split(/^## 编辑指南\s*$/m)[0].trim();
  result = result
    .replace(/^\[OpenAlex (?:Cencepts|Concepts) Tree\(2022\)\]\([^\n]+\)\s*$/gim, "")
    .replace(/^\[toc\]\s*$/gim, "")
    .replace(/^::: warning\s*\n([\s\S]*?)\n:::\s*$/gim, (_, warning) => `> **注意：** ${warning.trim()}`)
    .replace(/<br\s*\/?>/gi, "<br />")
    .replace(/改学科/g, "该学科")
    .replace(/所有文庄/g, "所有文章")
    .replace(/wijipedia/gi, "Wikipedia")
    .replace(/幂率/g, "幂律")
    .replace(/Cencepts/g, "Concepts");
  for (const [from, to] of replacements) result = result.replaceAll(from, to);
  result = convertAsciiMath(result);
  if (/^#\s/m.test(result)) result = result.replace(/^(#{1,5})\s/gm, (_, hashes) => `${hashes}# `);
  if (!/^##\s/m.test(result)) result = `## 方法与解读\n\n${result}`;
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

function meaningful(markdown) {
  const plain = markdown.replace(/[#\s]/g, "").toLowerCase();
  return plain.length > 8 && !["nocontent", "hello", "添加笔记"].includes(plain);
}

async function homeMarkdown() {
  if (homeSource) {
    const payload = JSON.parse(await readFile(homeSource, "utf8"));
    return payload?.data?.data ?? payload?.data ?? "";
  }
  try {
    const payload = await fetchJson(`${notebookBase}/wikiIndexNote`);
    if (meaningful(payload?.data?.data ?? "")) return payload.data.data;
  } catch (error) {
    console.warn(`Home note refresh failed: ${error.message}`);
  }
  try {
    return JSON.parse(await readFile(new URL("home.json", outputRoot), "utf8")).markdown;
  } catch {
    return "";
  }
}

await mkdir(outputRoot, { recursive: true });
const manifest = [];
const home = polish(await homeMarkdown());
if (meaningful(home)) {
  const contents = `${JSON.stringify({ title: "Knowledge Growth Reference", sourceKeys: ["wikiIndexNote"], markdown: home })}\n`;
  await writeFile(new URL("home.json", outputRoot), contents);
  manifest.push({ file: "home.json", bytes: Buffer.byteLength(contents), sha256: createHash("sha256").update(contents).digest("hex") });
}

const syncedNotes = await Promise.all(Object.entries(notes).map(async ([slug, entries]) => {
  const loadedEntries = await Promise.all(entries.map(async (entry) => {
    try {
      const loaded = await fetchEntry(entry);
      if (!meaningful(loaded.markdown)) return "";
      const markdown = polish(loaded.markdown);
      return entry.title ? `## ${entry.title}\n\n${markdown.replace(/^## 方法与解读\s*/, "")}` : markdown;
    } catch (error) {
      console.warn(`${slug}: ${error.message}`);
      return "";
    }
  }));
  const sections = loadedEntries.filter(Boolean);
  if (!sections.length) return undefined;
  const contents = `${JSON.stringify({ title: "研究笔记", sourceKeys: entries.map((entry) => entry.key ?? entry.notebook), markdown: sections.join("\n\n---\n\n") })}\n`;
  await writeFile(new URL(`${slug}.json`, outputRoot), contents);
  return { file: `${slug}.json`, bytes: Buffer.byteLength(contents), sha256: createHash("sha256").update(contents).digest("hex") };
}));
manifest.push(...syncedNotes.filter(Boolean));
manifest.sort((a, b) => a.file.localeCompare(b.file));

await writeFile(new URL("manifest.json", outputRoot), `${JSON.stringify({ generatedAt: new Date().toISOString(), notes: manifest }, null, 2)}\n`);
console.log(`Synced ${manifest.length} read-only note documents.`);
