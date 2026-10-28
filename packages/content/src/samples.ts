/**
 * Prepared sample tutor conversations for Preview mode (SSD v4.1 §7.2): one per feature, written by hand, shown with
 * no key, no cost and no network. They use made-up examples, never a real security, and each says it is a sample.
 */
export const SAMPLES: Readonly<Record<string, string>> = {
  learning_guide:
    'Sample answer. You have started Level 1. A good next step is the lesson on equity shares: it explains what you own when you hold a share and why price alone says nothing about size. After it, try the self-check for the level to see which ideas need another look.',
  ask_screen:
    'Sample answer. This screen is where you place a practice order. Pick a stock, choose Buy or Sell, and a type: a market order fills at the next open, a limit order only at your price or better. The cost preview below shows what the charges would take. Nothing here is real money.',
  pre_trade:
    'Sample answer. Before you place this order, three questions. Why this stock, in one sentence? Where will you sell if you are wrong, and how much would that cost you? Is the size small enough that a bad result will not matter much? If you cannot answer the second one, the habits lesson shows how to set a stop. I cannot tell you whether to place the order.',
  trade_review:
    'Sample answer. Your journal says you planned to sell if the price closed below your exit level, and you did. That is the plan working, even though the trade lost money. One thing to try next time: write down the target as well, so a good result is also a decision and not luck. Charges took a part of the result; the costs lesson shows how to estimate them first.',
  weekly_review:
    'Sample answer. This week you placed several orders, and the checker flagged two buys with no exit plan. A pattern worth watching: orders placed soon after a losing sale. One habit to work on: write the exit before the order, every time. Read the lesson on behavioural traps for why a quick follow-up trade is tempting and often costly.',
  quiz_feedback:
    'Sample answer. A stop-loss order is a trigger, not a promise of a price. If the share opens far below your trigger, the order is carried out near the open, not at the trigger. Think of it as a door that opens at a level, after which you take whatever the market offers. The order types lesson works this through with numbers.',
  scenario_debrief:
    'Sample answer. In this scenario you sold part of your holding on the way down and kept the rest. What followed in the prices was a partial recovery over several weeks. The lesson is not that selling was wrong or right, but that a plan made before the fall is easier to follow than a decision made during it.',
};
