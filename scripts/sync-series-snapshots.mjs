import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const apiBase = process.env.LEGACY_API_URL ?? "https://wiki.nikepai.com/api";
const goApiBase = process.env.GO_API_URL ?? "http://192.168.1.229:18080/api";
const outputRoot = new URL("../public/data/snapshots/", import.meta.url);
const subjects = ["Biology", "Chemistry", "Computer science", "Economics", "Engineering disciplines", "History", "Environmental science", "Political science", "Mathematics", "Medicine", "Philosophy", "Physics", "Sociology", "Psychology", "Materials science", "Geology", "Geography"];
const wikiSubjects = ["Biology", "Chemistry", "Computer science", "Economics", "Engineering disciplines", "Environmental science", "Geography", "Geology", "Linguistics", "Materials science", "Mathematics", "Medicine", "Philosophy", "Physics", "Political science", "Psychology", "Sociology"];
const subjectString = subjects.join(",");
const wikiSubjectString = wikiSubjects.join(",");

async function post(path, body) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${apiBase}/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });
      const text = await response.text();
      if (!response.ok || !text.trim()) throw new Error(`${response.status} ${path} (${text.length} bytes)`);
      const payload = JSON.parse(text);
      if (payload.msg && payload.msg !== "success") throw new Error(`${path}: ${payload.msg}`);
      return payload.data;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw lastError;
}

async function goPost(path, body) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${goApiBase}/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(120_000) });
      const text = await response.text();
      if (!response.ok || !text.trim()) throw new Error(`${response.status} ${path} (${text.length} bytes)`);
      return JSON.parse(text);
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw lastError;
}

function normalizeName(name) {
  return name === "Engineering disciplines" ? "Engineering" : name;
}

function variant(data, chartType = "line") {
  const legend = data.legend ?? (Array.isArray(data.y?.[0]) ? data.y.map((_, index) => `Series ${index + 1}`) : [data.title ?? "value"]);
  const rows = Array.isArray(data.y?.[0]) ? data.y : [data.y ?? []];
  return {
    title: data.title ?? "",
    x: data.x ?? [],
    chartType,
    series: Object.fromEntries(legend.map((name, index) => [normalizeName(name), rows[index] ?? []])),
  };
}

function transposedVariant(data) {
  const rows = data.legend.map((_, index) => data.y.map((row) => row[index]));
  return variant({ ...data, y: rows });
}

function scatterVariant(data) {
  const series = Object.fromEntries(Object.entries(data).map(([name, points]) => {
    const rows = Object.entries(points).map(([x, y]) => [Number(Number(x).toFixed(6)), Number(Number(y).toFixed(6))]);
    const step = Math.max(1, Math.ceil(rows.length / 700));
    const sampled = rows.filter((_, index) => index % step === 0);
    if (rows.length > 1 && sampled.at(-1) !== rows.at(-1)) sampled.push(rows.at(-1));
    return [normalizeName(name), sampled];
  }));
  return { title: "Degree distribution", x: [], chartType: "scatter", series };
}

function mapVariant(responses, section, metric) {
  const x = [...new Set(responses.flatMap(([, response]) => Object.keys(response[section]?.[metric] ?? {})))].map(Number).sort((a, b) => a - b);
  return {
    title: metric,
    x,
    chartType: "line",
    series: Object.fromEntries(responses.map(([name, response]) => {
      const values = response[section]?.[metric] ?? {};
      return [normalizeName(name), x.map((value) => values[String(value)] ?? null)];
    })),
  };
}

function dimension(key, label, values, defaultValue = values[0][0]) {
  return { key, label, default: defaultValue, options: values.map(([value, text]) => ({ value, label: text })) };
}

