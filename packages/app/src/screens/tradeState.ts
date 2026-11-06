import { useCallback, useEffect, useState } from 'react';
import { addBefore, loadJournal } from '../journal/journalStore';
import type { BeforeFields, JournalEntry } from '../journal/journalStore';
import { addReason, loadReasons } from '../journal/reasons';
import type { Reason } from '../journal/reasons';
import { getStamped, putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';
import type { Market } from '../trading/market';
import type { OrderForm } from '../trading/orderRequest';
import { defaultTiming, marketNow } from '../trading/orderTiming';
import { PaperSession } from '../trading/paperSession';
import type { Holding, SessionView } from '../trading/paperSession';
import { loadList, pushRecent, recentKey, toggleWatch, watchlistKey } from '../trading/stockLists';
import type { PlanActions } from './ExitPlanPanel';
import type { SetField } from './OrderBar';
import { expressSafe, finalForm, ORDER_MODE_KEY } from './OrderForm';
import type { OrderMode, OrderUi } from './OrderForm';
import type { StockGroup } from './StockPicker';

/**
 * Where the form starts. A short list starts on its first instrument; a long one starts with nothing chosen, so no order
 * goes to a stock the person never picked.
 */
export const firstForm = (market: Market): OrderForm => ({
  instrumentId: market.instruments.length <= 6 ? (market.instruments[0] ?? '') : '',
  side: 'buy',
  type: 'market',
  quantity: '10',
  limit: '',
  stop: '',
  trigger: '',
  validity: 'day',
  until: '',
  date: market.defaultDate,
});

export const NO_JOURNAL: BeforeFields = { why: '', target: '', exitPlan: '', confidence: null, reasons: [], ticket: '' };

/** What to tell the person after an order is accepted: when it trades, or why it will wait. */
export function placedMessage(r: { orderId: string; state: string }, market: Market, form: OrderForm): string {
  if (r.state === 'filled') return `Order ${r.orderId} placed and filled.`;
  if (form.validity === 'gtt')
    return `Order ${r.orderId} placed and waiting: a good-till-triggered order is checked against each new trading day and fills when its trigger is reached. It can be cancelled until then.`;
  if (form.fillAt === 'close')
    return `Order ${r.orderId} placed. It fills at the close on ${form.date}; that day's prices arrive around 6:30 PM, and until then it shows as pending.`;
  const name = market.symbols[form.instrumentId] ?? form.instrumentId;
  return `Order ${r.orderId} placed for ${name}. It waits for the prices of the day it is watched; until then it shows as pending.`;
}

/** Exit plans of the book's holdings: set or change, take away, and confirm a reached one. */
export function planActions(session: PaperSession | null, market: Market, setView: (v: SessionView) => void, setMessage: (m: string) => void): PlanActions {
  return {
    save: async (id, input) => {
      if (session === null) return { ok: false, error: 'Your practice book is still opening.' };
      const r = await session.setExitPlan(id, input);
      if (r.ok) setView(await session.view());
      return r;
    },
    remove: async (id) => {
      if (session === null) return;
      await session.removeExitPlan(id);
      setView(await session.view());
    },
    sellReached: async (id) => {
      if (session === null) return;
      const r = await session.sellReached(id);
      setMessage(r.ok ? `Order ${r.orderId} placed to sell ${market.symbols[id] ?? id} at the next trading close.` : r.error);
      setView(await session.view());
    },
  };
}

/** The stocks offered before anything is typed: what the book holds, the watchlist, and recent picks. */
export function useStockLists(kv: KeyValueStore, now: () => number, market: Market, view: SessionView | null) {
  const [watch, setWatch] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    void loadList(kv, watchlistKey(market.id)).then(setWatch);
    void loadList(kv, recentKey(market.id)).then(setRecent);
  }, [kv, market.id]);
  const known = (ids: readonly string[]) => ids.filter((id) => market.instruments.includes(id));
  const groups: StockGroup[] = [
    { title: 'Holdings', ids: known(view?.positions.map((p) => p.instrumentId) ?? []) },
    { title: 'Watchlist', ids: known(watch) },
    { title: 'Recent', ids: known(recent) },
  ];
  return {
    groups,
    watching: (id: string) => watch.includes(id),
    toggle: (id: string) => void toggleWatch(kv, market.id, id, now()).then(setWatch),
    picked: (id: string) => void pushRecent(kv, market.id, id, now()).then(setRecent),
  };
}

/** The master reasons of the profile, and adding one from the chips. */
export function useReasons(kv: KeyValueStore, now: () => number) {
  const [reasons, setReasons] = useState<Reason[]>([]);
  useEffect(() => {
    void loadReasons(kv).then(setReasons);
  }, [kv]);
  const add = async (group: Reason['group'], label: string): Promise<string | null> => {
    const r = await addReason(kv, group, label, now());
    if ('error' in r) return null;
    setReasons(r.list);
    return r.id;
  };
  return { reasons, add };
}

const PRICE = /^\d{1,9}(\.\d{1,2})?$/;

