import io, json, os, zipfile

idx = [json.loads(l) for l in open('data/raw/nse-bars/index.jsonl')]
by_date = {r['params']['date']: r for r in idx if r.get('status') == 200 and r.get('provider') == 'nse-bhavcopy'}

test_dates = ['2000-11-22', '2005-06-15', '2010-05-18', '2018-08-20', '2024-10-21']

for d in test_dates:
    r = by_date.get(d)
    if r:
        f = os.path.join('data', 'raw', 'nse-bars', 'nse-bhavcopy', r['checksum'] + '.bin')
        if os.path.exists(f):
            z = zipfile.ZipFile(io.BytesIO(open(f, 'rb').read()))
            lines = z.read(z.namelist()[0]).decode('latin1').splitlines()
            print(f"Date: {d} | Class: {r['urlClass']}")
            print("  Header:", lines[0][:100])
            print("  Row 1 :", lines[1][:100])
