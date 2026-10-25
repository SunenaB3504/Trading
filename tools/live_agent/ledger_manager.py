"""
Multi-Trader Ledger Management Engine (Phase 1)
Handles double-entry virtual cash balances, open positions, PnL calculations,
and transaction logs across 4 parallel portfolios:
  - Trader 1: Pure AI Benchmark
  - Trader 2: Sunil (Father)
  - Trader 3: Neil (Son)
  - Trader 4: Shine (Brother)
"""

import os
import json
import datetime
import pandas as pd

DEFAULT_SEED_CASH = 1000000.0  # ₹10 Lakhs per trader

TRADER_PROFILES = {
    "trader1_ai": {
        "id": "trader1_ai",
        "name": "Trader 1: Pure AI Control",
        "role": "Benchmark Control (Asset Signals Only)",
        "lagna": None,
        "moon_sign": None,
        "nakshatra": None,
        "indu_lagna": None
    },
    "trader2_sunil": {
        "id": "trader2_sunil",
        "name": "Trader 2: Sunil (Father)",
        "role": "Sagittarius Moon / Pisces Lagna (Cancer Exaltation Shield)",
        "lagna": "Pisces",
        "moon_sign": "Sagittarius",
        "nakshatra": "Mula",
        "indu_lagna": "Scorpio"
    },
    "trader3_neil": {
        "id": "trader3_neil",
        "name": "Trader 3: Neil (Son)",
        "role": "Leo Moon / Gemini Lagna (Pisces 50% Sizing Filter)",
        "lagna": "Gemini",
        "moon_sign": "Leo",
        "nakshatra": "Magha",
        "indu_lagna": "Aquarius"
    },
    "trader4_shine": {
        "id": "trader4_shine",
        "name": "Trader 4: Shine (Brother)",
        "role": "Libra Moon / Aries Lagna (Taurus 10-Day Time Exit)",
        "lagna": "Aries",
        "moon_sign": "Libra",
        "nakshatra": "Swati",
        "indu_lagna": "Pisces"
    }
}

class MultiTraderLedger:
    def __init__(self, ledger_dir="data/live_ledger"):
        self.ledger_dir = ledger_dir
        os.makedirs(self.ledger_dir, exist_ok=True)
        self.history_csv = os.path.join(self.ledger_dir, "master_trade_history.csv")
        self._init_ledgers()

    def _init_ledgers(self):
        """Initializes portfolio state files if not present."""
        for tid, meta in TRADER_PROFILES.items():
            fpath = os.path.join(self.ledger_dir, f"{tid}.json")
            if not os.path.exists(fpath):
                state = {
                    "trader_id": tid,
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
                "timestamp", "trader_id", "symbol", "action", "qty",
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
            "trader_id": trader_id,
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
        
        for tid in TRADER_PROFILES.keys():
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
    print("MultiTraderLedger initialized successfully with 4 trader portfolios.")
