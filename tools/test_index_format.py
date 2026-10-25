import io, json, os

idx = [json.loads(l) for l in open('data/raw/nse-index/index.jsonl')]
by_date = {r['params']['date']: r for r in idx if r.get('status') == 200}

test_dates = ['2010-01-04', '2018-05-15', '2024-10-21']
for d in test_dates:
    r = by_date.get(d)
    if r:
        f = os.path.join('data', 'raw', 'nse-index', 'nse-index', r['checksum'] + '.bin')
        if os.path.exists(f):
            text = open(f, 'r', encoding='latin1').read()
            lines = text.splitlines()
            print(f"Index Date: {d}")
            print("  Header:", lines[0] if len(lines) > 0 else "")
            for line in lines[1:6]:
                print("   ", line)
