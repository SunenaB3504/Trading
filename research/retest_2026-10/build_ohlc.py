import zipfile,io,os,sys,glob,json
import pandas as pd
D=r"C:/Users/Admin/Sunil/Trading/data/raw/nse-bars/nse-bhavcopy"
idx=[json.loads(l) for l in open(r"C:/Users/Admin/Sunil/Trading/data/raw/nse-bars/index.jsonl")]
date_of={}
for r in idx:
    if r['provider']=='nse-bhavcopy': date_of[r['checksum']]=r['params']['date']
frames=[];bad=0
for f in sorted(glob.glob(D+"/*.bin")):
    ck=os.path.basename(f)[:-4]
    try:
        b=open(f,'rb').read()
        z=zipfile.ZipFile(io.BytesIO(b));raw=z.read(z.namelist()[0]).decode('latin1')
        df=pd.read_csv(io.StringIO(raw),dtype=str,index_col=False)
        df.columns=[c.strip() for c in df.columns]
        if 'TckrSymb' in df.columns:
            df=df.rename(columns={'TckrSymb':'sym','SctySrs':'ser','OpnPric':'o','HghPric':'h','LwPric':'l','ClsPric':'c','PrvsClsgPric':'p','TtlTradgVol':'v','TradDt':'d','ISIN':'isin'})
            df['d']=pd.to_datetime(df['d'],errors='coerce').dt.strftime('%Y-%m-%d')
        else:
            df=df.rename(columns={'SYMBOL':'sym','SERIES':'ser','OPEN':'o','HIGH':'h','LOW':'l','CLOSE':'c','PREVCLOSE':'p','TOTTRDQTY':'v','TIMESTAMP':'d'})
            if 'ISIN' not in df.columns: df['isin']=''
            else: df=df.rename(columns={'ISIN':'isin'})
            df['d']=pd.to_datetime(df['d'].str.strip().str.upper(),format='%d-%b-%Y',errors='coerce').dt.strftime('%Y-%m-%d')
        df=df[df['ser'].str.strip().isin(['EQ','BE','BZ','SM','ST'])]
        df=df[['sym','d','ser','o','h','l','c','p','v','isin']]
        frames.append(df)
    except Exception as e:
        bad+=1;print('bad',f,e,file=sys.stderr)
a=pd.concat(frames,ignore_index=True)
for c in 'ohlcpv': a[c]=pd.to_numeric(a[c],errors='coerce')
a['sym']=a['sym'].str.strip();a['ser']=a['ser'].str.strip()
a=a.dropna(subset=['d','c']).sort_values(['sym','d'])
a.to_parquet(r"%s/ohlc.parquet"%os.path.dirname(__file__)) if False else a.to_csv(os.path.dirname(__file__)+"/ohlc.csv.gz",index=False,compression='gzip')
print(len(a),a.d.min(),a.d.max(),a.sym.nunique(),'bad',bad)
