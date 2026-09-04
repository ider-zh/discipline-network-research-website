# Static Replica Architecture

## Objectives

The site reproduces selected charts from `wiki.nikepai.com` while remaining deployable as a static Cloudflare Pages project. Private databases and legacy APIs are build inputs, never browser runtime dependencies.

## System Shape

```text
PostgreSQL / MySQL / Elasticsearch / legacy APIs
                     |
        scripts/sync-*.mjs / import-upstream-static.mjs
                     |
          validate -> reduce -> round -> manifest
                     |
              public/data/*.json
                     |
        Vue 3 + vue-echarts static application
                     |
             Cloudflare Pages / CDN
```

The checked-in data snapshot makes production builds deterministic and allows deployment outside the private network. Each dataset is listed in `public/data/manifest.json` with its source, retrieval time, transformation, and chart consumer.

## Frontend

- Vue 3, TypeScript, Vite, and Vue Router provide the application shell and route-level code splitting.
- ECharts is rendered through `vue-echarts`; only required chart modules are registered.
- A shared chart frame owns loading, errors, source metadata, responsive sizing, and controls.
- URL query parameters retain chart selections where useful, making views shareable.
- Cloudflare Pages serves `dist/`; `public/_redirects` supplies SPA fallback routing.

## Data Policy

Synchronization is an explicit maintainer task (`npm run data:sync`), not part of `npm run build`. Export scripts use read-only requests and write compact JSON. They remove unused columns, round derived floating-point values to four significant decimal places, and split independent datasets so a route downloads only what it needs. Dataset byte size is checked during tests; unexpectedly large files require review before commit.

## Chart Collection

The catalog exposes 42 routes. The homepage presents a curated subset and dataset entry points; `/charts` is the canonical searchable directory. A shared taxonomy assigns every chart a dataset, research topic, and visualization kind, while URL-backed filters make catalog searches shareable. Dedicated views handle hierarchies, force graphs, Sankey flows, and complex entropy datasets. A shared snapshot view handles line, bar, scatter, bubble, and graph exports with generated dimensions.

Large degree responses are sampled to at most 700 points per series after log transformation and rounded to six decimals. Top-article exports retain the highest 50 rows per supported discipline and year. Unsupported empty subject/year combinations are discarded rather than shipped.

Legacy chart notes are exported as route-scoped, read-only Markdown. Formula syntax is normalized during export and rendered with KaTeX; unsafe HTML is sanitized in the browser. Note editing, comments, translation, and chart persistence remain excluded because they require writable services.

## Future Extension

Add a catalog entry, typed data adapter, route, and provenance record for each chart. Prefer shared line, graph, tree, scatter, Sankey, and heatmap primitives over copying legacy page components. Visual parity is verified with reference screenshots at desktop and mobile widths.
