# Frozen universes

Every file here is hashed byte for byte (see `.gitattributes`); the hash of each `universe_*.json` is stamped with
OpenTimestamps (`.ots`, pending until Bitcoin confirms). Nothing here is edited: a change is a new version.

| Version | Status | Names | Notes |
| ------ | ------ | ------ | ------ |
| `universe-v1` | **Superseded 2026-10-20, do not use** | 81 | Built from bars in which debt series (NSE series N2, N6, ...) that share a company's symbol were mixed into its share price (NTPC, PFC, HDFC, DHFL, BRITANNIA and about forty others), which distorted volatility, beta, liquidity and the buckets of those names. Kept unchanged as the record of what was stamped. |
| `universe-v2` | **Current** | 83 | Same rules and shares, rebuilt after the debt rows were excluded from identity and price history (`isShareRow`). Snapshot of the 83 series on the real archive is verified: 170,792 bars, 180 known event days flagged, no unexplained dispute, no adjustment mismatch. |
