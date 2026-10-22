"""Writes data/names/universe_v2_names.csv: a DRAFT of the legal name of each universe-v2 company.

Written by the assistant from general knowledge on 2026-10-22; it is not a data source. H-21 reads the first
syllable of the legal name in force on each date (FR-U8), so a wrong name can change a company's star. The owner
reviews it. Each row: instrumentId, legalName, effectiveFrom, effectiveTo (empty = open), confidence
(high = the name I am sure of for the whole period, check = a rename I am not sure of, unknown = I do not know the
company), note.
"""
import csv
import json
import sys

# symbol -> list of (legalName, from, to, confidence, note)
OPEN = ''
NAMES = {
    'ABAN': [('Aban Offshore Limited', OPEN, OPEN, 'high', '')],
    'ADANITRANS': [('Adani Transmission Limited', OPEN, OPEN, 'high', 'Renamed Adani Energy Solutions Limited in 2023; same first syllable, so no second row')],
    'AIFL': [('', OPEN, OPEN, 'unknown', 'Company not identified; H-21 gives no signal until a name is supplied')],
    'ARVIND': [('Arvind Limited', OPEN, OPEN, 'high', '')],
    'ASIANPAINT': [('Asian Paints Limited', OPEN, OPEN, 'high', '')],
    'BAJAJ-AUTO': [('Bajaj Auto Limited', OPEN, OPEN, 'high', '')],
    'BANKBARODA': [('Bank of Baroda', OPEN, OPEN, 'high', '')],
    'BATAINDIA': [('Bata India Limited', OPEN, OPEN, 'high', '')],
    'BEPL': [('Bhansali Engineering Polymers Limited', OPEN, OPEN, 'high', '')],
    'BRITANNIA': [('Britannia Industries Limited', OPEN, OPEN, 'high', '')],
    'CAPF': [('Capital First Limited', OPEN, OPEN, 'high', 'Merged into IDFC First Bank in December 2018')],
    'CHAMBLFERT': [('Chambal Fertilisers and Chemicals Limited', OPEN, OPEN, 'high', '')],
    'CHENNPETRO': [('Chennai Petroleum Corporation Limited', OPEN, OPEN, 'high', '')],
    'COLPAL': [('Colgate-Palmolive (India) Limited', OPEN, OPEN, 'high', '')],
    'CYIENT': [('Cyient Limited', OPEN, OPEN, 'high', '')],
    'DABUR': [('Dabur India Limited', OPEN, OPEN, 'high', '')],
    'DCBBANK': [('DCB Bank Limited', OPEN, OPEN, 'high', '')],
    'DHFL': [('Dewan Housing Finance Corporation Limited', OPEN, OPEN, 'high', '')],
    'DLF': [('DLF Limited', OPEN, OPEN, 'high', '')],
    'EDELWEISS': [('Edelweiss Financial Services Limited', OPEN, OPEN, 'high', '')],
    'EQUITAS': [('Equitas Holdings Limited', OPEN, OPEN, 'high', '')],
    'GMRINFRA': [('GMR Infrastructure Limited', OPEN, OPEN, 'high', 'Renamed GMR Airports Infrastructure Limited; same first syllable, so no second row')],
    'GREAVESCOT': [('Greaves Cotton Limited', OPEN, OPEN, 'high', '')],
    'HCLTECH': [('HCL Technologies Limited', OPEN, OPEN, 'high', '')],
    'HDFC': [('Housing Development Finance Corporation Limited', OPEN, OPEN, 'high', 'Merged into HDFC Bank in July 2023')],
    'HEROMOTOCO': [('Hero MotoCorp Limited', OPEN, OPEN, 'high', '')],
    'HINDOILEXP': [('Hindustan Oil Exploration Company Limited', OPEN, OPEN, 'high', '')],
    'HINDPETRO': [('Hindustan Petroleum Corporation Limited', OPEN, OPEN, 'high', '')],
    'HINDZINC': [('Hindustan Zinc Limited', OPEN, OPEN, 'high', '')],
    'HSCL': [('Himadri Speciality Chemical Limited', OPEN, OPEN, 'high', '')],
    'IBREALEST': [('Indiabulls Real Estate Limited', OPEN, OPEN, 'check', 'Renamed later; the new name and date are not known to me. If its first syllable differs, add a row')],
    'IDBI': [('IDBI Bank Limited', OPEN, OPEN, 'high', '')],
    'IDFC': [('IDFC Limited', OPEN, OPEN, 'high', 'Later IDFC Financial Holding Company; same first syllable')],
    'IFCI': [('IFCI Limited', OPEN, OPEN, 'high', '')],
    'INDUSINDBK': [('IndusInd Bank Limited', OPEN, OPEN, 'high', '')],
    'INTELLECT': [('Intellect Design Arena Limited', OPEN, OPEN, 'high', '')],
    'IOC': [('Indian Oil Corporation Limited', OPEN, OPEN, 'high', '')],
    'IPCALAB': [('Ipca Laboratories Limited', OPEN, OPEN, 'high', '')],
    'JISLJALEQS': [('Jain Irrigation Systems Limited', OPEN, OPEN, 'high', '')],
    'JKTYRE': [('JK Tyre & Industries Limited', OPEN, OPEN, 'high', '')],
    'KAJARIACER': [('Kajaria Ceramics Limited', OPEN, OPEN, 'high', '')],
    'KARURVYSYA': [('Karur Vysya Bank Limited', OPEN, OPEN, 'high', '')],
    'KEC': [('KEC International Limited', OPEN, OPEN, 'high', '')],
    'KOTAKBANK': [('Kotak Mahindra Bank Limited', OPEN, OPEN, 'high', '')],
    'KPIT': [
        ('KPIT Technologies Limited', OPEN, '2019-01-23', 'check', 'This ISIN (INE836A01035) passed to Birlasoft Limited after the merger; date taken from the price-adjustment day in our data (BSOFT, 2019-01-24)'),
        ('Birlasoft Limited', '2019-01-24', OPEN, 'check', 'See the row above'),
    ],
    'KSCL': [('Kaveri Seed Company Limited', OPEN, OPEN, 'high', '')],
    'L&TFH': [('L&T Finance Holdings Limited', OPEN, OPEN, 'high', 'Later renamed L&T Finance Limited; same first syllable')],
    'LUXIND': [('Lux Industries Limited', OPEN, OPEN, 'high', '')],
    'M&M': [('Mahindra & Mahindra Limited', OPEN, OPEN, 'high', '')],
    'M&MFIN': [('Mahindra & Mahindra Financial Services Limited', OPEN, OPEN, 'high', '')],
    'MARUTI': [('Maruti Suzuki India Limited', OPEN, OPEN, 'high', '')],
    'MCX': [('Multi Commodity Exchange of India Limited', OPEN, OPEN, 'high', '')],
    'MEGH': [('', OPEN, OPEN, 'unknown', 'Company not identified; H-21 gives no signal until a name is supplied')],
    'MGL': [('Mahanagar Gas Limited', OPEN, OPEN, 'high', '')],
    'MRF': [('MRF Limited', OPEN, OPEN, 'high', '')],
    'MRPL': [('Mangalore Refinery and Petrochemicals Limited', OPEN, OPEN, 'high', '')],
    'MUTHOOTFIN': [('Muthoot Finance Limited', OPEN, OPEN, 'high', '')],
    'NESTLEIND': [('Nestle India Limited', OPEN, OPEN, 'high', '')],
    'NTPC': [('NTPC Limited', OPEN, OPEN, 'high', '')],
    'OFSS': [('Oracle Financial Services Software Limited', OPEN, OPEN, 'high', '')],
    'OIL': [('Oil India Limited', OPEN, OPEN, 'high', '')],
    'OMAXE': [('Omaxe Limited', OPEN, OPEN, 'high', '')],
    'ORIENTBANK': [('Oriental Bank of Commerce', OPEN, OPEN, 'high', 'Merged into Punjab National Bank in April 2020')],
    'PIDILITIND': [('Pidilite Industries Limited', OPEN, OPEN, 'high', '')],
    'PNB': [('Punjab National Bank', OPEN, OPEN, 'high', '')],
    'POWERGRID': [('Power Grid Corporation of India Limited', OPEN, OPEN, 'high', '')],
    'PRAKASH': [('Prakash Industries Limited', OPEN, OPEN, 'high', '')],
    'PVR': [('PVR Limited', OPEN, OPEN, 'high', 'Renamed PVR INOX Limited in 2023; same first syllable')],
    'RAYMOND': [('Raymond Limited', OPEN, OPEN, 'high', '')],
    'RELCAPITAL': [('Reliance Capital Limited', OPEN, OPEN, 'high', '')],
    'REPCOHOME': [('Repco Home Finance Limited', OPEN, OPEN, 'high', '')],
    'RPOWER': [('Reliance Power Limited', OPEN, OPEN, 'high', '')],
    'SIEMENS': [('Siemens Limited', OPEN, OPEN, 'high', '')],
    'SUNTECK': [('Sunteck Realty Limited', OPEN, OPEN, 'high', '')],
    'THOMASCOOK': [('Thomas Cook (India) Limited', OPEN, OPEN, 'high', '')],
    'TINPLATE': [('The Tinplate Company of India Limited', OPEN, OPEN, 'check', 'The legal name starts with "The". Decide whether a leading "The" counts as the first syllable (the table rule says legal name as written)')],
    'TIRUMALCHM': [('Tirumalai Chemicals Limited', OPEN, OPEN, 'high', '')],
    'ULTRACEMCO': [('UltraTech Cement Limited', OPEN, OPEN, 'high', '')],
    'VGUARD': [('V-Guard Industries Limited', OPEN, OPEN, 'high', '')],
    'VIJAYABANK': [('Vijaya Bank', OPEN, OPEN, 'high', 'Merged into Bank of Baroda in April 2019')],
    'WIPRO': [('Wipro Limited', OPEN, OPEN, 'high', '')],
    'YESBANK': [('Yes Bank Limited', OPEN, OPEN, 'high', '')],
    'ZEEL': [('Zee Entertainment Enterprises Limited', OPEN, OPEN, 'high', '')],
}

frozen = json.load(open('data/frozen/universe_v2.json', encoding='utf-8'))
members = {m['symbol']: m['instrumentId'] for m in frozen['members']}
missing = sorted(set(members) - set(NAMES))
extra = sorted(set(NAMES) - set(members))
if missing or extra:
    sys.exit(f'missing {missing}; not in universe {extra}')
with open('data/names/universe_v2_names.csv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f, lineterminator='\n')
    w.writerow(['instrumentId', 'legalName', 'effectiveFrom', 'effectiveTo', 'confidence', 'note'])
    for sym in sorted(NAMES):
        for name, start, end, conf, note in NAMES[sym]:
            w.writerow([members[sym], name, start, end, conf, note])
print(sum(len(v) for v in NAMES.values()), 'rows for', len(NAMES), 'companies')
