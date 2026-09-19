# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A single person (the developer/owner) tracking their own manga, novel, and light-novel collection. Confirmed personal, solo use — not shared with family/friends, no accounts or multi-user access exist or are planned (multi-user accounts were evaluated and explicitly dropped from the roadmap).

## Product Purpose

A self-hosted, full-stack collection tracker for manga/novel/light-novel. It exists to give one collector an accurate, structured record of what they've read versus what they physically/digitally own, backed by a normalized relational database rather than a spreadsheet or generic list app. Success means the data stays trustworthy (no duplicate/garbage rows, ranges always consolidated correctly) and day-to-day logging (adding a series, marking volumes read, marking volumes bought) stays fast.

## Positioning

Two things a generic tracker or spreadsheet can't truthfully claim:
1. **Dual-layer, independently-tracked progress**: reading progress and collection ownership are separate, parallel systems (each with its own groups and volume ranges, potentially split across multiple sub-logs — e.g. "Main Story" vs "Side Stories" for reading; "Regular Edition" vs "E-Book" for collection) rather than one conflated "status" field.
2. **Data-integrity rigor**: normalized schema (separate authors/publishers tables), transactional writes, strict Zod validation on every request, and a symmetric range-merging algorithm implemented identically on client and server so overlapping/contiguous volume ranges always consolidate the same way in the UI and in the database.

MyAnimeList metadata autofill (via a secured backend proxy) removes the manual-entry tedium a spreadsheet has, without giving up the structured data model.

## Operating Context

Self-hosted (Docker available) and run on the owner's own machine; used through a desktop browser. Typical workflow: search MyAnimeList to autofill a new series' metadata and cover art, log reading progress as volume ranges (per reading sub-log), separately log owned volumes as ranges (per collection format/sub-log), and periodically export the collection to CSV (configurable columns, per-series or per-log-row layout) for backup or external use.

## Capabilities and Constraints

- **PC-only, ≥1024px viewport** — mobile/tablet layout and responsiveness are explicitly out of scope, not an oversight.
- **Zero-`any` TypeScript** — both frontend and backend run `strict: true` with no `any`/`as any` anywhere in the codebase; this is an enforced convention, not aspirational.
- **No pagination/virtualization yet** — the frontend fetches up to 1000 series and renders all of them client-side. Fine into the hundreds; a known ceiling if the collection grows well past that (documented, not yet hit).
- **No authentication or multi-user accounts** — single implicit user, no login system, by deliberate decision.
- **No analytics/dashboard** — a type/status-chart analytics tab was built and then deliberately removed; the product's scope is reading-progress and purchased-volume tracking, not analytics.
- **No batch import** — CSV/JSON batch import was considered and dropped.
- MyAnimeList API access is proxied server-side specifically to keep the client ID off the client and sidestep CORS — a security/architecture constraint, not just a convenience.

## Brand Commitments

Product name: **Manga Tracker**. No element of the current visual identity (the 卍 emblem, dark theme with orange accent, Thai-language UI labels) is a locked, binding commitment — it's the existing implementation, but confirmed (2026-09-19 init interview) as open to revisiting in future design work rather than something to preserve as-is.

## Evidence on Hand

- A local SQLite database (`backend/data/manga.db`) with real, populated data (~127 series) used through normal development — not synthetic placeholder rows.
- Live MyAnimeList API integration for metadata search (requires a client ID configured in the backend's `.env`).
- No logo/marketing assets exist beyond the plain Unicode 卍 glyph used as an emblem; no testimonials, case studies, or press — future work must not fabricate any of these.

## Product Principles

1. **Data integrity over convenience** — normalized schema, transactional writes, and strict validation take priority over shortcuts; this is the system of record for a real personal collection.
2. **Reading progress and ownership are separate, symmetric concerns** — never conflate "read" with "owned," in the data model or in the UI.
3. **Scope stays personal-scale and single-user on purpose** — multi-tenancy, analytics, and bulk-import have each been evaluated and explicitly declined to keep the tool focused, not left out by neglect.
4. **Desktop-only by design** — effort concentrates on the ≥1024px PC experience rather than splitting attention across breakpoints that aren't in scope.
5. **Visual identity is implemented but not yet locked** — treat the current look as the working default, not a constraint to preserve, until the owner says otherwise.
