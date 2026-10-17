# Reference data

Small tables the bucket rules need (WP-2.7). Raw PDFs are not stored; their SHA-256 is recorded so the source can be checked.

## `amfi/`: AMFI half-yearly average market capitalisation

One CSV per six-month period, extracted from AMFI's PDF with `tools/amfi_extract.py` (about 90 seconds per file). Columns: `rank`, `name`, `isin`, `bse_symbol`, `nse_symbol`, `avg_mcap_cr` (Rs crore), `category`. Rank 1 to 100 is large cap, 101 to 250 mid cap, 251 onward small cap (SEBI circular of 6 Oct 2017).

Known limits:

- **Missing periods:** 2020 H1, 2020 H2, 2021 H1 and 2021 H2 could not be found at any URL pattern tried. Windows in that stretch show size as unknown. If you can download those four PDFs, give me the files or links and run `python tools/amfi_extract.py <urls.json> data/amfi`.
- **ISINs:** wrapped company names corrupt the ISIN cell in some rows (1% to 29% in 2018 H1, under 2% elsewhere). Those rows keep their NSE and BSE symbols and are matched by symbol, so a stock renamed since the list was published can miss.
- **Publication date:** not verified. The code assumes a list is usable 31 days after its period end (T16).
- **Spacing glitch:** the PDFs sometimes print numbers as "1 8,73,294.72"; the extractor removes the stray space.

| Period | Rows | PDF sha256 (start) | Source |
| ------ | ------ | ------ | ------ |
| 2017H2 | 3452 | `f8b547f8a5f07397...` | https://www.amfiindia.com/Themes/Theme1/downloads/Avg.%20Market%20Capitalization%20of%20listed%20companies%20during%20-Jul-Dec%202017.pdf |
| 2018H1 | 5077 | `d04c0529ee96bb79...` | https://www.amfiindia.com/Themes/Theme1/downloads/Avg.%20Market%20Capitalization%20of%20listed%20companies%20during%20-Jan-June%202018.pdf |
| 2018H2 | 4895 | `349cf73c46451ac7...` | https://www.amfiindia.com/Themes/Theme1/downloads/Avg.%20Market%20Capitalization%20of%20listed%20companies%20during%20Jul-Dec%202018.pdf |
| 2019H1 | 4955 | `73f7d5a9fb3ec5a7...` | https://www.amfiindia.com/Themes/Theme1/downloads/Avg.%20Market%20Capitalization%20of%20listed%20companies%20during%20-Jan-June%202019.pdf |
| 2019H2 | 4992 | `7f02cba5819bb5e7...` | https://www.amfiindia.com/Themes/Theme1/downloads/Avg.%20Market%20Capitalization%20of%20listed%20companies%20during%20Jul-Dec%202019.pdf |
| 2022H1 | 5057 | `89564393bb89f619...` | https://www.amfiindia.com/Themes/Theme1/downloads/AverageMarketCapitalizationoflistedcompaniesduringthesixmonthsended30June2022.pdf |
| 2022H2 | 5072 | `b9de7af929b4362e...` | https://www.amfiindia.com/Themes/Theme1/downloads/AverageMarketCapitalizationoflistedcompaniesduringthesixmonthsended31Dec2022.pdf |
| 2023H1 | 5063 | `2c4f832cc516e404...` | https://www.amfiindia.com/Themes/Theme1/downloads/AverageMarketCapitalizationoflistedcompaniesduringthesixmonthsended30Jun2023.pdf |
| 2023H2 | 5012 | `71fd9199922007e7...` | https://www.amfiindia.com/Themes/Theme1/downloads/AverageMarketCapitalizationoflistedcompaniesduringthesixmonthsended31Dec2023.pdf |
| 2024H1 | 5049 | `d8286e356c7e9c47...` | https://www.amfiindia.com/Themes/Theme1/downloads/AverageMarketCapitalization30Jun2024.pdf |
| 2024H2 | 5097 | `07990bce7c06310c...` | https://www.amfiindia.com/Themes/Theme1/downloads/AverageMarketCapitalizationoflistedcompaniesduringthesixmonthsended31Dec2024.pdf |
| 2025H1 | 5154 | `bb166eaa42593d6c...` | https://www.amfiindia.com/Themes/Theme1/downloads/AverageMarketCapitalization30Jun2025.pdf |
| 2025H2 | 5372 | `d2dac238812cd32f...` | https://www.amfiindia.com/Themes/Theme1/downloads/AverageMarketCapitalization31Dec2025.pdf |
| 2026H1 | 5427 | `77d2a536e01c7f43...` | https://portal.amfiindia.com/spages/AverageMarketCapitalization30Jun2026.pdf |

## `sector/sector_tags_v1.csv`

70 NSE symbols tagged with the sector names used by the cyclicals and mundane buckets. Written by the assistant from company business descriptions; owner review pending (T17). A current classification applied to past windows. Names not in the table get no sector.
