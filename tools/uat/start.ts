/**
 * Starts everything the UAT needs on this laptop (docs/UAT_R1.html): the exported web app on
 * http://127.0.0.1:8080 and the market-data service on http://127.0.0.1:8787 (the address the app
 * looks for). Stop with Ctrl+C. Build the app first:  pnpm --filter @trading/app export:web
 */
import { FixedClock } from '../../packages/core/src/index';
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
