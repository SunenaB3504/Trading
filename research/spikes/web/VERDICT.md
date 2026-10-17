# Web spike verdict (WP-0.4, decision D1)

2026-10-17. Question: does the Expo universal app (React Native for web) work for the web release, or should the shell be plain React? Both candidates were built from the same data and the same measuring code: 5,000 rows in a scrolling table, a 2,500-point line chart, and a store opened on IndexedDB and on SQLite.

## Verdict

**Keep Expo universal (D1 default).** It does what the web release needs, and a single code base for web and Android is the reason to choose it. Plain React was faster under heavy CPU throttling, but both candidates scroll at 60 frames per second on this machine, and Expo's web build keeps the same SQLite package that Android will use.

## What was measured

Headless Chrome 155 on the owner's Windows laptop, software rendering, 3 rounds each. A scroll benchmark moves the table from top to bottom in 4 seconds, one step per animation frame. "Slow" is a frame longer than 20 ms. Headless Chrome paints at 60 Hz at most, so a mean of 16.7 ms is the best possible result.

| Run | Candidate | Mean frame | 95th percentile | Slow frames |
| ------ | ------ | ------ | ------ | ------ |
| Normal CPU | Plain React (Vite) | 16.7 ms | 16.8 to 17 ms | 0 to 0.4% |
| Normal CPU | Expo (react-native-web FlatList) | 16.6 to 16.7 ms | 17 ms | 0% |
| CPU 4 times slower | Plain React | 24 to 32 ms | 33 to 50 ms | 39 to 70% |
| CPU 4 times slower | Expo | 26 to 35 ms | 50 to 83 ms | 33 to 47% |
| CPU 6 times slower | Plain React | 44 to 46 ms | 67 ms | 93 to 94% |
| CPU 6 times slower | Expo | 69 to 88 ms | 117 to 217 ms | 57 to 87% |

Store timings for 5,000 rows, normal CPU (milliseconds):

| Store | Save | Open |
| ------ | ------ | ------ |
| IndexedDB (either shell) | 230 to 500 | 50 to 60 |
| SQLite-WASM package, plain React | 190 to 220 | 75 to 85 |
| `expo-sqlite`, Expo | 580 to 790 | 50 to 100 |

Both shells reopened the saved bundle in a fresh browser session (new page, same profile) from IndexedDB and from SQLite: 5,000 rows each.

Build sizes: plain React 437 KB JavaScript plus 869 KB SQLite WASM; Expo 580 KB JavaScript plus a 143 KB worker and 641 KB SQLite WASM.

## What this means

- **SQLite on web under Expo must be `expo-sqlite`.** The `@sqlite.org/sqlite-wasm` package does not bundle in Metro (it starts a worker from `import.meta.url`). `expo-sqlite` bundles after adding `wasm` to the asset extensions in `metro.config.js`. It is the same package the Android build will use, so one migration set serves both, as SSD §7.5 requires.
- **Cost of Expo:** saving 5,000 rows through `expo-sqlite` is about three times slower than the SQLite-WASM package (580 to 790 ms against 190 to 220 ms), and its scrolling degrades earlier on a very slow CPU. A ledger holds far fewer rows than this and imports are rare, so neither matters for a laptop. They matter for the weakest Android phones, which the A1 stage will measure on a device.
- **Limits of this test:** headless Chrome with software rendering, one machine, one table design (fixed 36 px rows, no sticky headers, no sorting or filtering). The Expo table uses the standard `FlatList`; a faster list component was not tried. The SQLite-WASM image was kept in IndexedDB; persisting to the browser's private file system needs a worker and was not tested.
- **Not measured:** touch scrolling, a real GPU, Safari or Firefox, and Android. The owner can check feel by running either build (below).

## Run it

```
cd research/spikes/web/vite-app && npm install && npx vite build     # plain React, output in dist/
cd research/spikes/web/expo-app && npm install && npx expo export --platform web   # Expo, output in dist/
cd research/spikes/web/bench && npm install && node run.mjs ../expo-app/dist expo 1 3   # measure
node persist.mjs ../expo-app/dist                                                         # reopen check
```

Each page also has two buttons, "Run store timings" and "Run scroll benchmark", for trying it by hand in a browser served from the `dist` folder.

`shared/` holds the code both apps use; `node sync-shared.mjs` copies it into each app, because a bundler cannot reliably import from outside its own folder.
