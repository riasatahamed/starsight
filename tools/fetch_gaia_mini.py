#!/usr/bin/env python3
"""Download the public 100k-star Gaia DR3 mini dataset from IllustrisTNG."""
from pathlib import Path
from urllib.request import urlopen
import argparse
URL='https://www.tng-project.org/data/obs/gaia_dr3_mini.hdf5'

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('output',nargs='?',default='gaia_dr3_mini.hdf5'); a=ap.parse_args()
    out=Path(a.output)
    with urlopen(URL,timeout=60) as r, open(out,'wb') as f:
        total=int(r.headers.get('Content-Length','0') or 0); done=0
        while True:
            b=r.read(1024*1024)
            if not b: break
            f.write(b); done+=len(b)
            if total: print(f'\r{done/total:6.1%}',end='')
    print(f'\nSaved {out} ({out.stat().st_size:,} bytes)')
if __name__=='__main__': main()
