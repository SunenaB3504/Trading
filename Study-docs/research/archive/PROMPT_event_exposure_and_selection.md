# Research prompt: event-exposure layer and selection filter

*Paste the block below into a standalone research chat with web access. It is self-contained. The goal is to feed section 6.9 (event-exposure layer) and section 4.10 (selection design) of the Dual-Mode Mock Trading Platform concept note.*

```text
ROLE
You are a research assistant for a pre-registered paper-trading experiment. You are NOT giving investment advice and you are NOT evaluating astrology. Your job is to document, with sources, how to build an objective, non-astrological "event-exposure" ranker for stocks, and what is known about how fast and how strongly markets react to wars, aggression and natural calamities.

CONTEXT
- A user has a pre-screened set of about 10 buy candidates and 10 sell candidates (Indian listed equities, primarily). They want a registered, rule-based layer that, given real-world events (armed conflict, border or maritime tension, sanctions, natural disasters, commodity or fuel supply shocks, pandemics), ranks which candidates are most or least exposed.
- Example chain: a war in West Asia -> fuel supply crunch and higher crude -> higher input costs, freight and inflation in India -> some sectors benefit, some lose, and regulated pricing can break the transmission.
- Geographic scope: own country (India), major economies, and "problematic regions" (conflict-prone or supply-critical regions).
- The layer must be point-in-time (only information available at the decision date, allowing for publication lags), fixed before testing (no hindsight mapping), and objective (numeric triggers, not judgment).

WHAT TO RESEARCH (cover all, in this order)
A. OBJECTIVE EVENT DATA. For each dataset or index below and any better ones you find: publisher, what it measures, frequency, coverage (countries, years), publication lag, revisions, licence and cost, access method, and known weaknesses. Candidates to check (verify, do not assume): the Caldara-Iacoviello Geopolitical Risk Index; ACLED; UCDP; GDELT; EM-DAT (disasters); India-specific sources for disasters and weather (NDMA, IMD); fuel and commodity price series (including India's official petroleum price data); official administered-price notifications; sanctions and trade-restriction trackers; shipping and freight indices.
B. TRIGGER DEFINITIONS. Propose numeric or flagged trigger rules for each event class (conflict outbreak, escalation, sanctions, disaster severity, supply shock), with the thresholds used in the literature.
C. TRANSMISSION AND EXPOSURE. How do analysts and academics map event shocks to sector and stock exposure? Document fundamentals-based fields (oil intensity, import or export share, input dependence, pricing power, regulated pricing, FX exposure, balance-sheet leverage) and where each can be sourced for Indian listed companies. Include how administered fuel prices in India alter the crude-to-retail pass-through, with sources.
D. EVIDENCE ON REACTION SPEED AND SIZE. Summarise event-study and other peer-reviewed evidence on how quickly and how much equity markets react to wars, terrorist attacks, geopolitical-risk spikes and natural disasters, with emphasis on India and emerging markets. State the horizon at which effects are largely priced in, and whether any post-event drift exists.
E. EXISTING RANKING PRACTICE. Is there published work or industry practice on ranking stocks by event or geopolitical exposure (factor models, scenario analysis, exposure scores)? Summarise methods, data, results, and known failure modes (overfitting, hindsight, regime change).
F. COUNTRY AND REGION LISTS. Propose objective criteria (not opinions) for "major economies" and "problematic regions", and a starting list with the criteria applied and sources.
G. SELECTION-TEST DESIGN. For a cross-sectional test of "does a ranker choose candidates with higher forward excess return", list the standard metrics and tests (rank information coefficient, top-minus-bottom spread, within-date permutation, block bootstrap, multiple-testing correction), the sample-size guidance, and common pitfalls.
H. (Short, last) MUNDANE-ASTROLOGY CLAIMS ABOUT EVENTS. List, with citations, the specific claims practitioners make about predicting wars, calamities or market reactions (eclipse, ingress and lunation charts, and similar), stating for each whether it is computable from an ephemeris, and whether any independent empirical test exists. Do not endorse any claim.

HARD RULES
- Use real sources and cite each claim (title, author or publisher, year, URL if available). If you cannot verify something, write NOT VERIFIED and say what you tried. Never invent a dataset, index value, URL, threshold or statistic.
- Separate (a) what a source states, (b) your interpretation, (c) anything speculative.
- Tag every claim: [C] cited and checked; [V] unverified or disputed; [X] no source found.
- Give licence terms and costs exactly as published; if unclear, say so.
- If the answer is too long, deliver it in numbered parts ("Part 1 of N") and wait for me to say "continue".

OUTPUT FORMAT
1. Executive summary (what is solid, what is not, what a minimal viable exposure map needs).
2. Dataset table (A), with a recommended minimum set.
3. Trigger rule proposals (B).
4. Exposure-map field list with data sources (C).
5. Evidence summary on reaction speed (D) and ranking practice (E).
6. Proposed country and region criteria and starting lists (F).
7. Test-design notes (G).
8. Mundane-astrology claims table (H).
9. Open questions I must decide myself.
10. Bibliography with a one-line reliability note for each source.
Prefer a shorter report with verified content over a longer one filled with plausible text.
```
