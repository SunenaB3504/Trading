"""
Daily 4-Trader Execution Orchestrator (Phase 3 & 4)
Runs daily at 09:00 AM IST via GitHub Actions (or locally).
Steps:
  1. Computes live astronomical transit state (Swiss Ephemeris).
  2. Ingests fresh market prices.
  3. Evaluates watch candidates via MasterSignalRouterV2.
  4. Fills orders across Trader 1 (AI), Trader 2 (Sunil), Trader 3 (Neil), Trader 4 (Shine).
  5. Updates portfolio ledgers and MTM equity curves.
"""

import os
import json
import datetime
from ephemeris_transit_live import get_live_astro_state
from master_router_v2 import MasterSignalRouterV2
from ledger_manager import MultiTraderLedger

def run_daily_trading_session():
    print(f"=== Starting Daily Astro-Trading Session: {datetime.datetime.now()} ===")
    
    # 1. Astronomical Transit Ground Truth
    astro_state = get_live_astro_state()
    print(f"Panchanga: {astro_state['tithi']} | Moon: {astro_state['moon_sign_name']} ({astro_state['moon_nak_name']})")
    
    # Check personal climate
    transit_sign = astro_state["moon_sign"]
    print("--- 4-Trader Astrological Diagnostics ---")
    print(f"Trader 1 (Pure AI): Unbiased Asset Rules Active")
    print(f"Trader 2 (Sunil):   {'Cancer Shield Active (Jupiter Exaltation)' if transit_sign == 4 else 'Normal Window'}")
    print(f"Trader 3 (Neil):    {'[CHANDRASHTAMA IN PISCES] 50% Sizing Cut Active' if transit_sign == 12 else 'Normal Window'}")
    print(f"Trader 4 (Shine):   {'[CHANDRASHTAMA IN TAURUS] 10-Day Time Exit Active' if transit_sign == 2 else 'Normal Window'}")
    
    # 2. Ingest Candidate Feed (Simulated live liquid watchlist)
    router = MasterSignalRouterV2()
    ledger = MultiTraderLedger()
    
    # Sample liquid watchlist candidates
    candidates = [
        {"symbol": "DIVISLAB", "price": 5240.0, "confluence": "T-T-T", "indu_boost": True},
        {"symbol": "TATASTEEL", "price": 148.5, "confluence": "T-T-T", "indu_boost": False},
        {"symbol": "RELIANCE", "price": 2890.0, "confluence": "NEUTRAL", "indu_boost": True}
    ]
    
    # 3. Router Evaluation & Execution
    for c in candidates:
        sym = c["symbol"]
        price = c["price"]
        
        # Inject asset specific state
        asset_astro = dict(astro_state)
        asset_astro["active_dasha_confluence"] = c["confluence"]
        asset_astro["is_indu_benefic"] = c["indu_boost"]
        
        decisions = router.evaluate_candidate(sym, price, asset_astro)
        
        for tid, dec in decisions.items():
            if dec["action"] == "BUY" and dec["alloc"] > 0:
                ledger.execute_buy(
                    trader_id=tid,
                    symbol=sym,
                    price=price,
                    nominal_alloc=dec["alloc"],
                    order_type=dec["order_type"],
                    reason=dec["reason"]
                )
                
    # 4. Mark to Market
    live_prices = {c["symbol"]: c["price"] for c in candidates}
    summary = ledger.mark_to_market(live_prices)
    
    print("\n=== Daily Session Summary ===")
    for tid, s in summary.items():
        print(f"[{s['name']}] NAV: INR {s['nav']:,.2f} | Return: {s['total_return_pct']:+.2f}% | Open Positions: {s['open_count']}")
        
    return summary

if __name__ == "__main__":
    run_daily_trading_session()
