/**
 * Time Machine scenarios (SSD v4.1 §5.5): a goal, a date range, the instruments you may use, checkpoints and a
 * debrief. They are written text; the figures in a debrief (returns, what followed) are worked out by code from
 * the price history when the scenario ends, never typed here. Every date is on or after 2020-04-01, the first day
 * the cost schedule covers, so each order carries its real charges. No scenario says what to buy.
 */
export type ScenarioGoal =
  /** Finish with more than buying the benchmark on day one and holding (before charges). */
  | { kind: 'beat_index' }
  /** Finish with no more than `pct` percent less than the starting cash. */
  | { kind: 'limit_loss'; pct: number }
  /** Make at least `count` separate monthly purchases of funds (a SIP counts each instalment). */
  | { kind: 'buy_months'; count: number }
  /** Finish with none of the listed mistake-checker flags. */
  | { kind: 'no_flag'; rules: readonly string[] };

export interface Checkpoint {
  date: string;
  text: string;
}

export interface Scenario {
  id: string;
  title: string;
  /** Which practice account the scenario uses. */
  pot: 'shares' | 'funds';
  start: string;
  end: string;
  /** Trading symbols (shares and ETFs) or fund codes the person may use. */
  instruments: readonly string[];
  /** The benchmark held from day one: a symbol or a fund code. */
  benchmark: string;
  goal: ScenarioGoal;
  goalText: string;
  brief: string;
  checkpoints: readonly Checkpoint[];
  /** Lessons to read first and to revisit. */
  lessons: readonly string[];
  /** Fixed debrief text, by whether the goal was met. */
  debrief: { met: string; notMet: string };
}

