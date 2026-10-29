# Prompt: build "Basic Trader" as a separate app

Copy everything inside the box below into a new Claude Code session opened in the new, empty project folder. The new session needs read access to the source repository at `C:\Users\Admin\Sunil\Trading` (add it as an extra directory). Nothing in the source repository should be edited.

~~~text
You are building a small new app called "Basic Trader": a mock-trading app for the Indian stock market with virtual money. It copies the trading path of an existing app and leaves everything else behind.

SOURCE (read only, never edit): C:\Users\Admin\Sunil\Trading (pnpm workspace; TypeScript strict; Expo 58 / React Native 0.88 / react-native-web; Vitest). Do not copy anything from packages/simulator, packages/research, packages/astro-engine, packages/data-service or packages/workers. The source app contains no astrology and neither must the new one.

GOAL
A person creates a profile, picks a share or ETF, places orders with virtual money on real past prices bundled in the app (works offline), sees positions, cash, charges on every fill, and a results report. No lessons, no AI, no F&O, no funds, no charts, no strategies.

FUNCTIONALITY TO REPRODUCE
1. Profile: create/open a profile; all data scoped to the profile (key-value store, IndexedDB on web, SQLite on native).
2. Trade: choose an instrument; market, limit and stop orders; buy and sell; delivery vs same-day; a cost preview before the order; a plain-words reason when an order is refused; positions and cash shown; a one-time "virtual money, not investment advice" acceptance.
3. Prices: the bundled market file, read-only, parsed by core. Fills happen at the next session's open; a decision on a date may use only prices up to that date (the no-look-ahead rule).
4. Charges: the full cost schedule on every fill (brokerage, STT, exchange, GST, stamp, etc.), integer paise everywhere (never floats for money).
5. Ledger: every fill with its charges and the running position.
6. Report: win/loss figures, cost totals, by-instrument breakdown.
7. Keep the disclaimer banner. Keep the "coach hint" line on each screen only if it has no dependency on lessons; otherwise drop it.

FILES TO COPY (paths relative to the source repo root; keep relative imports working)

A. Core engine, copy these folders from packages/core/src, with their tests, into a new package (call it @basic/core) and re-export what the app uses from its index.ts:
   analytics, calendar, clock, corporate, costs, domain, execution, fills, hash, ledger, market, mistakes, money, random, replay, risk
   Do NOT copy: audit, bonds, bundle, experiment, fno, funds, overlay, portfolio, strategy, tax, universe.
   Then trim core/src/index.ts to export only the copied folders. If a copied file imports a dropped folder, cut that import and the code that needs it, and tell me what you cut.
   Exports the app uses: FixedClock, equityAt, marksAsOf, checkMistakes, PaperExecutionAdapter, computeLedgerB, createRng, istToUtcMillis, winLossReport, runReplay, buildFixtureScenario, parseLearningMarket, and the types Fill, Flag, MistakeLimits, OrderRecord, Position, ReplayConfig, ReplaySnapshot, Trade, WinLossReport, CostView, LearningMarket.

