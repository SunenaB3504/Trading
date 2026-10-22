import { OpenTimestampsAnchorer, nodeHttpPoster } from '@trading/data-service';
import type { TimeAnchorer } from '@trading/core';

/** The live outside time service: OpenTimestamps over the public calendars. */
export const NodeOtsAnchor = (): TimeAnchorer =>
  new OpenTimestampsAnchorer({ poster: nodeHttpPoster(), now: () => Date.now() });
