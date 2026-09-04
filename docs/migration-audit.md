# Chart Migration Audit

Audit baseline: upstream commit `a3b702d1feee9f0bd5c365fee717d885df19a352` and its public homepage catalog. The replacement is intentionally static at runtime; checked-in snapshots are refreshed from the resource network.

## Reproduced

- WM node/edge growth and degree distribution.
- MAG article, author, node/edge, degree, uncited-paper, citation half-life, top-cited-paper, reference-history, reference-age, self-citation-ranking, small-world, citation-flow, disruption-percentile, cached disruption-trend, average-citation, field-count, citation-network, distance-network, bubble-distance, and dependency views.
- Wikipedia article counts, top articles, category half-life, reference patterns, self-citation, core scale, global evolution, article length, disruption filter, words/links, directed distance, network profile, network graph, and both entropy families.
- OpenAlex network growth and entropy views. The 2026 Topics & Concepts Tree is maintained by a dedicated external project, so catalog entries link directly to it and the former internal URL acts only as a compatibility redirect.

Several legacy pages contained multiple panels; equivalent panels are consolidated behind selectors instead of being duplicated vertically. The former 3D graphs use accessible 2D force layouts with zoom, drag, and adjacency focus.

## Covered by a Newer Equivalent

- `MagArticlesTotalV3`, `NodeAndEdgeThatTimeByCats`, `AuthorsAndArticleInfoByYear`, `BanshuaiqiByYear`, `topNLinksinByYear`, `MAG_ZldByTopN_every5000`, `MAG_PreCountByYear`, and `LinksoutAvgAge` map to snapshot routes.
- `DbfMAG2020` and `dbfwm2020` share the degree-distribution route; MAG also exposes the yearly exponent view.
- `MagGraph`, `BubbleDistance`, `MagDirectNet`, and `MagDirectNetBrowser` are represented by distance-network, bubble, and small-world routes.
- `smallworld_20211107`, `WikiNiHe`, `WikiFilter`, `WikiRefTjData`, `RefSelfRate`, and `ArticlesTotalByCoreNew_v5` map to selector-based Wikipedia routes.

## Upstream Blockers

- `wiki/getCoreLinksInData` and `wiki/getCoreLinksInDataByCats` still return `data: null`. The Java service now reaches the migrated MySQL instances on `.229`, but the required precomputed `linksin_<N>_<subject>` and `top<N>_core_<level>` tables are absent from every available database and backup volume. Existing `linksin<N>_top_<subject>` tables contain only inbound page IDs and cannot replace the missing article-to-core-category mapping without changing the chart semantics.
- Uncached `/apigo/v2` disruption queries depend on `mag2020.pageinfo`, which is absent from both available `.222` MongoDB data directories. Historical trend combinations already stored in PostgreSQL return valid data, but new combinations currently collapse to zero counts and must not be snapshotted as real results. Rebuilding the collection from the 1.5 TB MAG working set is a separate data-restoration job.
- The newer Go small-world handlers still reference `.220:23001`; that MongoDB port is not listening. Cached responses may remain available, but uncached graph requests need that service or a migrated copy of its database.
- Browser/tree explorers, ad-hoc page-distance tools, and external spreadsheets are applications or tables rather than charts and are outside this chart-only migration. Visible chart notes are preserved as read-only static Markdown; placeholder and editing-only content is intentionally omitted.

## Recovered Upstreams

- Public `/apigo/v2` routing is operational after restoring the Go API on `.222:18081` and adding `/api/v2` compatibility routes for the Nginx gateway. The service runs in a restart-enabled container; known cached disruption trends return valid data through the public URL.
- `mag/getTjYearByTopN_v3` is operational after restoring the uncompressed `.txt` working set from the existing `.txt.gz` files for the five required subjects, Top 40,000, 1980–2020.
- `mag/getMagRefSelfRate` returns valid data through 2019. Its v2 source ends in 2019, so clients must use `to: 2019`; requesting 2020 triggers a null comparison in the legacy controller.
- WM yearly degree exponents return valid data with `x_from: 50`. At `x_from: 100`, Mathematics has insufficient early-year samples and the legacy serializer rejects the resulting non-finite regression value.
- The Java API's retired `.226` MySQL target now resolves to `.229`, and the stopped 3313 instance containing the 2010/2019 schemas has been recovered with an automatic restart policy. Core Links now reaches MySQL; its remaining failure is missing source data rather than gateway or process availability.

## Resource Notes

The legacy chart API is reached through the `.227` Nginx gateway. Recovered Go services are available on `.229:18080` for older small-world exports and `.222:18081` for `/apigo/v2`. Production pages do not access any private host directly.
