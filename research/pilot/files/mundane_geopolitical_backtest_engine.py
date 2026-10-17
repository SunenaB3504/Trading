import os
import sys
import math
import datetime
import json
import numpy as np
import pandas as pd
from scipy import stats

class MundaneGeopoliticalBacktestEngine:
    """
    Track 3: Mundane Jyothisham & Geopolitical Risk Quantitative Backtest Engine
    Evaluates 5 Medhini / Mundane Geopolitical Rules across 20 Geopolitical Equities:
      1. Rule M1: Mars-Saturn Conflict Conjunctions / Hard Aspects (30-Day Forward Return R30)
      2. Rule M2: Eclipse Points (Grahana) on Strategic Zodiac Signs (10-Day Volatility / DailyRange10)
      3. Rule M3: Major Solar Ingress (Mesh / Makara Sankranti - 30-Day Order Win Momentum R30)
      4. Rule M4: Sarvatobhadra Geopolitical Aspect Rays (SBC Papa Vedha - 15-Day MDD15)
      5. Rule M5: Rohini Shakata Bheda (Saturn/Rahu in Rohini under Mars Aspect - 60-Day Defense Momentum R60)
    """

    def __init__(self, ticker: str, company_name: str, sub_sector: str, listing_dt: str = "2006-01-01"):
        self.ticker = ticker
        self.company_name = company_name
        self.sub_sector = sub_sector  # "Defense & Aerospace", "Crude Oil & Shipping", "Strategic Metals & Minerals", "Semiconductors & Infrastructure"
        self.listing_dt = listing_dt
        self.price_df = None
        self.results = {}

    def generate_price_and_ephemeris_history(self, start_date: str = "2006-01-01", 
                                            end_date: str = "2026-10-13", seed: int = 777) -> pd.DataFrame:
        """Generates daily trading history and ephemeris signals for Geopolitical Equities."""
        dates = pd.date_range(start=start_date, end=end_date, freq='B')
        np.random.seed(seed + sum(ord(c) for c in self.ticker))

        if self.sub_sector == "Defense & Aerospace":
            drift, vol = 0.0007, 0.021
        elif self.sub_sector == "Crude Oil & Shipping":
            drift, vol = 0.0005, 0.025
        elif self.sub_sector == "Strategic Metals & Minerals":
            drift, vol = 0.0006, 0.023
        else:  # Semiconductors & Infrastructure
            drift, vol = 0.0008, 0.024

        returns = np.random.normal(loc=drift, scale=vol, size=len(dates))
        price_path = 100.0 * np.exp(np.cumsum(returns))

        highs = price_path * (1 + np.abs(np.random.normal(0, 0.010, len(dates))))
        lows = price_path * (1 - np.abs(np.random.normal(0, 0.010, len(dates))))

        df = pd.DataFrame({
            'Date': dates,
            'Open': price_path * (1 + np.random.normal(0, 0.003, len(dates))),
            'High': highs,
            'Low': lows,
            'Close': price_path,
            'Volume': np.random.randint(100000, 5000000, len(dates))
        })

        # Multi-period returns & Metrics
        df['R15'] = (df['Close'].shift(-15) - df['Close']) / df['Close'] * 100.0
        df['R30'] = (df['Close'].shift(-30) - df['Close']) / df['Close'] * 100.0
        df['R60'] = (df['Close'].shift(-60) - df['Close']) / df['Close'] * 100.0
        df['DailyRange10'] = ((df['High'] - df['Low']) / df['Close'] * 100.0).rolling(10).mean()

        # Maximum Drawdown in 15 business days
        mdd_list = []
        for i in range(len(df)):
            if i + 15 < len(df):
                f_closes = df['Close'].iloc[i:i+16].values
                mdd = (np.min(f_closes) - df['Close'].iloc[i]) / df['Close'].iloc[i] * 100.0
            else:
                mdd = np.nan
            mdd_list.append(mdd)
        df['MDD15'] = mdd_list

        # Ephemeris Signal Generation
        # Rule M1: Mars-Saturn Conflict (occurring roughly ~15% of business days)
        np.random.seed(seed + 10)
        df['Sig_M1_MarsSaturnConflict'] = np.random.choice([0, 1], size=len(dates), p=[0.85, 0.15])

        # Rule M2: Eclipse Points in Strategic Signs (occurring ~5% of business days, 10-day post-eclipse window)
        np.random.seed(seed + 20)
        df['Sig_M2_StrategicEclipse'] = np.random.choice([0, 1], size=len(dates), p=[0.95, 0.05])

        # Rule M3: Major Solar Ingress (Mesh Sankranti in April, Makara Sankranti in Jan - ~10% of days)
        month = df['Date'].dt.month
        df['Sig_M3_SolarIngress'] = ((month == 4) | (month == 1)).astype(int)

        # Rule M4: SBC Geopolitical Papa Vedha (~20% of days)
        np.random.seed(seed + 30)
        df['Sig_M4_SBCGeopoliticalVedha'] = np.random.choice([0, 1], size=len(dates), p=[0.80, 0.20])

        # Rule M5: Rohini Shakata Bheda (~8% of days)
        np.random.seed(seed + 40)
        df['Sig_M5_RohiniShakataBheda'] = np.random.choice([0, 1], size=len(dates), p=[0.92, 0.08])

        self.price_df = df.dropna().reset_index(drop=True)
        return self.price_df

    def run_multi_arm_backtest(self, signal_col: str, metric_col: str, higher_is_better: bool = True) -> dict:
        """Executes 4-Arm Control Design & Statistical Significance Gate (Welch's t-test)."""
        df = self.price_df.dropna(subset=[metric_col]).copy()

        arm_a = df[df[signal_col] == 1][metric_col].values
        arm_b0 = df[metric_col].values

        n_active = len(arm_a)
        if n_active > 0 and n_active <= len(df):
            arm_b1 = df.sample(n=n_active, replace=False, random_state=42)[metric_col].values
        else:
            arm_b1 = arm_b0

        shift_offset = 250
        shifted_sig = np.roll(df[signal_col].values, shift_offset)
        arm_b2 = df[shifted_sig == 1][metric_col].values

        t_stat, p_val = stats.ttest_ind(arm_a, arm_b1, equal_var=False)

        if p_val < 0.05:
            if higher_is_better and np.mean(arm_a) > np.mean(arm_b1):
                light = "🟢 GREEN — ALPHA BUY SIGNAL"
                action = "Promote Position / Overweight Allocation"
            elif not higher_is_better and np.mean(arm_a) < np.mean(arm_b1):
                light = "🔴 RED — RISK FILTER"
                action = "Hedge Position / Tighten Stop-Loss"
            elif metric_col == 'DailyRange10' and np.mean(arm_a) > np.mean(arm_b1):
                light = "🟡 YELLOW — VOLATILITY EXECUTIONS"
                action = "Use Passive Limit Orders / Spread Execution"
            else:
                light = "🔴 RED — STATISTICALLY SIGNIFICANT DRAG"
                action = "Capital Preservation / Risk-Off Overlay"
        else:
            light = "⚪ GRAY — NO EFFECT"
            action = "Null Accepted (Ignore Astrological Signal)"

        return {
            "signal_column": signal_col,
            "target_metric": metric_col,
            "traffic_light": light,
            "recommended_action": action,
            "active_days_sample": int(n_active),
            "arm_b0_baseline_mean": float(np.mean(arm_b0)),
            "arm_b1_matched_placebo_mean": float(np.mean(arm_b1)),
            "arm_b2_shifted_placebo_mean": float(np.mean(arm_b2)) if len(arm_b2) > 0 else None,
            "arm_a_active_overlay_mean": float(np.mean(arm_a)),
            "welch_t_stat": float(t_stat),
            "p_value": float(p_val),
            "is_statistically_significant": bool(p_val < 0.05)
        }

    def execute_full_pipeline(self) -> dict:
        """Executes all 5 Mundane Geopolitical rules for the equity."""
        if self.price_df is None:
            self.generate_price_and_ephemeris_history()

        r1 = self.run_multi_arm_backtest("Sig_M1_MarsSaturnConflict", "R30", higher_is_better=True)
        r2 = self.run_multi_arm_backtest("Sig_M2_StrategicEclipse", "DailyRange10", higher_is_better=False)
        r3 = self.run_multi_arm_backtest("Sig_M3_SolarIngress", "R30", higher_is_better=True)
        r4 = self.run_multi_arm_backtest("Sig_M4_SBCGeopoliticalVedha", "MDD15", higher_is_better=False)
        r5 = self.run_multi_arm_backtest("Sig_M5_RohiniShakataBheda", "R60", higher_is_better=True)

        summary = {
            "metadata": {
                "ticker": self.ticker,
                "company_name": self.company_name,
                "sub_sector": self.sub_sector,
                "listing_date": self.listing_dt,
                "execution_timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            },
            "mundane_geopolitical_rule_evaluations": {
                "Rule_M1_Mars_Saturn_Conflict_Conjunction": r1,
                "Rule_M2_Strategic_Eclipse_Volatility": r2,
                "Rule_M3_Major_Solar_Ingress_Order_Momentum": r3,
                "Rule_M4_SBC_Papa_Vedha_Supply_Chain_Risk": r4,
                "Rule_M5_Rohini_Shakata_Bheda_Defense_Spike": r5
            }
        }
        self.results = summary
        return summary

if __name__ == "__main__":
    engine = MundaneGeopoliticalBacktestEngine(
        ticker="HAL",
        company_name="Hindustan Aeronautics Ltd.",
        sub_sector="Defense & Aerospace",
        listing_dt="2018-03-28"
    )
    res = engine.execute_full_pipeline()
    print("=== MUNDANE GEOPOLITICAL BACKTEST ENGINE (TRACK 3) ===")
    print(json.dumps(res, indent=2))
