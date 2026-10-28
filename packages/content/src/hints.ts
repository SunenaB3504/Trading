/**
 * Fixed coach hints, one for each screen (SSD v4.1 §7.1). They are written text, so they work with the AI off and
 * never change an order. Each can point to a lesson.
 */
export interface Hint {
  text: string;
  lesson?: string;
}

export const HINTS: Record<string, Hint> = {
  home: { text: 'Start with Learn, Level 1. Practise with virtual money once you have read the first lessons.', lesson: 'why-invest' },
  learn: { text: 'Read a lesson, mark it done, then take the self-check for the level. Answers are for you to mark honestly.' },
  trade: { text: 'Before you place an order, ask what you expect and where you will get out if you are wrong.', lesson: 'order-types' },
  funds: { text: 'A fund trades at the end-of-day NAV, not a live price. Check the cut-off time and any exit load first.', lesson: 'mutual-funds-and-etfs' },
  ledger: { text: 'Costs are charged on every trade. Look at what they took from each result.', lesson: 'costs-of-trading' },
  report: { text: 'A few trades say little. Look at the range, not the single number.', lesson: 'habits-that-help' },
  universe: { text: 'A stock can fail a rule for good reason. Read why before you override it.', lesson: 'types-of-risk' },
  compare: { text: 'This shows what holding longer or selling earlier would have done. It is hindsight, so learn from it, do not chase it.', lesson: 'behavioural-traps' },
  timemachine: { text: 'You only see prices up to the date you are at. Decide, move the date on, and then look at what happened. Do not move back to change an order.', lesson: 'behavioural-traps' },
  builder: { text: 'A mix that fell less in the past is not promised to fall less next time. Look at the worst fall, not only the return.', lesson: 'types-of-risk' },
  charts: { text: 'A chart is a record of what already happened. Averages and RSI smooth or measure that record. They do not predict.', lesson: 'charts-and-indicators' },
  lab: { text: 'Test the rules on past prices, but do not keep changing the settings until the past looks good. That is overfitting.', lesson: 'rules-and-overfitting' },
  robo: { text: 'These accounts follow fixed rules and are brought up to date session by session. Compare them with the Index Benchmark, not with each other only.', lesson: 'rules-and-overfitting' },
  measure: { text: 'Write down why you trade before you trade. Flags below are habits to look at, not verdicts.', lesson: 'behavioural-traps' },
};

export const hintFor = (screen: string): Hint | null => HINTS[screen] ?? null;
