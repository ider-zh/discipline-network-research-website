import type { ChartCatalogItem } from "./catalog";

export const datasetOrder = ["OpenAlex", "Wikipedia", "MAG", "Web of Science", "Cross-dataset"] as const;
export const topicOrder = ["层次结构", "增长规模", "网络关系", "熵与复杂度", "引用行为", "颠覆性", "幂律分布", "内容与作者"] as const;

export type DatasetTag = typeof datasetOrder[number];
export type TopicTag = typeof topicOrder[number];
export type ChartKind = "层次树" | "关系网络" | "时间序列" | "分布图" | "流向图";

export type CatalogMeta = {
  dataset: DatasetTag;
  datasets: DatasetTag[];
  topics: TopicTag[];
  kind: ChartKind;
};

const topicRules: Array<[TopicTag, RegExp]> = [
  ["层次结构", /hierarchy|concept tree|taxonomy|category half-life/i],
  ["熵与复杂度", /entropy|complexity/i],
  ["颠覆性", /disruption|disruptive/i],
  ["幂律分布", /power law|degree distribution|exponent|article length/i],
  ["引用行为", /citation|reference|cited|self-citation|self-link/i],
  ["内容与作者", /content|word|author|article count|article total|top wikipedia/i],
  ["增长规模", /growth|scale|evolution|node & edge|field count|coverage/i],
  ["网络关系", /network|distance|dependency|small.world|connection|flow/i],
];

export function catalogMeta(chart: ChartCatalogItem): CatalogMeta {
  const text = `${chart.eyebrow} ${chart.title} ${chart.description} ${chart.source}`;
  const datasets: DatasetTag[] = [];
  if (/OpenAlex/i.test(text)) datasets.push("OpenAlex");
  if (/Wikipedia/i.test(text)) datasets.push("Wikipedia");
  if (/\bMAG\b|Microsoft Academic/i.test(text)) datasets.push("MAG");
  if (/Web of Science|\bWM\b/i.test(text)) datasets.push("Web of Science");
  const normalizedDatasets: DatasetTag[] = datasets.length ? datasets : ["Cross-dataset"];
  const topics = topicRules.filter(([, pattern]) => pattern.test(text)).map(([topic]) => topic);
  const resolvedTopics: TopicTag[] = topics.length ? topics : ["网络关系"];

  let kind: ChartKind = "时间序列";
  if (/concepts|hierarchy/i.test(text)) kind = "层次树";
  else if (/sankey|citation flow/i.test(text) || chart.path.endsWith("mag-disruption-structure")) kind = "流向图";
  else if (/network|distance bubbles|dependency/i.test(chart.title)) kind = "关系网络";
  else if (/distribution|top wikipedia|article length/i.test(chart.title)) kind = "分布图";

  return {
    dataset: normalizedDatasets.length > 1 ? "Cross-dataset" : normalizedDatasets[0],
    datasets: normalizedDatasets,
    topics: resolvedTopics,
    kind,
  };
}

export function matchesCatalog(
  chart: ChartCatalogItem,
  query: string,
  dataset = "",
  topic = "",
): boolean {
  const meta = catalogMeta(chart);
  if (dataset && !meta.datasets.includes(dataset as DatasetTag)) return false;
  if (topic && !meta.topics.includes(topic as TopicTag)) return false;
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = [chart.title, chart.eyebrow, chart.description, chart.source, meta.kind, ...meta.datasets, ...meta.topics]
    .join(" ").toLocaleLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export function datasetCount(dataset: DatasetTag, charts: ChartCatalogItem[]): number {
  return charts.filter((chart) => catalogMeta(chart).datasets.includes(dataset)).length;
}
