/** The engine is fetched only through the gate, as its own chunk, so a locked device never downloads or runs it. */
export const loadEngine = () => import('@trading/astro-engine');
export type Engine = Awaited<ReturnType<typeof loadEngine>>;
