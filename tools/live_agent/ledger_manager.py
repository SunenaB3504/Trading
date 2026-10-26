"""
Multi-Account Ledger Management Engine (Phase 1)
Handles virtual cash balances, open positions, PnL calculations,
and transaction logs across 5 parallel mock-trading accounts:
  - Account 1: Index Benchmark (Nifty 50 ETF buy-and-hold)
  - Account 2: Sunil (Standard profile)
  - Account 3: Neil (Conservative profile)
  - Account 4: Shine (Short-horizon profile)
  - Account 5: Sandbox (settings from the Sandbox page)
"""

import os
import json
import datetime
import pandas as pd

DEFAULT_SEED_CASH = 1000000.0  # ₹10 Lakhs per account

ACCOUNT_PROFILES = {
    "acct1_benchmark": {
        "id": "acct1_benchmark",
        "name": "Account 1: Index Benchmark",
        "owner": None,
        "profile": "benchmark"
    },
    "acct2_sunil": {
        "id": "acct2_sunil",
        "name": "Account 2: Sunil",
        "owner": "Sunil",
        "profile": "standard"
    },
    "acct3_neil": {
        "id": "acct3_neil",
        "name": "Account 3: Neil",
        "owner": "Neil",
        "profile": "conservative"
    },
    "acct4_shine": {
        "id": "acct4_shine",
        "name": "Account 4: Shine",
        "owner": "Shine",
        "profile": "short_horizon"
    },
    "acct5_sandbox": {
        "id": "acct5_sandbox",
        "name": "Account 5: Sandbox",
        "owner": None,
        "profile": "sandbox"
    }
}

