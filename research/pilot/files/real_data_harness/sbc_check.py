"""
Daily Sarvatobhadra check for one listing (Narpati basis, sarvatobhadra_engine_v3).

  python sbc_check.py --listing 2019-04-16 --time 10:00 [--date 2026-10-14] [--lat 18.92 --lon 72.83]

Prints: natal Moon nakshatra and rashi, which planets strike them today, malefic count, whether the registered
Rule-4 signal (>= 2 malefics on the janma nakshatra) is ON, and Latta hits on the janma star.
Positions are taken at 09:15 IST. The first-trade time is an input you must verify; it drives everything.
This tool reports geometry only. The classical texts make no market claims, and the tests found no edge.
"""
import argparse, datetime as dt
import swisseph as swe
import sarvatobhadra_engine_v3 as E

RASHI = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", "Tula", "Vrischika", "Dhanus", "Makara", "Kumbha", "Meena"]

def main():
    a = argparse.ArgumentParser()
    a.add_argument("--listing", required=True, help="YYYY-MM-DD of first trade")
    a.add_argument("--time", default="10:00", help="HH:MM IST of first trade")
    a.add_argument("--date", default=dt.date.today().isoformat())
    a.add_argument("--school", default="N", choices=["N", "H", "ALL3"])
    a = a.parse_args()
    t = dt.datetime.fromisoformat(f"{a.listing} {a.time}") - dt.timedelta(hours=5, minutes=30)
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    j = swe.julday(t.year, t.month, t.day, t.hour + t.minute / 60)
    moon = swe.calc_ut(j, 1, swe.FLG_MOSEPH | swe.FLG_SIDEREAL)[0][0] % 360
    nak, rashi = E.nakshatra28(moon), RASHI[int(moon // 30)]
    d = dt.date.fromisoformat(a.date); snap = E.daily_snapshot(d)
    print(f"Natal Moon {moon:.2f} deg: nakshatra {nak} (pada {E.pada(moon)}), rashi {rashi}")
    print(f"Date {d}  school {a.school}\n")
    on_nak, on_rashi, latta_hits = [], [], []
    for p, v in snap.items():
        s = E.sbc_strikes(p, v["lon"], v["speed"], snap["Sun"]["lon"], school=a.school)
        kr = E.is_krura(p, snap)
        tag = "krura" if kr else "saumya"
        hit_n = nak in s["labels"] and s["nakshatra"] != nak
        hit_r = rashi in s["labels"]
        if hit_n: on_nak.append((p, kr))
        if hit_r: on_rashi.append((p, kr))
        lt = "-" if p == "Ketu" else E.latta(p, E.N27[E.nakshatra27(v["lon"])])
        if lt == (E.N27[E.nakshatra27(moon)] if nak != "Abhijit" else nak): latta_hits.append(p)
        print(f"  {p:8s} {tag:7s} in {s['nakshatra']:12s} motion {s['motion']:6s} strikes {len(s['cells']):2d} cells"
              f"{'  <-- janma nakshatra' if hit_n else ''}{'  <-- moon rashi' if hit_r else ''}")
    k = sum(1 for _, kr in on_nak if kr)
    print(f"\nJanma nakshatra struck by {len(on_nak)} planet(s); malefic count {k} -> outcome text: {E.outcome_for_count(k) if k else 'none'}")
    print("Rule-4 registered signal (>=2 malefics on janma nakshatra):", "ON" if k >= 2 else "OFF")
    print(f"Moon rashi {rashi} struck by {len(on_rashi)} planet(s); malefic {sum(1 for _, kr in on_rashi if kr)} (rashi target not backtested)")
    print("Latta falls on janma star from:", latta_hits or "none")

main()