/** Stop and target from the journal of the last buy of each stock, offered when an exit plan is set on the holding. */
export function journalSuggestions(view: SessionView | null, entries: readonly JournalEntry[], marketId: string): Record<string, { stop: string; target: string }> {
  const out: Record<string, { stop: string; target: string }> = {};
  const buys = new Map((view?.orders ?? []).filter((o) => o.side === 'buy').map((o) => [o.id, o.instrumentId]));
  for (const e of entries.filter((x) => x.market === marketId).sort((a, b) => a.at - b.at)) {
    const id = buys.get(e.orderId);
    const stop = PRICE.test(e.exitPlan.trim()) ? e.exitPlan.trim() : '';
    const target = PRICE.test(e.target.trim()) ? e.target.trim() : '';
    if (id !== undefined && (stop !== '' || target !== '')) out[id] = { stop, target };
  }
  return out;
}

/** The journal of the profile, read again whenever the book changes. */
export function useJournalEntries(kv: KeyValueStore, view: SessionView | null): JournalEntry[] {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  useEffect(() => {
    void loadJournal(kv).then(setEntries);
  }, [kv, view]);
  return entries;
}

export type TradeState = ReturnType<typeof useTrade>;

/** A holding tapped: a market sell of all of it, ready to check and place. */
const sellAll = (f: OrderForm, h: Holding): OrderForm => ({ ...expressSafe(f), instrumentId: h.instrumentId, side: 'sell', quantity: String(h.quantity) });

/** Places the order as the form stands, with its journal note; says what happened. True when it was placed. */
async function placeOrder(
  c: { session: PaperSession | null; form: OrderForm; ui: OrderUi; market: Market; journal: BeforeFields; kv: KeyValueStore; now: () => number },
  say: (m: string) => void,
): Promise<boolean> {
  if (c.session === null) return (say('Your practice book is still opening. Try again in a moment.'), false);
  if (c.form.instrumentId === '') return (say('Choose a stock first: tap the search box.'), false);
  const built = finalForm(c.form, c.ui, c.market, marketNow(c.market, c.now()));
  if (!built.ok) return (say(built.error), false);
  const r = await c.session.place(built.form);
  say(r.ok ? placedMessage(r, c.market, built.form) : r.error);
  if (!r.ok) return false;
  const note = c.ui.mode === 'express' ? { ...NO_JOURNAL, reasons: c.journal.reasons ?? [] } : c.journal;
  await addBefore(c.kv, c.market.id, r.orderId, note, c.now());
  return true;
}

/** The Trade screen's book, form, mode and journal, and placing, cancelling and preparing a sell. */
export function useTrade(kv: KeyValueStore, now: () => number, market: Market) {
  const [session, setSession] = useState<PaperSession | null>(null);
  const [view, setView] = useState<SessionView | null>(null);
  const [form, setForm] = useState<OrderForm>(() => firstForm(market));
  const [ui, setUiState] = useState<OrderUi>(() => ({ mode: 'express', timing: defaultTiming(marketNow(market, now())), qtyBy: 'shares', amount: '' }));
  const [message, setMessage] = useState<string | null>(null);
  const [journal, setJournalState] = useState<BeforeFields>(NO_JOURNAL);
  // Typed but not placed: a profile switch asks before throwing it away.
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    // another profile or market: start a clean form, so nothing typed for the last one carries over
    setForm(firstForm(market));
    setJournalState(NO_JOURNAL);
    setTouched(false);
    setMessage(null);
    void getStamped<OrderMode>(kv, ORDER_MODE_KEY).then((m) =>
      setUiState({ mode: m?.value === 'advanced' ? 'advanced' : 'express', timing: defaultTiming(marketNow(market, now())), qtyBy: 'shares', amount: '' }),
    );
    void PaperSession.open(kv, now, market).then(async (s) => {
      setSession(s);
      setView(await s.view());
    });
  }, [kv, now, market]);
  const set: SetField = (k, v) => {
    // a market order has no lifetime, trigger or limit: clear them, so nothing hidden can block it
    setForm((f) => (k === 'type' && v === 'market' ? expressSafe(f) : { ...f, [k]: v }));
    setTouched(true);
  };
  const setUi = (u: Partial<OrderUi>) => {
    setUiState((old) => ({ ...old, ...u }));
    if (u.mode !== undefined) {
      if (u.mode === 'express') setForm(expressSafe);
      void putStamped(kv, ORDER_MODE_KEY, u.mode, now());
    }
  };
  const setJournal = (j: BeforeFields) => (setJournalState(j), setTouched(true));
  const submit = useCallback(async () => {
    const placed = await placeOrder({ session, form, ui, market, journal, kv, now }, setMessage);
    if (placed) {
      setJournalState(NO_JOURNAL);
      setTouched(false);
    }
    if (session !== null) setView(await session.view());
  }, [session, form, ui, market, journal, kv, now]);
  const cancel = useCallback(
    async (id: string) => {
      if (session === null) return;
      const r = await session.cancel(id);
      setMessage(r.ok ? `Order ${id} cancelled.` : r.error);
      setView(await session.view());
    },
    [session],
  );
  const prepareSell = (h: Holding) => {
    setForm((f) => sellAll(f, h));
    setUiState((old) => ({ ...old, qtyBy: 'shares' }));
    setTouched(true);
    setMessage(`Ready to sell ${String(h.quantity)} ${h.symbol}. Change the quantity to sell part, then tap Place sell order.`);
  };
  const plans = planActions(session, market, setView, setMessage);
  return { view, form, ui, setUi, message, set, submit, cancel, journal, setJournal, touched, prepareSell, plans };
}
