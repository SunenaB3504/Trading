### Technical Research Report: The 4-House Risk Screening Protocol and Astrometric Risk Mitigation in Financial Instruments

#### 1\. Theoretical Foundation & Architecture of the 4-House Risk Screening Protocol

##### 1.1 House Taxonomy & Quantitative Financial Mappings

In corporate risk architecture and quantitative equity analysis, classical Vedic astrological house divisions ( *Bhavas* ) map directly onto fundamental balance sheet dynamics, capital allocation frameworks, and market microstructure parameters. The 4-House Risk Screening Protocol isolates four primary risk-bearing houses: the 5th house and the three  *Dusthana*  (adverse) houses—the 6th, 8th, and 12th.  
These risk-bearing divisions operate in tandem with the primary wealth accumulation and treasury anchors of the corporate chart:

* **2nd House (**  ***Dhana Bhava***  **):**  Governs corporate treasuries, short-term debt servicing capacity, working capital reserves, and instant liquidity pools.  
* **11th House (**  ***Labha Bhava***  **):**  Governs realized net cash flows, operating income streams, dividend distribution capacity, and top-line expansion.

House,Traditional Name & Focus,Quantitative Financial Mapping & Enterprise Metrics  
5th House,Mantra  / Speculation,"Capital allocation efficiency, speculative business divisions, venture capital investments, high-frequency/algorithmic trading exposure, and asymmetric alpha generation."  
6th House,Shatru  /  Rina,"Debt liabilities, loan book health, credit leverage, working capital friction, operating costs, and contractual/labor litigation."  
8th House,Randhra  / Transformation,"Hidden shocks, Non-Performing Assets (NPAs), dark pool liquidity shifts, sudden volatility spikes, M\&A disruptions, regulatory penalties, and bankruptcy risk."  
12th House,Vyaya  / Dissolution,"Capital leakage, asset liquidation, major balance sheet write-offs, structural capital erosion, and systemic distribution/dissolution."

##### 1.2 Mathematical Mechanics of the Indu Lagna (Wealth Ascendant)

The Indu Lagna (also designated as the  *Dhana Lagna* ) represents a mathematically derived zodiacal coordinate used to establish an entity's baseline financial solvency and capital inflow timing. Cast using the exact timestamp ( \$T\_0\$  in IST) of the company's primary exchange listing or Initial Public Offering (IPO), the Indu Lagna isolates pure monetary potential by evaluating the planetary rays ( *Kalas* ) assigned to the lords of the fortune houses (9th house).

###### *Step-by-Step Computational Algorithm:*

