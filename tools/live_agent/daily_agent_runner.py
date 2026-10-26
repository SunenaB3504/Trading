"""
Daily Mock-Trading Orchestrator (placeholder until Phase 4)
The full daily cycle (fetch EOD prices -> fill queued orders -> mark to market
-> exits -> signals -> queue orders) is built in Phases 2-4. Until then this
script only loads the five account ledgers and prints their state. It places
no trades and writes nothing.
"""

import datetime
from ledger_manager import ACCOUNT_PROFILES, MultiTraderLedger

def run_daily_trading_session():
    print(f"=== Mock-Trading Session (placeholder): {datetime.datetime.now()} ===")
    print("Trading cycle not implemented yet (Phase 4). No orders placed.")

    ledger = MultiTraderLedger()
    for aid in ACCOUNT_PROFILES:
        state = ledger.load_portfolio(aid)
        print(f"[{state['metadata']['name']}] Cash: INR {state['cash_balance']:,.2f} | "
              f"NAV: INR {state['portfolio_value']:,.2f} | Open Positions: {len(state['open_positions'])}")

if __name__ == "__main__":
    run_daily_trading_session()
