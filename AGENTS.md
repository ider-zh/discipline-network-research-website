# Repository Guidelines

## Project Goal & Architecture

Reproduce the public behavior and appearance of `https://wiki.nikepai.com`, using `https://github.com/iwuzhen/subject-relevance` as the primary code reference. The replacement must deploy as a static site on Cloudflare Pages. Prefer established packages for routing, charts, parsing, and build tooling over custom implementations. Avoid runtime dependencies on the private backend unless static deployment cannot satisfy a documented requirement.

## Project Structure

Keep application code in `src/`, reusable UI in `src/components/`, page views in `src/pages/`, and chart/data transforms in `src/data/`. Put static assets and generated browser-ready datasets under `public/`. Keep extraction scripts in `scripts/` and tests in `tests/` or beside modules as `*.test.*`. Never edit generated data manually; preserve the script or query that produced it.

## Data Pipeline & Performance

Read chart data from databases hosted on `192.168.1.227`, `192.168.1.222`, and `192.168.1.229`, normalize it during a build/export step, and embed the resulting static files in the site. Record source tables, queries, export dates, and transformations. Measure compressed transfer size and browser parsing/rendering cost. When safe, reduce numeric precision, remove unused fields, aggregate points, or split data by route. Prefer Brotli-friendly JSON or a well-supported compact format.

## Development Commands

Expose workflows through `package.json`: `npm run dev`, `npm run build`, `npm test`, and `npm run lint`. The production build must run without private-network access and produce the Cloudflare Pages output directory. Document variables in `.env.example`; never commit credentials.

## Coding & Testing

Use two-space indentation for JavaScript, TypeScript, JSON, CSS, and Markdown. Use `PascalCase` for components, `camelCase` for functions and variables, and `kebab-case` for assets. Follow the committed formatter and linter. Test data transforms, missing-data behavior, chart interactions, responsive layouts, and production builds. Add screenshots when changing replicated pages.

## Service Investigation

Treat remote systems as production-like resources. Start with read-only network, process, container, port, log, and database checks. Some services may not return after reboot; identify failed dependencies and report evidence before disruptive changes. Do not restart services, modify databases, or change remote configuration without explicit approval. If access is unavailable or diagnosis remains inconclusive, report the host, failed checks, errors, and required next action.

## Commits & Pull Requests

Use imperative, scoped commits such as `feat: reproduce discipline chart` or `fix: handle unavailable dataset`. Pull requests must describe parity achieved, data assumptions, verification commands, linked issues, and screenshots for visual changes. Keep unrelated refactors separate.