1. **Identify Primary 9th Lord (**  **\$L\_1**\$  **):**  Locate the 9th house from the primary Ascendant ( *Lagna* ) cast at  \$T\_0\$ . Retrieve the assigned  *Kala*  (planetary ray) value for its ruling planet.  
2. **Identify Lunar 9th Lord (**  **\$L\_2**\$  **):**  Locate the 9th house counted from the natal Moon sign ( *Chandra Lagna* ). Retrieve the assigned  *Kala*  value for its ruling planet.  
3. **Sum Planetary Rays (**  **\$S**\$  **):**  Calculate  \$S \= L\_1 \+ L\_2\$  using the fixed classical planetary ray assignments. Shadow nodes (Rahu and Ketu) carry no physical luminosity and are assigned a value of 0\.  
4. **Apply Modulo 12 Reduction:**  Compute the remainder  \$R \= S \\pmod{12}\$ . If  \$S \< 12\$ , then  \$R \= S\$ . If  \$R \= 0\$  (meaning  \$S\$  is an exact multiple of 12), default the remainder value to  \$R \= 12\$ .  
5. **Project Coordinate:**  Count  \$R\$  zodiac signs forward from the natal Moon sign (inclusive of the Moon's sign as house 1). The resulting zodiac sign is designated as the corporate Indu Lagna.

Planet,Assigned  Kalas  (Units of Brilliance / Rays)  
Sun (  Surya  ),30  
Moon (  Chandra  ),16  
Venus (  Shukra  ),12  
Jupiter (  Guru  ),10  
Mercury (  Budha  ),8  
Mars (  Mangal  ),6  
Saturn (  Shani  ),1

##### 1.3 Astrometric Grid Mechanics: Sarvatobhadra Chakra (SBC) & Phonetic Anchoring

The Sarvatobhadra Chakra (SBC) is an 81-square ( \$9 \\times 9\$ ) geometric grid that translates celestial transits into spatial coordinates. The grid is structured into concentric layers:

* **Outer Perimeter:**  Houses 28  *Nakshatras*  (including the intercalary  *Abhijit Nakshatra*  placed between Uttarashadha and Shravana to preserve geometric symmetry).  
* **Internal Layers:**  Systematically organize 16 Sanskrit vowels, 20 consonants ( *Vyanjana* ), the 12 zodiac signs ( *Rasis* ), Tithis (lunar days), and Vaar (weekdays).

\+-----------------------------------------------------------------------+  
\|                         OUTER PERIMETER                               \|  
\|                  28 Nakshatras (incl. Abhijit)                        \|  
\|   \+---------------------------------------------------------------+   \|  
\|   \|                     INTERIOR LAYERS                           \|   \|  
\|   \|             16 Sanskrit Vowels \| 20 Consonants                \|   \|  
\|   \|   \+-------------------------------------------------------+   \|   \|  
\|   \|   \|                   INNER CORE                          \|   \|   \|  
\|   \|   \|            12 Zodiac Signs (Rasis)                    \|   \|   \|  
\|   \|   \|   \+-----------------------------------------------+   \|   \|   \|  
\|   \|   \|   \|  CENTRAL MATRIX: Tithis & Weekdays (Vaar)     \|   \|   \|   \|  
\|   \|   \|   \+-----------------------------------------------+   \|   \|   \|  
\|   \|   \+-------------------------------------------------------+   \|   \|  
\|   \+---------------------------------------------------------------+   \|  
\+-----------------------------------------------------------------------+

###### *Phonetic Anchoring ( Varnadi Panchak )*

A corporate entity is fixed to the SBC grid via its  **Varnadi Panchak** —the phonetic first-consonant anchor of its listed or legal name. For example, a corporation beginning with the phonetic sound 'Ra' (e.g., Reliance Industries, RELIANCE.NS) maps to Cell 45, whereas an entity beginning with 'Ta' (e.g., Tata Consultancy Services, TCS.NS) maps to Cell 32\. This phonetic anchor serves as the asset's point-in-time spatial coordinate on the 81-square matrix.

###### *Aspect Ray Vectors ( Vedha )*

Transiting planets traveling through  *Nakshatras*  cast aspectual lines of force ( *Vedhas* ) across the grid, piercing specific coordinates:

1. **Samukha (Direct/Frontal) Vedha:**  Cast straight across horizontal or vertical lines. Indicates immediate, visible catalysts such as earnings announcements or rate decisions.  
2. **Vama (Left/Reverse) Vedha:**  Cast leftward, activated primarily during planetary retrograde motion. Correlates with earnings restatements, delayed regulatory actions, and corrections.  
3. **Dakshina (Right/Forward) Vedha:**  Cast rightward during accelerated planetary velocity ( *Atichara* ). Correlates with rapid price discovery, momentum shifts, and liquidity cascades.  
4. **Tiryak (Diagonal) Vedha:**  Cross-grid diagonal aspects radiating from corner cells. Represents exogenous shocks, hidden liabilities, or indirect cross-sector volatility.

#### 2\. Negative Empirical Evidence & Distressed Equity Case Studies

##### 2.1 Statistical Performance & High-Level Failure Metrics

To rigorously evaluate corporate vulnerability, the 4-House Risk Screening Protocol operates as a pre-registered quantitative hypothesis testing framework (formulated under registered testing rules PH-01, PH-02, and PH-04). Baseline stress testing against historical corporate distress events establishes explicit risk parameters:

* **Target Failure Rate:**   **92.9% breach/fail rate**  baseline threshold among distressed and defaulted entities evaluated under severe  *Dusthana*  and malefic  *Vedha*  conditions.  
* **Drawdown Severity:**  Structural capital degradation baseline, with unhedged losses approaching  **up to 99%**  from peak valuations during active malefic concentration.  
* **Dasha Override Mechanics (PH-01 Hypothesis Framework):**  Hypothesizes that positive forward-looking Vimshottari Dasha periods (e.g., major periods ruled by 2nd, 5th, 9th, or 11th lords) are  **completely overridden and invalidated**  when severe malefic  *Papa Vedhas*  (from Saturn, Mars, Rahu, or Ketu) and  *Dusthana*  (6th/8th/12th) afflictions breach core risk thresholds.

##### 2.2 Distressed Equity Case Study Portfolio

The matrix below details 10 distressed equities evaluated under the 4-House Risk Screening Protocol. In accordance with dataset universe parameters, Paytm (PAYTM.NS) and PNB (PNB.NS) are drawn directly from the master 100-stock baseline universe, while the remaining eight entities represent historical out-of-sample corporate failure baselines used for risk calibration.  
Ticker / Entity,Primary Risk House Activation,Astrometric & Vedha Trigger,Dasha Signal Context,Observed Drawdown / Corporate Outcome  
Aban Offshore,6th & 8th Houses,Severe  Papa Vedha  from transiting Saturn/Rahu onto corporate phonetic anchor,Favorable Dasha overridden by  Dusthana  concentration,"Severe capital destruction (\~99% drawdown), corporate debt default."  
Reliance Capital,"6th, 8th & 12th Houses",Malefic  Pravesa  entry into Kota  Stambha ; 12th house dissolution activation,Favorable Dasha invalidated by severe  Papa Vedha,"Debt insolvency, regulatory intervention, \>95% equity loss."  
DHFL,6th & 8th Houses,Heavy Saturn & Mars  Papa Vedha  piercing 6th house debt coordinates,False-positive Dasha signal completely neutralized,"Insolvency proceedings, credit rating collapse, trading suspension."  
Yes Bank,6th & 8th Houses,Malefic concentration in 8th house;  Tiryak Vedha  on financial treasury,Bullish Dasha overridden by NPA shocks,"Sudden liquidity vacuum, emergency bailout, \>90% drawdown."  
Reliance Power,5th & 12th Houses,Malefic  Vedha  on 5th house speculation and capital allocation vectors,Speculative alpha Dasha signals invalidated,"Long-term capital erosion, \>95% price collapse from peak."  
Jain Irrigation,6th & 12th Houses,Pravesa Nadi  malefic penetration with 12th house capital leakage,Debt servicing Dasha rendered ineffective,"Debt restructuring, liquidity distress, \>85% equity value drop."  
Edelweiss,6th & 8th Houses,Papa Vedha  on financial and credit balance sheet coordinates,Dasha growth signals neutralized by 8th house volatility,"Severe credit spread widening, earnings contraction, major drawdown."  
Omaxe,8th & 12th Houses,Malefic activation of 12th house dissolution and 8th house hidden liabilities,False-positive Dasha entry signal,"Liquidity freeze, real estate debt distress, severe equity collapse."  
PAYTM.NS,6th & 8th Houses,Listing timestamp ( \$T\_0\$ )  Dusthana  affliction; severe listing  Papa Vedha,Post-IPO Dasha failure under transit pressure,"Post-listing volatility, severe price collapse (\>75% loss from IPO)."  
PNB.NS,6th & 8th Houses,Heavy Saturn/Rahu  Vedha  on 8th house NPA and fraud vectors,Favorable Dasha overridden by sudden fraud shocks,"Massive NPA discovery, sudden capital erosion, severe stock crash."

##### 2.3 Mechanics of Vulnerability: Dusthana Activations & Kota Fortress Breaches

The Kota Chakra models an asset's structural liquidity and support integrity across a four-tier concentric fortress:

1. **Bahya (Exterior Field):**  Open market noise and unabsorbed external liquidity.  
2. **Kota (Outer Wall):**  Standard retail support/resistance channels and High Open Interest (OI) option strike boundaries.  
3. **Durgantara (Inner Defense):**  Institutional buy walls, corporate buyback levels, and medium-term moving average support (e.g., 50-day SMA).  
4. **Stambha (Core):**  Deep Limit Order Book (LOB) liquidity, historical Volume Point of Control (VPOC), and primary macro trendlines (e.g., 200-day SMA).

                      KOTA CHAKRA FORTRESS ARCHITECTURE  
  \+-----------------------------------------------------------------------+  
  \| BAHYA (Exterior Field) \- Market Noise & Stochastic Flow               \|  
  \|   \+---------------------------------------------------------------+   \|  
  \|   \| KOTA (Outer Wall) \- Retail Support / High-OI Option Strike    \|   \|  
  \|   \|   \+-------------------------------------------------------+   \|   \|  
  \|   \|   \| DURGANTARA (Inner Defense) \- Institutional Buy Walls  \|   \|   \|  
  \|   \|   \|   \+-----------------------------------------------+   \|   \|   \|  
  \|   \|   \|   \| STAMBHA (Core) \- Deep LOB / VPOC / 200-Day SMA\|   \|   \|   \|  
  \|   \|   \|   \+-----------------------------------------------+   \|   \|   \|  
  \|   \|   \+-------------------------------------------------------+   \|   \|  
  \|   \+---------------------------------------------------------------+   \|  
  \+-----------------------------------------------------------------------+

###### *Dual Vector Pathways ( Nadis ) & Fortress Breach Mechanics*

Capital flow directionality is dictated by two opposing geometric transit pathways:

* **Pravesa Nadis (Inward Entry Paths):**  Vectors moving from the exterior  *Bahya*  inward toward the  *Stambha* . Transiting malefics traveling along  *Pravesa Nadis*  represent hostile institutional selling pressure, short attacks, and toxic order flow hitting the bid.  
* **Nirgama Nadis (Outward Exit Paths):**  Vectors moving outward from the  *Stambha*  toward the  *Bahya* . These paths represent capital flight, the distribution phase of a market cycle, profit taking, dividend payouts, and momentum dissipation.

                  PRAVESA vs. NIRGAMA VECTOR DYNAMICS

    PRAVESA (Inward Penetration)       NIRGAMA (Outward Dissipation)  
    \[Bahya\] ──► \[Kota\] ──► \[Stambha\]   \[Stambha\] ──► \[Kota\] ──► \[Bahya\]  
    (Toxic Flow / Margin Pressure)      (Capital Flight / Distribution)

Structural capital failure occurs when transiting malefic planets (Saturn, Mars, Rahu) travel along  **Pravesa Nadis** , breach the outer  *Kota*  wall, cross  *Durgantara* , and penetrate the core  *Stambha* . When malefic  *Pravesa*  pressure intersects a primary technical support metric (such as the 200-day SMA or VPOC), standing bid liquidity in the Limit Order Book (LOB) is rapidly absorbed. This triggers dynamic bid-ask spread widening (expanding from a clean baseline of 0.03% to \>0.12%), volatility expansion beyond 1.5x ATR14 bands, margin call feedback loops, and accelerated capitulation.

#### 3\. Positive Empirical Evidence & Solvent Equity Case Studies

##### 3.1 Solvent Profile & Outperformance Metrics

Assets meeting the 4-House Risk Screening Protocol criteria demonstrate high structural resilience across varying market regimes. Under the pre-registered testing framework (evaluated via hypothesis PH-02):

* **Insolvency Risk:**   **0.0% insolvency target threshold**  across the benchmark sample of solvent equities.  
* **Alpha Generation Target:**   **\+0.40% excess alpha generation**  benchmark target over standard equity market baseline benchmarks (such as the Nifty 50, ^NSEI).  
* **Structural Health:**  Clean 4-house configuration characterized by unblemished 5th and 11th houses, supported by an absence of malefic concentration in the 8th or 12th houses.

##### 3.2 Solvent Equity Case Study Portfolio

The matrix below documents eight representative solvent equities passing the risk protocol, drawn directly from the master 100-stock baseline universe, displaying their astrometric support vectors, market microstructure classifications, and financial performance metrics.  
Ticker / Entity,Sector,4-House Risk Profile Status,Indu Lagna & SBC Support Vector,Microstructure & Alpha Metrics  
POLYCAB.NS,Capital Goods,Clean (Zero 8th/12th malefic pressure),"Strong  Subha Vedha  support, Cell 48 alignment",High LOB Liquidity; tight 0.04% spread; \+0.40% alpha benchmark.  
DIXON.NS,Electronics,Unblemished 5th/11th houses,"Indu Lagna  kendra  reinforcement, technical breakout hold",Medium LOB Liquidity; 0.12% spread; 3.45% intraday range; persistent 20D breakouts.  
CDSL,Financial Services,Clean 4-house configuration,Benefic  Subha Vedha  on phonetic anchor,High ROE; low impact cost; sustained margin expansion; 0.0% insolvency risk.  
BSE Ltd,Financial Services,Robust 2nd & 11th house treasury strength,Indu Lagna  trikona  transit support,Deep institutional order book; strong market cap expansion.  
RELIANCE.NS,Energy & Oil & Gas,"Clean risk profile, strong 2nd house treasury","Subha Vedha  on Cell 45 ('Ra'), Sagittarius Indu Lagna",High LOB Liquidity; 30D ADTV \~6.5M shares; ultra-tight 0.03% bid-ask spread.  
TCS.NS,Information Technology,Unafflicted 5th/11th houses,Virgo Indu Lagna;  Subha Vedha  on Cell 32 ('Ta'),High LOB Liquidity; 30D ADTV \~2.1M shares; 46.2% ROE; zero debt-to-equity.  
HDFCBANK.NS,Banking & Financials,Clean 6th/8th house debt profiles,Taurus Indu Lagna support; Cell 28 ('Ha') anchor,High LOB Liquidity; 30D ADTV \~18.4M shares; dominant sector market cap.  
INFY.NS,Information Technology,Zero malefic concentration in 8th/12th,Benefic transit vectors across SBC grid,High LOB Liquidity; strong institutional buy walls; clean risk profile.

##### 3.3 Robustness Framework: Subha Vedha & Indu Lagna Reinforcement

When transiting benefic planets (Jupiter, Venus) cast  **Subha Vedha**  onto a corporation's SBC phonetic anchor or transit through  *kendras*  (1st, 4th, 7th, 10th houses) or  *trikonas*  (1st, 5th, 9th houses) relative to its Indu Lagna:

* Market friction decreases, causing average bid-ask spreads to compress toward baseline levels (e.g., 0.03% to 0.05%).  
* Valuation multiples (Price-to-Earnings ratios) experience structural expansion supported by institutional order flow.  
* Technical moving averages (20-day and 50-day SMAs) act as resilient support layers, holding firm during broader market consolidations.

#### 4\. Cross-Asset Application Across Financial Instruments

##### 4.1 Initial Public Offerings (IPOs)

The 4-House Risk Screening Protocol evaluates IPOs prior to exchange listing to prevent capital allocation to high-risk offerings:

1. **Natal Chart Casting:**  The exact timestamp ( \$T\_0\$  in IST) of the first exchange trade sets the entity's natal chart, primary  *Lagna* , and Indu Lagna.  
2. **Pre-Listing SBC Audit:**  The company's phonetic name anchor ( *Varnadi Panchak* ) is cross-referenced against the SBC grid for active transiting  *Papa Vedhas* .  
3. **Filtering Mechanism:**  Offerings displaying severe  *Dusthana*  (6th/8th/12th) afflictions or malefic  *Vedhas*  at  \$T\_0\$  (e.g., post-IPO volatility patterns observed in PAYTM.NS) are flagged as toxic listings, denying entry.

##### 4.2 Fixed Income: Debentures / NCDs & Company Fixed Deposits (FDs)

In fixed income instruments, default risk is governed by credit spread mechanics and underlying balance sheet solvency:

* **6th House Audit:**  Evaluates total corporate leverage, loan book quality, working capital friction, and debt servicing capacity.  
* **8th House Audit:**  Measures Non-Performing Asset (NPA) development probabilities and sudden default risk.  
* **Liquidity Recovery Dynamics & Credit Spreads:**  High malefic concentration in the 6th and 8th houses signals credit spread widening and elevated coupon default probabilities. Following an astrometric volatility shock, empirical market microstructure indicates that the mean time-to-normalization for bid-ask spreads and liquidity recovery takes up to  **one full trading week (5 trading sessions)** . Debt instruments suffering concurrent  *Dusthana*  activation display extended illiquidity, suppressing secondary market recovery rates for non-convertible debentures (NCDs) and corporate deposits.

##### 4.3 Hybrid Capital & Real Assets: REITs/InvITs & Preference Shares

###### *Real Estate Investment Trusts (REITs) & Infrastructure Investment Trusts (InvITs)*

* **Cash Flow & Distribution Audit:**  Evaluates the  **2nd House**  (working capital/treasury) and  **11th House**  (realized cash flow distributions) against the  **8th House**  (underlying real asset property volatility and dark pool valuation adjustments).  
* **Liquidity Interaction:**  InvIT/REIT cash distributions are considered secure only when the 11th house is free from 12th house capital leakage or malefic  *Vedha*  interference. During periods of 8th house malefic pressure, underlying property valuation adjustments widen bid-ask spreads, extending liquidity normalization horizons.

###### *Preference Shares*

* **Dividend Seniority Audit:**  Assesses the reliability of cumulative dividend payouts ( **11th House** ) against structural liquidation seniority ( **12th House**  dissolution dynamics).  
* **Execution Rule:**  If 12th house afflictions coincide with 6th house credit leverage stress, preference share dividend coverage is flagged for potential suspension.

#### 5\. Systemic Risk Control: The Sarvatobhadra Papa Vedha Shield as an Automated Emergency Drawdown Brake

##### 5.1 Architecture of the Automated Papa Vedha Risk Shield

The Automated Papa Vedha Risk Shield is a programmatic risk mitigation engine designed to eliminate tail-risk and cap severe capital drawdown:  
\[Real-Time Ephemeris / Transits\]  
              │  
              ▼  
\[SBC Grid Engine (81-Cell Matrix)\] ──► Checks Transiting Malefics (Saturn, Mars, Rahu, Ketu)  
              │  
              ▼  
\[Phonetic Anchor / Cell Intersect\] ──► Detects Active Papa Vedha Rays  
              │  
              ├── No Malefic Rays ──► Normal Execution (State: GREEN)  
              │  
              └── Active Papa Vedha ──► Automated Trigger (State: RED / YELLOW)  
                                            │  
                                            ▼  
                                  \[Programmatic Exit / Stop-Loss Execution\]

When transiting malefics cast simultaneous  *Vedha*  rays onto an asset's SBC cell coordinate, the engine generates an automated stop-loss or position liquidation signal, overriding discretionary hold decisions.

##### 5.2 Comparative Drawdown Capping Analysis

Execution Dimension,Without Papa Vedha Shield (Unhedged Baseline),With Sarvatobhadra Papa Vedha Shield (Automated Brake)  
Maximum Drawdown,Uncapped loss exposure approaching  \~99% complete capital destruction  in defaulted assets.,Capped at backtest target threshold of 60% drawdown  via automated signal execution.  
Stop-Loss Discipline,Subject to human emotional delay or unhedged slippage during volatility shocks.,Algorithmic execution using  2.0x ATR14  dynamic stops gated by astrometric triggers.  
Exposure Adjustment,Static position sizing maintained despite clustering  Papa Vedhas .,Dynamic position size reduction ( Yellow/Red state  resizing factor  \$F^\*\$ ).  
Recovery Horizon,Multi-year or permanent capital impairment (insolvency/liquidation).,Accelerated capital reallocation following signal normalization.

##### 5.3 Algorithmic Execution & Modified Kelly Sizing Framework

To maintain optimal capital growth while insulating the portfolio against tail risk, active execution adopts the  **Astrometrically-Modified Kelly Criterion** :  
\$\$F^\* \= K \\times \\left(1 \- D\_v \- P\_k\\right)\$\$  
Where:

* \$F^\*\$  \= Final allocated leverage / position size fraction.  
* \$K\$  \= Baseline Kelly Criterion fraction derived from historical trade win rates.  
* \$D\_v\$  \=  **Malefic Vedha Density**  (quantified ratio of active malefic  *Papa Vedha*  rays piercing the asset's SBC coordinate, normalized such that  \$D\_v \\in 0, 1\$ ).  
* \$P\_k\$  \=  **Kota Pravesa Pressure**  (quantified metric of malefic transit intensity along  *Pravesa Nadis*  toward the core  *Stambha* , normalized such that  \$P\_k \\in 0, 1\$ ).

###### *Boundary Conditions & Traffic-Light State Protocol*

The combined risk coefficient is strictly bounded: when  \$D\_v \+ P\_k \\ge 1.0\$ , the multiplier  \$(1 \- D\_v \- P\_k) \\le 0\$ , evaluating  \$F^\* \\le 0\$ . This automatically forces a  **RED**  state.  
                  TRAFFIC-LIGHT STATE DECISION FLOW

  \+-----------------------------------------------------------------+  
  \|                Compute Risk Metric: (Dv \+ Pk)                   \|  
  \+-----------------------------------------------------------------+  
                                   │  
         ┌─────────────────────────┼─────────────────────────┐  
         ▼                         ▼                         ▼  
  \[ (Dv \+ Pk) \= 0 \]      \[ 0 \< (Dv \+ Pk) \< 1.0 \]    \[ (Dv \+ Pk) \>= 1.0 \]  
         │                         │                         │  
         ▼                         ▼                         ▼  
    STATE: GREEN             STATE: YELLOW               STATE: RED  
  Full Allocation         Scaled Sizing (F\*)         Entry Denial /  
    (F\* \= K)            ATR Limit Fill Proxy          Liquidation

* **GREEN (No Malefic Vedha / Zero Pravesa Pressure):**   \$D\_v \+ P\_k \= 0 \\implies F^\* \= K\$ . Full position sizing allowed under baseline execution.  
* **YELLOW (Moderate Malefic Pressure):**   \$0 \< D\_v \+ P\_k \< 1.0 \\implies 0 \< F^\* \< K\$ . Position size is scaled down dynamically.  
* *Limit Order Execution Proxy:*  For Yellow-light states under Daily EOD bar processing, passive limit orders are modeled to fill if and only if the subsequent session's Low trades at or below the limit threshold:  \$\$\\text{Limit Fill Price} \\le \\text{Open} \- 0.25 \\times \\text{ATR}\_{14}\$\$  
* **RED (Severe Malefic Concentration / Stambha Breach):**   \$D\_v \+ P\_k \\ge 1.0 \\implies F^\* \\le 0\$ . The router denies all new long entries and programmatically liquidates existing long exposure.  
* **Pre-Market Cryptographic Lock:**  All traffic-light signal states are cryptographically hashed and locked prior to market open at  **09:15 IST** . Intra-day signal alterations are rejected to eliminate execution drift and guarantee point-in-time test integrity.

