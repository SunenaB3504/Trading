/**
 * Starts everything the UAT needs on this laptop (docs/UAT_R1.html): the exported web app on
 * http://127.0.0.1:8080 and the market-data service on http://127.0.0.1:8787 (the address the app
 * looks for). The service also serves the real-price market from `pnpm market:build` on /market.
 * Stop with Ctrl+C. Build the app first:  pnpm --filter @trading/app export:web
 */
import { existsSync, readFileSync } from 'node:fs';
import { FixedClock, parseLearningMarket } from '../../packages/core/src/index';
import {
  SeriesStore,
  SnapshotStore,
  StatusHistory,
  createHandler,
  startServer,
} from '../../packages/data-service/src/index';
import { serveStatic } from '../e2e/support';

const WEB_PORT = 8080;
const SERVICE_PORT = 8787;
const MARKET_FILE = 'data/derived/market/learning-market-v1.json';

/** The real-price market made by `pnpm market:build`, if present and valid; the app falls back to demo prices without it. */
function loadMarket(): unknown {
  if (!existsSync(MARKET_FILE)) return undefined;
  const market = parseLearningMarket(JSON.parse(readFileSync(MARKET_FILE, 'utf8')));
  if (market === null) throw new Error(`${MARKET_FILE} is not a valid market file; run pnpm market:build again`);
  console.log(`Market:  ${market.instruments.length} real NSE stocks, prices to ${market.to}`);
  return market;
}

async function main(): Promise<void> {
  await serveStatic(WEB_PORT);
  const handler = createHandler({
    series: new SeriesStore(),
    snapshots: new SnapshotStore(),
    clock: new FixedClock(Date.now()),
    identities: [],
    lifecycles: [],
    providerHealth: () => [
      { provider: 'nse-bhavcopy', lastFetchAt: Date.now(), lastStatus: 200, ok: true },
    ],
    statusHistory: new StatusHistory(),
    market: loadMarket(),
  });
  await startServer(handler, { port: SERVICE_PORT, allowedOrigin: `http://127.0.0.1:${WEB_PORT}` });
  console.log(
    `App:     http://127.0.0.1:${WEB_PORT}\nService: http://127.0.0.1:${SERVICE_PORT}\nCtrl+C to stop.`,
  );
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
