/**
 * Futures and options scenarios (SSD v4.1 §5.3, MIP Stage 8): a goal, a date range, the indices you may use and a
 * debrief. They are written text. Whether a goal was met is worked out by code from the practice account's daily
 * figures, and the debrief figures are never typed here. Prices in these scenarios are modelled from the index ETFs,
 * not taken from the exchange, and the lesson text says so. No scenario says what to trade.
 */
export type FnoGoal =
  /** Finish with no more than `pct` percent less than the starting cash. */
  | { kind: 'limit_loss'; pct: number }
  /** Never let the margin used go above `pct` percent of the account value at any close. */
  | { kind: 'margin_cap'; pct: number }
  /** Hold no open contract on its expiry day: close or roll everything first. */
  | { kind: 'no_expiry_holding' };

export interface FnoScenario {
  id: string;
  title: string;
  start: string;
  end: string;
  /** Index codes the person may trade. */
  underlyings: readonly ('NIFTY' | 'BANKNIFTY' | 'USDINR')[];
  /** Every goal must be met. */
  goals: readonly FnoGoal[];
  goalText: string;
  brief: string;
  checkpoints: readonly { date: string; text: string }[];
  lessons: readonly string[];
  debrief: { met: string; notMet: string };
}

export const FNO_SCENARIOS: readonly FnoScenario[] = [
  {
    id: 'fno-election-2024',
    title: 'Election result week',
    start: '2024-05-27',
    end: '2024-06-07',
    underlyings: ['NIFTY', 'BANKNIFTY'],
    goals: [{ kind: 'limit_loss', pct: 5 }],
    goalText: 'Finish with no more than 5% less than your starting ₹10,00,000, whatever the result does to the index.',
    brief:
      'The general election results come on 4 June 2024. Everyone expects a big move and nobody knows which way. Option prices already include that expectation. You have ₹10,00,000 and two weeks. Decide how much you can afford to lose if the move goes against you, and whether you will buy options, sell them, or stay out.',
    checkpoints: [
      { date: '2024-06-03', text: 'The day before the result. Write down your worst case in rupees if the index moves 5% either way. Is it within your limit?' },
      { date: '2024-06-05', text: 'The day after. Look at your option prices: did the premium fall even where the index moved your way?' },
    ],
    lessons: ['option-price-and-greeks', 'leverage-costs-and-tax'],
    debrief: {
      met: 'Your loss stayed inside the limit. Look at how: a defined-risk position, a small size, or luck? A short option that survived a quiet day is not proof it was safe.',
      notMet: 'The loss went past your limit. Check whether you held a position that could lose more than you could afford, and what the premium did after the result even if the index moved your way.',
    },
  },
  {
    id: 'fno-futures-2020',
    title: 'Futures and the margin budget',
    start: '2020-04-01',
    end: '2020-06-30',
    underlyings: ['NIFTY'],
    goals: [{ kind: 'margin_cap', pct: 50 }],
    goalText: 'Take any view you like with Nifty futures, but never use more than half of your account as margin at any close.',
    brief:
      'It is April 2020, after the fall. A futures lot controls about ten times the money you put up. You have ₹10,00,000. The goal is about size, not profit: choose how many lots you can hold so that a bad day does not force the broker to close you out.',
    checkpoints: [
      { date: '2020-05-04', text: 'Check the margin used on the F&O screen. If the index fell 5% tomorrow, how far would your account value drop?' },
    ],
    lessons: ['futures-margin-mtm', 'leverage-costs-and-tax'],
    debrief: {
      met: 'You kept the margin under half of the account at every close. That leaves room to survive a bad day. Notice how few lots that was compared with how many you could have held.',
      notMet: 'At least one close had more than half of the account tied up as margin. Look at the date and the number of lots. A position that size has little room before a margin call.',
    },
  },
  {
    id: 'fno-protect-2022',
    title: 'Protecting with puts',
    start: '2022-02-01',
    end: '2022-03-31',
    underlyings: ['NIFTY', 'BANKNIFTY'],
    goals: [{ kind: 'limit_loss', pct: 3 }, { kind: 'margin_cap', pct: 50 }],
    goalText: 'Finish with no more than 3% less than your starting ₹10,00,000, and keep margin used under half of the account.',
    brief:
      'Early 2022: prices are jumpy and a war begins in Europe in late February. Buying a put option is like paying for insurance: the premium is the most you can lose, and it pays if the index falls. Use futures or options to take a view, and decide how you will protect it before you open it.',
    checkpoints: [
      { date: '2022-02-24', text: 'The day of the first big fall. Did your protection work as you expected, and what did it cost?' },
    ],
    lessons: ['options-and-payoffs', 'option-price-and-greeks'],
    debrief: {
      met: 'You stayed inside both limits. Compare the cost of your protection with the loss it avoided, and ask whether you would pay that premium again in a calm month.',
      notMet: 'A limit was crossed. Check whether the protection was too small, or too late, or whether the margin on short positions grew faster than you planned.',
    },
  },
  {
    id: 'fno-sellers-2023',
    title: 'Selling premium in a calm market',
    start: '2023-06-01',
    end: '2023-08-31',
    underlyings: ['NIFTY'],
    goals: [{ kind: 'limit_loss', pct: 5 }, { kind: 'margin_cap', pct: 50 }],
    goalText: 'Sell options if you wish, but finish with no more than 5% less than your starting cash and never use over half the account as margin.',
    brief:
      'The market has been quiet and option prices are low, but sellers still collect a premium each week. It looks easy. You have ₹10,00,000. Selling a lot brings in a small sum and risks a large one. Decide how much you can lose in one move, and whether to cap the risk by buying a cheaper option further out.',
    checkpoints: [
      { date: '2023-07-03', text: 'Count what you have collected in premium and what one 3% move against you would cost. Which is larger?' },
    ],
    lessons: ['options-and-payoffs', 'leverage-costs-and-tax'],
    debrief: {
      met: 'You stayed inside the limits. A quiet period rewards sellers, so ask how the same plan would have fared in a week with a 5% move, and what the margin would have been then.',
      notMet: 'A limit was crossed. Sellers earn small amounts often and lose large amounts rarely. Look at the largest daily loss and at the margin used on that day.',
    },
  },
  {
    id: 'fno-expiry-2024',
    title: 'Expiry day discipline',
    start: '2024-10-01',
    end: '2024-11-12',
    underlyings: ['NIFTY'],
    goals: [{ kind: 'no_expiry_holding' }, { kind: 'limit_loss', pct: 4 }],
    goalText: 'Finish with no more than 4% less than your starting cash, and close every position before its expiry day.',
    brief:
      'Option prices change fastest on the last day, and automatic exercise and extra charges apply to positions held to the end. Over six weeks, trade as you like, but close or roll every position before its expiry day. The checker will look at what you held on each expiry.',
    checkpoints: [
      { date: '2024-10-14', text: 'Look at the expiry dates of every contract you hold. Which falls first? Do you have a plan for it?' },
    ],
    lessons: ['expiry-and-settlement', 'leverage-costs-and-tax'],
    debrief: {
      met: 'You held nothing into any expiry day. Closing early costs a little time value, but it removes the largest swings and the exercise charge.',
      notMet: 'A position was open on its expiry day or the loss went past your limit. Look at the date and ask why you did not close it a day earlier.',
    },
  },
  {
    id: 'fno-rupee-2022',
    title: 'The rupee under pressure',
    start: '2022-06-01',
    end: '2022-10-31',
    underlyings: ['USDINR'],
    goals: [{ kind: 'limit_loss', pct: 3 }, { kind: 'margin_cap', pct: 50 }],
    goalText: 'Trade USD/INR futures if you wish, but finish with no more than 3% less than your starting ₹10,00,000 and never use over half of it as margin.',
    brief:
      'In 2022 the dollar rose against most currencies and the rupee weakened. A currency lot is 1,000 dollars, and a one-rupee move in the rate changes your account by ₹1,000 a lot, which looks small. The margin is small too, so it is easy to hold far too many lots. You have ₹10,00,000 and five months. Decide how many lots a two-rupee move against you could survive.',
    checkpoints: [
      { date: '2022-08-01', text: 'Look at the margin used and at what a one-rupee move costs on your lots. Is the position still the size you planned?' },
    ],
    lessons: ['currency-and-commodities', 'futures-margin-mtm'],
    debrief: {
      met: 'You stayed inside both limits. A currency moves slowly by the day, which makes a big position feel safe. Notice how many lots your margin cap allowed compared with how many you could have held.',
      notMet: 'A limit was crossed. A currency future moves little each day, so a large position feels calm until a run of one-way days. Look at the date the margin share was highest and at the lots you held.',
    },
  },
  {
    id: 'fno-rupee-2023',
    title: 'A quiet rupee',
    start: '2023-02-01',
    end: '2023-07-31',
    underlyings: ['USDINR'],
    goals: [{ kind: 'limit_loss', pct: 2 }, { kind: 'no_expiry_holding' }],
    goalText: 'Finish with no more than 2% less than your starting ₹10,00,000, and close every position before its expiry day.',
    brief:
      'In the first half of 2023 the rupee stayed in a narrow range. Calm markets invite bigger positions and longer holds. Currency futures expire on a fixed day each month, two working days before the last working day, and the checker looks at what you held on each expiry. Trade as you like, but close or roll before the last day.',
    checkpoints: [
      { date: '2023-04-03', text: 'Which expiry comes next? Write down the date and what you will do before it.' },
    ],
    lessons: ['currency-and-commodities', 'expiry-and-settlement'],
    debrief: {
      met: 'You held nothing into an expiry day and kept the loss inside the limit. Rolling costs charges twice, so ask whether the extra position was worth it.',
      notMet: 'A position was open on an expiry day or the loss went past your limit. Look at the date and ask what you would have gained by closing a day earlier.',
    },
  },
];

export const fnoScenarioById = (id: string): FnoScenario | null => FNO_SCENARIOS.find((s) => s.id === id) ?? null;
