# @trading/simulator

The standalone astro-financial trade simulator described in `docs/simulator-ssd/` (SSD v1.1, plan v1.0). It was
started inside `packages/app`; on 2026-10-26 the owner chose to keep it as its own package so the Market Learning
App in `packages/app` stays free of astrology (D42). It may use `@trading/core` and the market data; the learning
app does not import it.
