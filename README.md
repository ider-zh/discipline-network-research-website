# Discipline Atlas

Static, Cloudflare Pages-ready reproductions of research charts from `wiki.nikepai.com`. The catalog contains forty-two research entries spanning OpenAlex, Web of Science, Microsoft Academic Graph, and Wikipedia data; externally maintained projects are linked directly.

## Development

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

The production bundle is written to `dist/`. In Cloudflare Pages, use `npm run build` as the build command and `dist` as the output directory. No runtime environment variables are required.

## Data snapshots

Production pages never contact private services. Run `npm run data:sync` from a machine with access to the resource network to refresh checked-in files under `public/data/`. The script reads:

- the legacy database-backed node/edge API;
- existing database-derived WM and entropy exports.

Every synchronization regenerates `public/data/manifest.json` with sources, byte sizes, checksums, transformations, and known upstream gaps. Review its warnings before committing refreshed data.

Run `npm run data:import-upstream` to refresh the pinned static datasets used by the Wikipedia and MAG charts. Set `UPSTREAM_ASSET_DIR` to an existing checkout's `src/assets/data` directory when GitHub Raw is unavailable.

Run `npm run data:sync-series` while the legacy API and the resource-network Go API are reachable to refresh build-time exports for the reusable snapshot-chart routes. Override their defaults with `LEGACY_API_URL` and `GO_API_URL` when necessary. Production pages do not call these APIs.

Run `npm run data:sync-notes` to refresh the route-scoped, read-only Markdown notes from the legacy storage service. The exporter removes editing instructions and placeholders, normalizes legacy AsciiMath for KaTeX, and preserves embedded ECharts blocks as static subcharts. Set `HOME_NOTE_SOURCE=/path/to/export.json` only when restoring the homepage note from an offline export.

Run `npm run data:sync-apigo` to refresh the verified MAG disruption-trend, citation-statistics, and field-count charts. The disruption exporter intentionally accepts only non-zero historical cache combinations so a missing `mag2020.pageinfo` collection cannot silently produce a false snapshot.

See [docs/architecture.md](docs/architecture.md) for design decisions and [docs/migration-audit.md](docs/migration-audit.md) for legacy-page coverage and upstream blockers.