class MultiTraderLedger:
    def __init__(self, ledger_dir="data/live_ledger"):
        self.ledger_dir = ledger_dir
        os.makedirs(self.ledger_dir, exist_ok=True)
        self.history_csv = os.path.join(self.ledger_dir, "trades.csv")
        self._init_ledgers()

    def _init_ledgers(self):
        """Initializes portfolio state files if not present."""
        for tid, meta in ACCOUNT_PROFILES.items():
            fpath = os.path.join(self.ledger_dir, f"{tid}.json")
            if not os.path.exists(fpath):
                state = {
                    "account_id": tid,
                    "metadata": meta,
                    "initial_cash": DEFAULT_SEED_CASH,
                    "cash_balance": DEFAULT_SEED_CASH,
                    "portfolio_value": DEFAULT_SEED_CASH,
                    "realized_pnl": 0.0,
                    "unrealized_pnl": 0.0,
                    "total_trades": 0,
                    "winning_trades": 0,
                    "losing_trades": 0,
                    "open_positions": {},  # symbol -> {qty, avg_price, entry_date, stop_loss, target, note}
                    "daily_equity_curve": [
                        {
                            "date": datetime.date.today().strftime("%Y-%m-%d"),
                            "cash": DEFAULT_SEED_CASH,
                            "equity_val": 0.0,
                            "nav": DEFAULT_SEED_CASH,
                            "return_pct": 0.0
                        }
                    ]
                }
                with open(fpath, "w", encoding="utf-8") as f:
                    json.dump(state, f, indent=2)

        if not os.path.exists(self.history_csv):
            df = pd.DataFrame(columns=[
                "timestamp", "account_id", "symbol", "action", "qty",
                "price", "order_type", "total_val", "reason", "pnl"
            ])
            df.to_csv(self.history_csv, index=False)

    def load_portfolio(self, trader_id):
        fpath = os.path.join(self.ledger_dir, f"{trader_id}.json")
        with open(fpath, "r", encoding="utf-8") as f:
            return json.load(f)

    def save_portfolio(self, trader_id, state):
        fpath = os.path.join(self.ledger_dir, f"{trader_id}.json")
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)

    def record_trade(self, trader_id, symbol, action, qty, price, order_type="MARKET", reason="", pnl=0.0):
        total_val = round(qty * price, 2)
        row = {
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "account_id": trader_id,
            "symbol": symbol,
            "action": action.upper(),
            "qty": int(qty),
            "price": round(price, 2),
            "order_type": order_type,
            "total_val": total_val,
            "reason": reason,
            "pnl": round(pnl, 2)
        }
        df = pd.DataFrame([row])
        df.to_csv(self.history_csv, mode="a", header=False, index=False)

    def execute_buy(self, trader_id, symbol, price, nominal_alloc=100000.0, order_type="MARKET", reason=""):
        state = self.load_portfolio(trader_id)
        if state["cash_balance"] < nominal_alloc:
            nominal_alloc = state["cash_balance"]
            
        qty = int(nominal_alloc // price)
        if qty <= 0:
            print(f"[{trader_id}] Insufficient funds to buy {symbol} @ {price}")
            return False

        cost = qty * price
        state["cash_balance"] -= cost
        
        today_str = datetime.date.today().strftime("%Y-%m-%d")
        if symbol in state["open_positions"]:
            curr = state["open_positions"][symbol]
            new_qty = curr["qty"] + qty
            new_avg = ((curr["qty"] * curr["avg_price"]) + cost) / new_qty
            curr["qty"] = new_qty
            curr["avg_price"] = round(new_avg, 2)
        else:
            state["open_positions"][symbol] = {
                "qty": qty,
                "avg_price": round(price, 2),
                "entry_date": today_str,
                "current_price": round(price, 2),
                "order_type": order_type,
                "reason": reason
            }
            
        self.save_portfolio(trader_id, state)
        self.record_trade(trader_id, symbol, "BUY", qty, price, order_type, reason)
        print(f"[{trader_id}] BOUGHT {qty} {symbol} @ {price:.2f} ({order_type}) - {reason}")
        return True

    def execute_sell(self, trader_id, symbol, price, reason=""):
        state = self.load_portfolio(trader_id)
        if symbol not in state["open_positions"]:
            return False
            
        pos = state["open_positions"].pop(symbol)
        qty = pos["qty"]
        proceeds = qty * price
        pnl = (price - pos["avg_price"]) * qty
        
        state["cash_balance"] += proceeds
        state["realized_pnl"] += pnl
        state["total_trades"] += 1
        if pnl > 0:
            state["winning_trades"] += 1
        else:
            state["losing_trades"] += 1
            
        self.save_portfolio(trader_id, state)
        self.record_trade(trader_id, symbol, "SELL", qty, price, "MARKET", reason, pnl=pnl)
        print(f"[{trader_id}] SOLD {qty} {symbol} @ {price:.2f} | PnL: ₹{pnl:.2f} - {reason}")
        return True

    def mark_to_market(self, live_prices):
        """Updates portfolio equity curves using fresh market prices."""
        today_str = datetime.date.today().strftime("%Y-%m-%d")
        summary = {}
        
        for tid in ACCOUNT_PROFILES.keys():
            state = self.load_portfolio(tid)
            unrealized = 0.0
            equity_val = 0.0
            
            for sym, pos in state["open_positions"].items():
                curr_p = live_prices.get(sym, pos["avg_price"])
                pos["current_price"] = curr_p
                val = pos["qty"] * curr_p
                equity_val += val
                unrealized += (curr_p - pos["avg_price"]) * pos["qty"]
                
            state["unrealized_pnl"] = round(unrealized, 2)
            total_nav = round(state["cash_balance"] + equity_val, 2)
            state["portfolio_value"] = total_nav
            
            # Update equity curve if not already added today
            eq_curve = state["daily_equity_curve"]
            ret_pct = round(((total_nav - state["initial_cash"]) / state["initial_cash"]) * 100, 3)
            
            if eq_curve and eq_curve[-1]["date"] == today_str:
                eq_curve[-1] = {
                    "date": today_str,
                    "cash": round(state["cash_balance"], 2),
                    "equity_val": round(equity_val, 2),
                    "nav": total_nav,
                    "return_pct": ret_pct
                }
            else:
                eq_curve.append({
                    "date": today_str,
                    "cash": round(state["cash_balance"], 2),
                    "equity_val": round(equity_val, 2),
                    "nav": total_nav,
                    "return_pct": ret_pct
                })
                
            self.save_portfolio(tid, state)
            win_rate = round((state["winning_trades"] / state["total_trades"] * 100), 1) if state["total_trades"] > 0 else 0.0
            summary[tid] = {
                "name": state["metadata"]["name"],
                "nav": total_nav,
                "cash": round(state["cash_balance"], 2),
                "unrealized_pnl": round(unrealized, 2),
                "realized_pnl": round(state["realized_pnl"], 2),
                "total_return_pct": ret_pct,
                "win_rate": win_rate,
                "open_count": len(state["open_positions"])
            }
            
        return summary

if __name__ == "__main__":
    ledger = MultiTraderLedger()
    print("MultiTraderLedger initialized successfully with 5 account portfolios.")