B. App code, from packages/app/src:
   trading/market.ts, trading/paperSession.ts, trading/orderRequest.ts, trading/orderText.ts, trading/costPreview.ts, trading/shareNote.ts, trading/useMarkets.ts, trading/bundledMarket.ts, trading/bundledMarket.native.ts, plus their tests: market.test.ts, orderText.test.ts, shareNote.test.ts, stopOrders.test.ts, trading.test.ts
   Skip: catchUp*, fund*, useFunds, bundledFunds*.
   screens/TradeScreen.tsx, screens/LedgerScreen.tsx, screens/ReportScreen.tsx, screens/ProfilesScreen.tsx
   viewModels/ledgerView.ts, viewModels/winLossView.ts, viewModels/ticketView.ts (+ticketView.test.ts), viewModels/comparisonView.ts (only if paperSession still needs it)
   store/kv.ts, store/scopedKv.ts, store/indexedDbKv.ts, store/sqliteKv.ts
   profiles/profiles.ts, profiles/migrate.ts, profiles/profiles.test.ts
   platform/device.ts, platform/device.native.ts
   format/rupees.ts
   ui/Button.tsx, ui/Section.tsx, ui/TabStrip.tsx, ui/TicketCard.tsx, ui/colors.ts, ui/typography.tsx, ui/RootErrorBoundary.tsx, ui/ScrollHint.tsx
   App.tsx: do NOT copy it. Write a new small App.tsx with three tabs, Trade, Ledger, Report, plus a profile badge. Use the source App.tsx only to see how profiles, markets and the disclaimer are wired.
   Also needed: screens/SettingsScreen.tsx is NOT required; keep only a profile switch (ProfilesScreen) and the disclaimer.

C. Data: copy packages/app/assets/learning-market.market (about 9.5 MB, real prices, adjusted for splits and bonuses) unchanged. Do not copy learning-funds.market.

D. Config: root package.json scripts for typecheck/lint/test, tsconfig.base.json, eslint.config.js, vitest.config.ts (keep maxWorkers: '50%'), pnpm-workspace.yaml, packages/app/package.json (keep only: expo, expo-asset, expo-sqlite, expo-status-bar, expo-build-properties, @expo/metro-runtime, react, react-native, react-native-web, react-dom, react-native-safe-area-context if present, plus the core package), app.json and metro.config.js (adapt names).

KNOWN TANGLES TO RESOLVE (do these, do not leave them)
1. paperSession.ts imports REQUESTS_KEY and StoredOrder from ../backup/backupService. Move those two definitions into a small trading/keys.ts and import from there. Do not copy the backup module.
2. TradeScreen.tsx imports journalStore (addBefore, BeforeFields), @trading/tutor (preTrade), ../tutor/AskPanel, ../tutor/run and ../ui/CoachHint. Remove the journal and tutor parts: delete the "before you trade" journal fields and the Ask panel. Keep the order form, cost preview, refusal reasons and positions. TradeScreen.tsx also exports Field and Choice helpers other screens used; keep those exports.
3. LedgerScreen and ReportScreen import CoachHint; drop it or write a tiny fixed hint component with no lesson link.
4. core/src/market may reference funds or fno types; cut them.
5. useMarkets.ts may use the data-service client for fresh prices; keep only the bundled market and the demo market path, and remove the network client.

RULES
- Money is integer paise. Dates are YYYY-MM-DD in IST. Keep the existing lint limits (complexity <= 10, 60 lines per function, 500 lines per file).
- No new features. No astrology. No network calls; the app must run in airplane mode.
- Keep every copied test and make them pass. Add one end-to-end browser test (Playwright, exported web build) that: creates a profile, accepts the disclaimer, buys a share, sells it, and checks that the Ledger shows both fills with charges and that Report shows one closed trade.
- Do not hand-edit numbers in tests to make them pass; if a copied test fails after trimming, tell me why.

PROCESS
1. First list every file you will copy and every import you will cut, and wait for my OK only if something on that list surprises you; otherwise proceed.
2. Copy, trim, get typecheck, lint and tests green, then build the web export and run the e2e test.
3. Finish with: the file tree, test counts, the list of cuts, the bundle size, and anything that did not work.
~~~

## Notes for you (not part of the prompt)

- The core folders listed were computed by following imports from the trading path, so they are the real minimum. Trimming `core/src/index.ts` is the part most likely to need care.
- The market file is about 9.5 MB. The new app will be small apart from that.
- The prompt asks the new session to remove the journal and tutor hooks from the Trade screen. If you want the "before you trade" journal prompt kept, tell the new session to also copy `journal/journalStore.ts`.
- Licence and ownership of the price data is the same as in the source app. Check it before sharing the new app beyond yourself.
