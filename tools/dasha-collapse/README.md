# Daśā and collapse study: derivation scripts

Exploratory scripts run on 2026-10-24 to build `data/frozen/dasha_collapse_verified_v1.csv`. They were run from a scratch folder with absolute paths and read private raw NSE files (`data/raw/`, git-ignored), so they document the method; they are not a one-command rebuild. The frozen list and its input hashes are in `data/frozen/dasha_collapse_v1.json`.

Order: `build_eq.ts` (merge bhavcopy), `dump_actions.ts` and `api_actions.ts` (corporate actions), `ipo_match.mjs` (IPO verification), `analyze3.mjs` (adjusted prices and collapse table), `power.mjs` (power simulation). None of them computes a daśā for a real stock.
