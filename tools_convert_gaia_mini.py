#!/usr/bin/env python3
"""Convert a 100k-star Gaia HDF5 mini catalogue to StarSight JSON.

Expected HDF5 columns: ra, dec, parallax (mas), phot_g_mean_mag, source_id.
Optional: distance_gspphot (pc), bp_rp. The script uses parallax when positive
and finite, otherwise distance_gspphot, and transforms ICRS Cartesian positions
into the StarSight Galactocentric convention (Sun at +8.2 kpc on X).
"""
import argparse, json, math
import h5py
import numpy as np

def clamp01(v): return max(0.0, min(1.0, v))

SUN_X_KPC = 8.2

def pick(h, names):
    for n in names:
        if n in h:
            return np.asarray(h[n])
    raise KeyError(f"None of {names} found in HDF5")

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('input')
    ap.add_argument('output')
    ap.add_argument('--limit',type=int,default=100000)
    a=ap.parse_args()
    with h5py.File(a.input,'r') as h:
        ra=pick(h,['ra']); dec=pick(h,['dec']); plx=pick(h,['parallax'])
        mag=pick(h,['phot_g_mean_mag']); sid=pick(h,['source_id'])
        dist=pick(h,['distance_gspphot']) if 'distance_gspphot' in h else None
        bp=pick(h,['bp_rp']) if 'bp_rp' in h else None
    good=np.isfinite(ra)&np.isfinite(dec)&np.isfinite(mag)
    good &= ((np.isfinite(plx)&(plx>0)) | (dist is not None and np.isfinite(dist)&(dist>0)))
    idx=np.flatnonzero(good)
    idx=idx[np.argsort(mag[idx])[:a.limit]]
    out=[]
    for i in idx:
        dpc=(1000.0/plx[i]) if np.isfinite(plx[i]) and plx[i]>0 else float(dist[i])
        rar=math.radians(float(ra[i])); decr=math.radians(float(dec[i])); d=dpc/1000.0
        # ICRS equatorial Cartesian, then rotate to a simple Galactic-frame convention.
        # The exact rotation is the standard ICRS->Galactic J2000 matrix.
        xeq=d*math.cos(decr)*math.cos(rar); yeq=d*math.cos(decr)*math.sin(rar); zeq=d*math.sin(decr)
        xg=(-0.0548755604*xeq -0.8734370902*yeq -0.4838350155*zeq)
        yg=( 0.4941094279*xeq -0.4448296300*yeq +0.7469822445*zeq)
        zg=(-0.8676661490*xeq -0.1980763734*yeq +0.4559837762*zeq)
        # Galactocentric: X points from GC toward Sun; Y follows Galactic rotation.
        X=SUN_X_KPC-xg; Y=yg; Z=zg
        if bp is not None and np.isfinite(bp[i]):
            br=float(bp[i])
            # Approximate Gaia BP-RP colour mapping; preserves hot blue through cool amber stars.
            t=clamp01((br+0.35)/3.0)
            color=[0.60+0.40*(1-t), 0.72+0.22*(1-t)+0.06*t, 1.0-0.38*t]
        else:
            color=[0.86,0.88,1.0]
        out.append({'id':str(int(sid[i])),'x':round(X,6),'y':round(Y,6),'z':round(Z,6),'mag':round(float(mag[i]),4),'c':color})
    with open(a.output,'w',encoding='utf8') as f: json.dump(out,f,separators=(',',':'))
    print(f'wrote {len(out):,} stars to {a.output}')
if __name__=='__main__': main()