async function buildBundles() {
  const bundles = [];

  const nodeEdge = await post("mag/getNodeAndEdgeThatTimeByCats", { cats: subjectString, version: "v3", type: "tjart_nopb", db: "mag", from: 1955, to: 2020 });
  bundles.push({
    slug: "mag-node-edge", eyebrow: "MAG · Growth", title: "MAG Node & Edge Growth", description: "比较主要学科累计进入网络的论文节点与引用边。", source: "mag/getNodeAndEdgeThatTimeByCats",
    dimensions: [dimension("metric", "数据维度", [["node", "节点"], ["edge", "边"]], "node")],
    defaults: ["Biology", "Computer science", "Mathematics"], variants: { node: variant(nodeEdge.node), edge: variant(nodeEdge.edge) },
  });

  const halfLifeValues = Array.from({ length: 9 }, (_, index) => (index + 1) * 10);
  const halfLifeEntries = await Promise.all(halfLifeValues.map(async (percent) => [String(percent), variant(await post("mag/getBanshuaiqiByYear", { cats: subjectString, percent, version: "delete_noref_v3", type: "tjart_nopb", from: 1955, to: 2020 }))]));
  bundles.push({
    slug: "mag-citation-half-life", eyebrow: "MAG · Citation Aging", title: "Citation Decay Period", description: "查看累计引用达到指定百分位所需的时间。", source: "mag/getBanshuaiqiByYear",
    dimensions: [dimension("percent", "累计引用百分位", halfLifeValues.map((value) => [String(value), `${value}%`]), "50")],
    defaults: ["Biology", "Computer science", "Mathematics"], variants: Object.fromEntries(halfLifeEntries),
  });

  const articleEntries = await Promise.all([["annual", 0], ["cumulative", 1]].map(async ([name, isLj]) => [name, variant(await post("wiki/getMasArticlesTotal_v3", { doctype: 1, cats: subjectString, version: "v3", yeartype: 0, isLj, islog: 0, from: 1955, to: 2020 }))]));
  bundles.push({
    slug: "mag-article-totals", eyebrow: "MAG · Scale", title: "MAG Articles by Discipline", description: "比较学科论文的年度数量与累计规模。", source: "wiki/getMasArticlesTotal_v3",
    dimensions: [dimension("mode", "统计方式", [["annual", "逐年"], ["cumulative", "累计"]], "annual")],
    defaults: ["Biology", "Computer science", "Mathematics"], variants: Object.fromEntries(articleEntries),
  });

  const authorMetrics = [["unique-authors", 0, "作者数（去重）"], ["authorships", 1, "作者署名数"], ["authored-papers", 2, "有作者论文数"], ["unique-per-paper", 3, "去重作者/论文"], ["authorships-per-paper", 4, "署名/论文"]];
  const authorEntries = await Promise.all(authorMetrics.map(async ([name, returnType]) => [name, variant(await post("mag/getMagAuthorsAndArticleInfo_year_v2", { str: `all,${subjectString}`, returnType, queryType: 0, yearType: -1, isdx: 0, version: "v3_tjart_nopb", from: 1945, to: 2018 }))]));
  bundles.push({
    slug: "mag-author-statistics", eyebrow: "MAG · Authorship", title: "MAG Author Statistics", description: "比较逐年作者、署名与有作者论文的规模。", source: "mag/getMagAuthorsAndArticleInfo_year_v2",
    dimensions: [dimension("metric", "指标", authorMetrics.map(([value, , label]) => [value, label]), "unique-authors")],
    defaults: ["all", "Biology", "Computer science"], variants: Object.fromEntries(authorEntries),
  });

  const zeroConfigs = [["annual-percent", "1", "1", "逐年比例"], ["annual-count", "0", "1", "逐年数量"], ["total-percent", "1", "0", "总体比例"], ["total-count", "0", "0", "总体数量"]];
  const zeroEntries = await Promise.all(zeroConfigs.map(async ([name, returnType, yearType]) => [name, variant(await post("mag/tjhaslinksinByCats", { cat: subjectString, returnType, yearType, from_year: 1955, to_year: 2020 }), yearType === "0" ? "bar" : "line")]));
  bundles.push({
    slug: "mag-zero-citation", eyebrow: "MAG · Coverage", title: "Uncited Papers", description: "展示各学科未被引用论文的数量或比例。", source: "mag/tjhaslinksinByCats",
    dimensions: [dimension("view", "统计视图", zeroConfigs.map(([value, , , label]) => [value, label]), "annual-percent")],
    defaults: ["Biology", "Computer science", "Mathematics"], variants: Object.fromEntries(zeroEntries),
  });

  const selfRateEntries = await Promise.all([2, 3, 4].flatMap((level) => ["linksout", "linksin"].map(async (method) => [`${level}|${method}`, variant(await post("wiki/getWikiRefSelfRate", { str: wikiSubjectString, method, version: "v5", level }))])));
  bundles.push({
    slug: "wikipedia-self-citation", eyebrow: "Wikipedia · Discipline Links", title: "Discipline Self-Citation", description: "比较学科内部链接占全部链接的比例。", source: "wiki/getWikiRefSelfRate",
    dimensions: [dimension("level", "层次", [["2", "Level 2"], ["3", "Level 3"], ["4", "Level 4"]], "3"), dimension("direction", "链接方向", [["linksout", "出链"], ["linksin", "入链"]], "linksout")],
    defaults: ["Biology", "Computer science", "Mathematics"], variants: Object.fromEntries(selfRateEntries),
  });

  const coreEntries = await Promise.all([1, 2, 3, 4].flatMap((level) => [["arts", "文章数"], ["linksin", "入链数"], ["linksout", "出链数"]].map(async ([type]) => [`${level}|${type}`, variant(await post("wiki/getArticlesTotalByCoreNew_v5", { subjects: wikiSubjectString, level, type }))])));
  bundles.push({
    slug: "wikipedia-core-scale", eyebrow: "Wikipedia · Core", title: "Core Discipline Scale", description: "比较不同分类层次下的文章数、入链数和出链数。", source: "wiki/getArticlesTotalByCoreNew_v5",
    dimensions: [dimension("level", "层次", [["1", "Level 1"], ["2", "Level 2"], ["3", "Level 3"], ["4", "Level 4"]], "3"), dimension("metric", "指标", [["arts", "文章数"], ["linksin", "入链数"], ["linksout", "出链数"]], "arts")],
    defaults: ["Biology", "Computer science", "Mathematics"], variants: Object.fromEntries(coreEntries),
  });

  const wmMetrics = [["node", "节点"], ["edge", "边"], ["avg", "边/点"], ["node_dx", "节点增量"], ["edge_dx", "边增量"]];
  const wmEntries = await Promise.all(wmMetrics.map(async ([type]) => [type, variant(await post("wiki/getWikiAndMagCountByYear", { db: "wm", type }))]));
  bundles.push({
    slug: "wm-network-scale", eyebrow: "Web of Science · Growth", title: "WM Network Scale", description: "查看 Web of Science 网络点边规模及年度增量。", source: "wiki/getWikiAndMagCountByYear",
    dimensions: [dimension("metric", "指标", wmMetrics, "node")], defaults: [], variants: Object.fromEntries(wmEntries),
  });

  const topSubjects = ["Biology", "Computer science", "Mathematics", "Medicine", "Physics"];
  const topCounts = [3, 10, 25, 50];
  const topCitationEntries = await Promise.all(topSubjects.flatMap((cat) => topCounts.map(async (n) => [`${cat}|${n}`, variant(await post("mag/topNLinksinByYear", { cat, N: n, from: 1995, to: 2020 }))])));
  bundles.push({
    slug: "mag-top-cited-papers", eyebrow: "MAG · Citation Leaders", title: "Top-Cited Papers by Year", description: "查看指定学科高被引论文逐年的引用数量。", source: "mag/topNLinksinByYear",
    dimensions: [dimension("subject", "学科", topSubjects.map((value) => [value, value]), "Physics"), dimension("count", "Top N", topCounts.map((value) => [String(value), `Top ${value}`]), "10")],
    defaults: [], variants: Object.fromEntries(topCitationEntries),
  });

  const referenceYears = [2000, 2003, 2005, 2008, 2010, 2012, 2013, 2015, 2018];
  const referenceEntries = await Promise.all(referenceYears.map(async (year) => [String(year), variant(await post("mag/getPreCountByYear", { year }))]));
  bundles.push({
    slug: "mag-reference-age", eyebrow: "MAG · Reference History", title: "Earlier Papers Cited Later", description: "统计某年以后论文对历史论文的逐年引用分布。", source: "mag/getPreCountByYear",
    dimensions: [dimension("year", "分界年份", referenceYears.map((value) => [String(value), String(value)]), "2000")], defaults: [], variants: Object.fromEntries(referenceEntries),
  });

  const wikiFitMetrics = [["0", "文章数"], ["1", "边数"], ["2", "边数/文章"], ["3", "分类数"], ["4", "总字数"], ["5", "平均文章长度"], ["6", "编辑次数"], ["7", "平均文章编辑次数"], ["8", "作者数"], ["9", "作者数/文章"], ["10", "平均作者编辑次数"], ["11", "边数/总字数"]];
  const wikiFitEntries = await Promise.all(wikiFitMetrics.map(async ([index]) => [index, transposedVariant(await post("wiki/getWikiNiHe", { type: 3, index: Number(index) }))]));
  bundles.push({
    slug: "wikipedia-global-evolution", eyebrow: "Wikipedia · Evolution", title: "Wikipedia Global Evolution", description: "比较 Wikipedia 总体数据及拟合趋势的多个规模指标。", source: "wiki/getWikiNiHe",
    dimensions: [dimension("metric", "指标", wikiFitMetrics, "1")], defaults: [], variants: Object.fromEntries(wikiFitEntries),
  });

  const articleSizeConfigs = [["log-count", { type: 0 }, "对数区间数量"], ["log-ratio", { type: 1 }, "对数区间比例"], ["scaled-count", { type: 2 }, "线性区间数量"], ["scaled-ratio", { type: 3 }, "线性区间比例"], ["interval", { size: 50, islog: true }, "每 50 字区间"]];
  const articleSizeEntries = await Promise.all(articleSizeConfigs.map(async ([name, params]) => [name, variant(await post("wiki/getArtSizeDfd", params))]));
  bundles.push({
    slug: "wikipedia-article-length", eyebrow: "Wikipedia · Content", title: "Wikipedia Article Length", description: "查看 Wikipedia 文章字数的数量及比例分布。", source: "wiki/getArtSizeDfd",
    dimensions: [dimension("view", "统计方式", articleSizeConfigs.map(([value, , label]) => [value, label]), "log-count")], defaults: [], variants: Object.fromEntries(articleSizeEntries),
  });

  const wordMetrics = [["0", "出链总数"], ["1", "平均出链"], ["2", "总字数"], ["3", "平均字数"], ["4", "总字数/出链"]];
  const wordEntries = await Promise.all(wordMetrics.map(async ([type]) => [type, variant(await post("wiki/getXueke_words_linksout", { cats: wikiSubjectString, type: Number(type) }))]));
  bundles.push({
    slug: "wikipedia-words-links", eyebrow: "Wikipedia · Content Links", title: "Words and Outbound Links", description: "比较各学科文章字数与出链数量的演化规律。", source: "wiki/getXueke_words_linksout",
    dimensions: [dimension("metric", "指标", wordMetrics, "2")], defaults: ["Biology", "Computer science", "Mathematics"], variants: Object.fromEntries(wordEntries),
  });

  const wikiReferenceEntries = await Promise.all([["trend", 0], ["lag", 1]].map(async ([name, type]) => [name, variant(await post("wiki/getWikiRefTjData", { cats: wikiSubjectString, type }))]));
  bundles.push({
    slug: "wikipedia-reference-patterns", eyebrow: "Wikipedia · References", title: "Discipline Reference Patterns", description: "比较学科引用趋势和时间滞后分布。", source: "wiki/getWikiRefTjData",
    dimensions: [dimension("view", "视图", [["trend", "趋势"], ["lag", "滞后"]], "trend")], defaults: ["mag_Biology", "wiki_Biology", "mag_Computer science", "wiki_Computer science"], variants: Object.fromEntries(wikiReferenceEntries),
  });

  const filteredEntries = await Promise.all([["single", 0], ["repeat", 1]].map(async ([name, type]) => [name, variant(await post("wiki/getDfd", { cats: wikiSubjectString, type, dfd_yz: 0, linksin: 0, level: 4 }))]));
  bundles.push({
    slug: "wikipedia-disruption-filter", eyebrow: "Wikipedia · Disruption", title: "Filtered Article Distribution", description: "按默认颠覆度与引用阈值比较单次或重复引用文章的年度分布。", source: "wiki/getDfd",
    dimensions: [dimension("reference", "引用口径", [["single", "非重复引用"], ["repeat", "重复引用"]], "single")], defaults: [], variants: Object.fromEntries(filteredEntries),
  });

  const degreeSubjects = "Biology,Physics,Chemistry,Psychology,Sociology,Mathematics";
  const degreeScopes = [["zipf", "全网络"], ["innerzipf", "小世界"], ["xueshu_zipf", "学术圈"]];
  const degreeEntries = await Promise.all(["mag", "wm"].flatMap((db) => degreeScopes.map(async ([scope]) => {
    const params = { cats: degreeSubjects, type: scope, year: 2020, islog: 1, isNoRef: 0, x_from: 100, x_to: db === "wm" ? 1000 : 10000, y_to: 0.1, ...(db === "wm" ? { db: "wm" } : {}) };
    const data = await post("mag/getDfb_mag2020", params);
    return [`${db}|${scope}`, scatterVariant(data)];
  })));
  bundles.push({
    slug: "degree-distributions", eyebrow: "MAG / WM · Power Law", title: "Degree Distributions", description: "比较 MAG 与 Web of Science 的 2020 年幂律度分布。", source: "mag/getDfb_mag2020",
    dimensions: [dimension("database", "数据库", [["mag", "MAG"], ["wm", "Web of Science"]], "mag"), dimension("scope", "网络范围", degreeScopes, "zipf")],
    defaults: ["Biology", "Chemistry", "Mathematics", "Physics"], variants: Object.fromEntries(degreeEntries),
  });

  const degreeSlope = await post("mag/getDfb_mag2020", { cats: degreeSubjects, type: "zipf", year: "all", islog: 1, isNoRef: 0, x_from: 100, x_to: 10000, y_to: 0.1 });
  bundles.push({
    slug: "mag-degree-exponent", eyebrow: "MAG · Power Law", title: "MAG Degree Exponent", description: "查看主要学科幂律指数的逐年变化。", source: "mag/getDfb_mag2020",
    dimensions: [], defaults: ["Biology", "Chemistry", "Mathematics", "Physics"], variants: { "": variant(degreeSlope) },
  });

  const linkSubjects = ["Biology", "Computer science", "Mathematics", "Medicine", "Physics"];
  const linkTargets = "Chemistry,Computer science,Economics,Geography,History,Mathematics,Medicine,Physics";
  const linkFlowEntries = await Promise.all(linkSubjects.flatMap((catA) => [["ratio", "1"], ["count", "0"]].map(async ([name, returnType]) => [`${catA}|${name}`, variant(await post("mag/maglinkscf", { fz: "0", catA, catB: linkTargets, version: "tjart_nopb_delete_noref_v3", type: "linksout", returnType, yearA: 2017, from_yearB: 1980, to_yearB: 2017 }))])));
  bundles.push({
    slug: "mag-discipline-citation-flow", eyebrow: "MAG · Citation Flow", title: "Discipline Citation Flow", description: "查看一个学科对多个学科的逐年引用数量或占比。", source: "mag/maglinkscf",
    dimensions: [dimension("source", "当前学科", linkSubjects.map((value) => [value, value]), "Biology"), dimension("metric", "口径", [["ratio", "比例"], ["count", "数量"]], "ratio")],
    defaults: ["Chemistry", "Computer science", "Mathematics", "Medicine", "Physics"], variants: Object.fromEntries(linkFlowEntries),
  });

  const dependencyMethods = [["linksin", "入链"], ["linksout", "出链"], ["Import_and_export", "进出口"]];
  const dependencyViews = [["trend", 0, "趋势"], ["signed", 1, "正负关系"]];
  const dependencyEntries = await Promise.all(["mag", "wiki"].flatMap((db) => dependencyMethods.flatMap(([method]) => dependencyViews.map(async ([view, type]) => {
    const params = { strA: "Biology", strB: linkTargets, db, method, type, ...(db === "mag" ? { from: 1980, to: 2017, version: "tjart_nopb_delete_noref_v3" } : { version: "v5" }) };
    return [`${db}|${method}|${view}`, variant(await post("mag/getYinguoData", params))];
  }))));
  bundles.push({
    slug: "discipline-dependency", eyebrow: "MAG / Wikipedia · Dependency", title: "Discipline Dependency", description: "比较 Biology 与其他学科之间的入链、出链及净流动关系。", source: "mag/getYinguoData",
    dimensions: [dimension("database", "数据库", [["mag", "MAG"], ["wiki", "Wikipedia"]], "mag"), dimension("method", "关系", dependencyMethods, "linksout"), dimension("view", "视图", dependencyViews.map(([value, , label]) => [value, label]), "trend")],
    defaults: [], variants: Object.fromEntries(dependencyEntries),
  });

  const wikiYears = [2007, 2008, 2009, 2010, 2011, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020];
  const halfLifeYears = wikiYears.filter((year) => year < 2020);
  const wikiHalfLifeEntries = await Promise.all(halfLifeYears.flatMap((year) => [1, 2].map(async (level) => [`${year}|${level}`, variant(await post("wiki/getBanshuaiqi", { cats: wikiSubjectString, level: String(level), year }), "bar")])));
  bundles.push({
    slug: "wikipedia-category-half-life", eyebrow: "Wikipedia · Taxonomy", title: "Category Half-Life", description: "比较基准年份的子类结构经过多少年发生一半变化。", source: "wiki/getBanshuaiqi",
    dimensions: [dimension("year", "基准年份", halfLifeYears.map((value) => [String(value), String(value)]), "2007"), dimension("level", "子类深度", [["1", "Level 1"], ["2", "Level 2"]], "2")],
    defaults: [], variants: Object.fromEntries(wikiHalfLifeEntries),
  });

  const topArticleData = await post("wiki/getTopArticles", { cats: wikiSubjectString, years: wikiYears.join(",") });
  const topArticleVariants = {};
  const topArticleSubjects = wikiSubjects.filter((subject) => wikiYears.some((year) => Object.keys(topArticleData[String(year)]?.[subject] ?? {}).length));
  for (const year of wikiYears) {
    for (const subject of topArticleSubjects) {
      const rows = Object.entries(topArticleData[String(year)]?.[subject] ?? {}).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 50);
      topArticleVariants[`${year}|${subject}`] = { title: "inbound links", x: rows.map(([name]) => name), chartType: "bar", series: { links: rows.map(([, value]) => Number(value)) } };
    }
  }
  bundles.push({
    slug: "wikipedia-top-articles", eyebrow: "Wikipedia · Citation Leaders", title: "Top Wikipedia Articles", description: "查看各学科被链接次数最高的 50 篇文章。", source: "wiki/getTopArticles",
    dimensions: [dimension("year", "年份", wikiYears.map((value) => [String(value), String(value)]), "2020"), dimension("subject", "学科", topArticleSubjects.map((value) => [value, value]), "Biology")],
    defaults: [], variants: topArticleVariants,
  });

  const smallWorldSubjects = ["Biology", "Chemistry", "Computer science", "Mathematics", "Physics"];
  const smallWorldResponses = await Promise.all(smallWorldSubjects.map(async (name) => [name, await goPost("mag/magsmallworldundirect", { name, year: 2015, toplimit: 40000, version: "v3", citation: "linksout", yearrange: 5 })]));
  const smallWorldSections = [["by_year", "年度趋势"], ["by_limit", "头部规模趋势"], ["by_node", "联通节点趋势"]];
  const smallWorldMetrics = [["shortest path length", "平均最短路径"], ["clustering coefficient", "聚类系数"], ["Number of edge", "联通边数"], ["Number of vertices", "联通节点数"]];
  const smallWorldVariants = Object.fromEntries(smallWorldSections.flatMap(([section]) => smallWorldMetrics.map(([metric]) => [`${section}|${metric}`, mapVariant(smallWorldResponses, section, metric)])));
  bundles.push({
    slug: "mag-small-world", eyebrow: "MAG · Small World", title: "MAG Small-World Network", description: "比较主要学科的年度趋势、头部网络规模与联通规模。", source: "goapi/mag/magsmallworldundirect",
    dimensions: [dimension("view", "视图", smallWorldSections, "by_year"), dimension("metric", "指标", smallWorldMetrics, "shortest path length")],
    defaults: ["Biology", "Computer science", "Mathematics", "Physics"], variants: smallWorldVariants,
  });

  const directedMetrics = [["average_distance", "平均最短路径"], ["sum_short_dist", "最短路径总长"], ["sum_connect_path", "联通路径数"], ["max_distance", "最大最短路径"]];
  const directedResponses = await Promise.all(directedMetrics.flatMap(([metric]) => smallWorldSubjects.filter((name) => name !== "Biology").map(async (target) => [`${metric}|${target}`, await goPost("smallworld/directedByYear", { source: "Biology", target, version: "direct_graph_core_v2", toplimit: 3000, quota: metric })])));
  const directedDirections = [["a", "Biology → 目标"], ["b", "目标 → Biology"], ["c", "方向差值"]];
  const directedVariants = {};
  for (const [metric] of directedMetrics) {
    for (const [direction] of directedDirections) {
      const rows = directedResponses.filter(([key]) => key.startsWith(`${metric}|`));
      const x = [...new Set(rows.flatMap(([, response]) => response[direction].x))].sort((a, b) => a - b);
      directedVariants[`${metric}|${direction}`] = { title: metric, x, chartType: "line", series: Object.fromEntries(rows.map(([key, response]) => [key.split("|")[1], x.map((year) => { const index = response[direction].x.indexOf(year); return index >= 0 ? response[direction].y[index] : null; })])) };
    }
  }
  bundles.push({
    slug: "wikipedia-directed-distance", eyebrow: "Wikipedia · Directed Paths", title: "Directed Discipline Distance", description: "比较 Biology 与其他学科之间的双向网络距离及方向差。", source: "goapi/smallworld/directedByYear",
    dimensions: [dimension("metric", "指标", directedMetrics, "average_distance"), dimension("direction", "方向", directedDirections, "a")],
    defaults: ["Chemistry", "Computer science", "Mathematics", "Physics"], variants: directedVariants,
  });

  const bubbleSubjects = ["Chemistry", "Computer science", "Economics", "Geography", "History", "Mathematics", "Medicine", "Sociology"];
  const bubbleParams = { strB: bubbleSubjects.join(","), method: "linksin", from: 1955, to: 2020, qs: -1, version: "delete_noref_v3_node" };
  const [bubbleX, bubbleY, bubbleSize] = await Promise.all([
    post("wiki/getMasDistance_v2", { ...bubbleParams, strA: "Biology" }),
    post("wiki/getMasDistance_v2", { ...bubbleParams, strA: "Physics" }),
    post("wiki/getMasArticlesTotal_v3", { doctype: 1, cats: bubbleSubjects.join(","), version: "v3", yeartype: 0, from: 1955, to: 2020 }),
  ]);
  const bubbleVariants = {};
  for (const year of bubbleX.x) {
    const yearIndex = bubbleX.x.indexOf(year);
    bubbleVariants[String(year)] = {
      title: "discipline distance",
      x: [],
      chartType: "bubble",
      series: Object.fromEntries(bubbleSubjects.map((name) => {
        const xi = bubbleX.legend.indexOf(name);
        const yi = bubbleY.legend.indexOf(name);
        const si = bubbleSize.legend.map(normalizeName).indexOf(normalizeName(name));
        return [normalizeName(name), [[bubbleX.y[xi]?.[yearIndex] ?? null, bubbleY.y[yi]?.[yearIndex] ?? null, bubbleSize.y[si]?.[yearIndex] ?? 0]]];
      })),
    };
  }
  bundles.push({
    slug: "mag-distance-bubbles", eyebrow: "MAG · Discipline Distance", title: "Discipline Distance Bubbles", description: "以 Biology 和 Physics 为双轴，观察其他学科距离及论文规模的年度变化。", source: "wiki/getMasDistance_v2",
    dimensions: [dimension("year", "年份", bubbleX.x.map((value) => [String(value), String(value)]), "2020")], defaults: bubbleSubjects.map(normalizeName), variants: bubbleVariants,
  });

  const graphSubjects = ["Biology", "Chemistry", "Computer science", "Economics", "History", "Mathematics", "Medicine", "Physics", "Psychology", "Sociology"];
  const graphDistanceRows = await Promise.all(graphSubjects.slice(0, -1).map(async (source, index) => [source, await post("wiki/getMasDistance_v2", { strA: source, strB: graphSubjects.slice(index + 1).join(","), method: "linksin", from: 1955, to: 2020, qs: -1, version: "delete_noref_v3_node" })]));
  const graphSizes = await post("wiki/getMasArticlesTotal_v3", { doctype: 1, cats: graphSubjects.join(","), version: "v3", yeartype: 0, from: 1955, to: 2020 });
  const graphYears = [1955, 1965, 1975, 1985, 1995, 2005, 2015, 2020];
  const graphThresholds = [0.4, 0.5, 0.6, 0.8];
  const distanceGraphVariants = {};
  for (const year of graphYears) {
    const yearIndex = graphSizes.x.map(String).indexOf(String(year));
    const allLinks = graphDistanceRows.flatMap(([source, response]) => response.legend.map((target, index) => ({ source: normalizeName(source), target: normalizeName(target), value: Number(response.y[index]?.[response.x.map(String).indexOf(String(year))]?.toFixed(5)) })));
    for (const threshold of graphThresholds) {
      distanceGraphVariants[`${year}|${threshold}`] = {
        title: "discipline distance network", x: [], chartType: "graph",
        series: Object.fromEntries(graphSubjects.map((name) => { const index = graphSizes.legend.map(normalizeName).indexOf(normalizeName(name)); return [normalizeName(name), [graphSizes.y[index]?.[yearIndex] ?? 0]]; })),
        links: allLinks.filter((link) => Number.isFinite(link.value) && link.value <= threshold),
      };
    }
  }
  bundles.push({
    slug: "mag-distance-network", eyebrow: "MAG · Discipline Network", title: "MAG Distance Network", description: "按年份和最大距离查看学科规模与学科间邻近关系。", source: "wiki/getMasDistance_v2",
    dimensions: [dimension("year", "年份", graphYears.map((value) => [String(value), String(value)]), "2020"), dimension("threshold", "最大距离", graphThresholds.map((value) => [String(value), String(value)]), "0.8")],
    defaults: graphSubjects.map(normalizeName), variants: distanceGraphVariants,
  });

  const selfRanking = await post("mag/getZldByTopN_every5000", { cat: subjectString, type: "delete_noref_v3_nopb", method: "linksout" });
  bundles.push({
    slug: "mag-self-citation-ranking", eyebrow: "MAG · Self Citation", title: "Self-Citation by Ranking Depth", description: "每增加 5000 篇头部论文，比较各学科内部引用比例。", source: "mag/getZldByTopN_every5000",
    dimensions: [], defaults: ["Biology", "Computer science", "Mathematics", "Physics"], variants: { "": variant(selfRanking) },
  });

  const citationAgeEntries = await Promise.all([["all", 0], ["cited", 1]].map(async ([name, isNoRef]) => [name, variant(await post("mag/getLinksoutAvgAge", { cats: subjectString, isNoRef, from: 2000, to: 2020, version: isNoRef ? "delete_noref_v2" : "v2" }))]));
  bundles.push({
    slug: "mag-reference-age-average", eyebrow: "MAG · Citation Aging", title: "Average Reference Age", description: "比较各学科出链所指论文的平均年龄。", source: "mag/getLinksoutAvgAge",
    dimensions: [dimension("filter", "论文范围", [["all", "全集"], ["cited", "去掉零引用"]], "all")], defaults: ["Biology", "Computer science", "Mathematics", "Physics"], variants: Object.fromEntries(citationAgeEntries),
  });

  return bundles;
}

await mkdir(outputRoot, { recursive: true });
const bundles = await buildBundles();
const manifestPath = new URL("../manifest.json", outputRoot);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const chartNames = new Set(bundles.map((bundle) => `snapshot-${bundle.slug}`));
manifest.datasets = manifest.datasets.filter((item) => !chartNames.has(item.chart));

for (const bundle of bundles) {
  const contents = `${JSON.stringify(bundle)}\n`;
  const file = new URL(`${bundle.slug}.json`, outputRoot);
  await writeFile(file, contents);
  manifest.datasets.push({ file: `data/snapshots/${bundle.slug}.json`, bytes: Buffer.byteLength(contents), sha256: createHash("sha256").update(contents).digest("hex"), chart: `snapshot-${bundle.slug}`, source: `${apiBase}/${bundle.source}`, transform: "Build-time API export; response normalized into selectable static variants." });
}
manifest.generatedAt = new Date().toISOString();
manifest.datasets.sort((a, b) => a.file.localeCompare(b.file));
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Synced ${bundles.length} series snapshot charts.`);