const BROAD = ['NIFTYBEES', 'BANKBEES', 'GOLDBEES', 'LIQUIDBEES'] as const;

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'recovery-2020',
    title: 'The 2020 recovery',
    pot: 'shares',
    start: '2020-04-01',
    end: '2020-09-30',
    instruments: [...BROAD, 'RELIANCE', 'HDFCBANK', 'TCS', 'BAJFINANCE', 'YESBANK'],
    benchmark: 'NIFTYBEES',
    goal: { kind: 'beat_index' },
    goalText: 'Finish ahead of simply buying the Nifty 50 ETF on day one and holding it.',
    brief:
      'It is 1 April 2020. Markets fell hard in the weeks before, and nobody knows whether that was the bottom. You have ₹10,00,000 of practice money for six months. The easy benchmark is to buy the Nifty 50 ETF and wait; to beat it you must do something different and be right, after charges.',
    checkpoints: [
      { date: '2020-06-01', text: 'Two months in. Open your journal: are you still following the reason you wrote when you bought?' },
      { date: '2020-08-03', text: 'Four months in. Compare your account with the benchmark on the Summary tab. Is your extra risk paying you?' },
    ],
    lessons: ['behavioural-traps', 'habits-that-help'],
    debrief: {
      met: 'You finished ahead of the benchmark. Before you count that as skill, ask what you owned that the Nifty did not, and whether you could have known it on the day. A result that came from one bold position is hard to repeat.',
      notMet: 'You finished behind the benchmark. That is the usual result: a fund that simply holds the index is hard to beat after charges, and most of the work in a recovery is staying invested. Check how much of the gap came from charges and from the days you spent in cash.',
    },
  },
  {
    id: 'falling-2022',
    title: 'A falling market: protect your capital',
    pot: 'shares',
    start: '2022-01-03',
    end: '2022-06-30',
    instruments: [...BROAD, 'RELIANCE', 'HDFCBANK', 'TCS', 'BAJFINANCE'],
    benchmark: 'NIFTYBEES',
    goal: { kind: 'limit_loss', pct: 5 },
    goalText: 'Finish with no more than 5% less than your starting ₹10,00,000.',
    brief:
      'It is the first trading day of 2022. You have ₹10,00,000 and six months. Your goal is not to make the most money but to avoid a big loss, whatever the market does. You decide how much to put at risk, and in what, before you know what follows.',
    checkpoints: [
      { date: '2022-03-01', text: 'Two months in. How far below its high is your account? Do you have a rule for when you reduce risk, written before today?' },
    ],
    lessons: ['types-of-risk', 'behavioural-traps'],
    debrief: {
      met: 'You kept the loss inside your limit. Look at how: by holding less in shares, by spreading across kinds of assets, or by selling during the fall? Each has a cost when markets rise instead.',
      notMet: 'The loss went past your limit. Look at the account value on the day you wrote your plan and at the day the loss crossed 5%. Was there a rule that should have fired, and did you follow it?',
    },
  },
  {
    id: 'gold-or-shares-2022',
    title: 'Gold or shares?',
    pot: 'shares',
    start: '2022-01-03',
    end: '2022-12-30',
    instruments: [...BROAD],
    benchmark: 'NIFTYBEES',
    goal: { kind: 'beat_index' },
    goalText: 'Over 2022, finish ahead of the Nifty 50 ETF held from day one, using only index, bank, gold and liquid ETFs.',
    brief:
      'One year, four exchange-traded funds: the Nifty 50, the bank index, gold and a liquid fund (close to cash). Mix them however you like and change the mix when you want. Each change costs money, so every switch has to earn its charges.',
    checkpoints: [
      { date: '2022-06-30', text: 'Half way. Which of your holdings did the most for your result so far, and did you expect that in January?' },
    ],
    lessons: ['gold-reits-and-invits', 'costs-of-trading'],
    debrief: {
      met: 'You finished ahead of the Nifty 50. Check whether you got there by being in the right asset all year or by trading in and out, and what the charges came to.',
      notMet: 'You finished behind the Nifty 50 ETF. Some mixes looked wise at the start of the year and others only look wise now. The point of this scenario is that you could not know which in January.',
    },
  },
  {
    id: 'sip-2022',
    title: 'SIP through 2022',
    pot: 'funds',
    start: '2022-01-03',
    end: '2022-12-30',
    instruments: ['120716', '119800', '119788', '118987', '122639'],
    benchmark: '120716',
    goal: { kind: 'buy_months', count: 9 },
    goalText: 'Invest in funds in at least nine separate months, through a SIP or by hand, whatever the market does.',
    brief:
      'You have ₹10,00,000 in the fund account and a year of monthly instalments to plan. The skill here is not picking a fund but sticking to a plan when the value of what you hold falls. Use the Funds tab: set up a SIP, or buy by hand each month.',
    checkpoints: [
      { date: '2022-06-30', text: 'Half way. Is your SIP still running? What does it feel like to buy when the price is lower than your last purchase?' },
    ],
    lessons: ['mutual-funds-and-etfs', 'behavioural-traps'],
    debrief: {
      met: 'You invested across the year. Compare your result with putting everything in on the first day: a SIP does not always win, but it takes away the need to guess the best day.',
      notMet: 'You invested in fewer months than your plan needed. Look at which months you skipped and what you were thinking then. Skipping after a fall is the common way a plan breaks.',
    },
  },
  {
    id: 'falling-stock-2020',
    title: 'A cheap stock that keeps falling',
    pot: 'shares',
    start: '2020-04-01',
    end: '2020-09-30',
    instruments: ['YESBANK', 'RELIANCE', 'HDFCBANK', 'TCS', 'BAJFINANCE', 'NIFTYBEES'],
    benchmark: 'NIFTYBEES',
    goal: { kind: 'no_flag', rules: ['position_too_large', 'averaging_down'] },
    goalText: 'Finish with no "position too large" or "averaging down" flag from the mistake checker.',
    brief:
      'A low share price feels cheap, and a falling one feels like a chance. The list includes a stock whose price is a small fraction of the others. Invest your ₹10,00,000 as you like, but keep every position within your size limit and never buy more of a holding that is below your cost. The checker will judge you on that, not on profit.',
    checkpoints: [
      { date: '2020-05-04', text: 'Is any holding below what you paid? Before adding to it, write down what has changed about the business, not just the price.' },
    ],
    lessons: ['behavioural-traps', 'types-of-risk'],
    debrief: {
      met: 'The checker found neither mistake. Staying inside your size limit and not adding to a loser are habits, not luck. Notice how they felt when a price you owned was falling.',
      notMet: 'The checker flagged a mistake. Look at the flag and the date. A low price is not a reason to buy, and adding to a loser makes one idea carry more of your account.',
    },
  },
  {
    id: 'budget-2024',
    title: 'Budget month 2024',
    pot: 'shares',
    start: '2024-07-15',
    end: '2024-08-30',
    instruments: ['NIFTYBEES', 'BANKBEES', 'ITBEES', 'RELIANCE', 'HDFCBANK', 'TCS', 'SUZLON'],
    benchmark: 'NIFTYBEES',
    goal: { kind: 'limit_loss', pct: 3 },
    goalText: 'Finish with no more than 3% less than your starting ₹10,00,000.',
    brief:
      'The Union Budget was presented on 23 July 2024. Budgets can change taxes and moods, and prices can move in either direction around them. You have six weeks and ₹10,00,000. Decide before the Budget day how much you will have at risk across it, and stick to it.',
    checkpoints: [
      { date: '2024-07-23', text: 'Budget day. Did you change your plan today because of the news? Write down why, and whether you had a rule for it.' },
    ],
    lessons: ['order-types', 'habits-that-help'],
    debrief: {
      met: 'Your loss stayed within the limit, or you made money. Check whether you had a position on each side of the Budget, or none, and whether you would repeat it next year.',
      notMet: 'The loss went past your limit. Look at the sessions around the Budget: size, a stop, and whether you traded the news or your plan.',
    },
  },
];

export const scenarioById = (id: string): Scenario | null => SCENARIOS.find((s) => s.id === id) ?? null;
