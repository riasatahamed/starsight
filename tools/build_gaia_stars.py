#!/usr/bin/env python3
"""Build StarSight's compact binary Gaia DR3 stellar layer.

Inputs supported:
  * IllustrisTNG gaia_dr3_mini.hdf5 (100,000 bright Gaia DR3 stars)
  * Gaia/CosmoScout-style CSV with source_id, l, b OR ra, dec, parallax,
    phot_g_mean_mag, bp_rp.

Output:
  gaia-stars.bin -- 12-byte header + Float32 records:
      x, y, z, Gmag, R, G, B

Coordinates are Galactocentric kpc with Galactic centre at (0,0,0),
Sun at (+8.2,0,0), +Y in the direction of Galactic rotation.
"""
import argparse, csv, math, struct
from pathlib import Path

SUN_R_KPC = 8.20
MAGIC = b'GSB1'


def finite(x):
    try: return math.isfinite(float(x))
    except Exception: return False


def color_from_bp_rp(bp):
    if not finite(bp): return (0.86, 0.89, 1.0)
    # Smooth approximate stellar colour for rendering, not a physical SED fit.
    t=max(0.0,min(1.0,(float(bp)+0.35)/3.2))
    r=0.58 + 0.42*t
    g=0.78 + 0.18*(1-abs(t-0.45)*1.8)
    b=1.00 - 0.55*t
    return (max(.35,min(1,r)),max(.45,min(1,g)),max(.45,min(1,b)))


def galactic_xyz(l_deg,b_deg,d_kpc):
    l=math.radians(float(l_deg)); b=math.radians(float(b_deg)); cb=math.cos(b)
    xh=d_kpc*cb*math.cos(l)
    yh=d_kpc*cb*math.sin(l)
    zh=d_kpc*math.sin(b)
    return SUN_R_KPC-xh, yh, zh


def distance_kpc(parallax_mas=None, gsppc=None):
    # Prefer Gaia's DR3 GSP-Phot distance where supplied; it is generally safer
    # than 1/parallax at the far end of a magnitude-selected sample.
    if gsppc is not None and finite(gsppc) and float(gsppc)>0:
        return float(gsppc)/1000.0
    if parallax_mas is not None and finite(parallax_mas) and float(parallax_mas)>0:
        return 1.0/float(parallax_mas)
    return None


def row_from_mapping(row):
    def get(*names):
        for n in names:
            if n in row and row[n] not in ('',None): return row[n]
        return None
    l=get('l'); b=get('b')
    if l is None or b is None:
        # Standard ICRS -> Galactic J2000 rotation.
        ra=get('ra'); dec=get('dec')
        if ra is None or dec is None: return None
        ar=math.radians(float(ra)); dr=math.radians(float(dec)); cd=math.cos(dr)
        xe=cd*math.cos(ar); ye=cd*math.sin(ar); ze=math.sin(dr)
        xg=(-0.0548755604*xe -0.8734370902*ye -0.4838350155*ze)
        yg=( 0.4941094279*xe -0.4448296300*ye +0.7469822445*ze)
        zg=(-0.8676661490*xe -0.1980763734*ye +0.4559837762*ze)
        l=math.degrees(math.atan2(yg,xg))%360.0; b=math.degrees(math.asin(max(-1,min(1,zg))))
    d=distance_kpc(get('parallax'), get('distance_gspphot'))
    mag=get('phot_g_mean_mag','gmag','mag')
    if d is None or mag is None or not finite(mag): return None
    x,y,z=galactic_xyz(l,b,d)
    if max(abs(x),abs(y),abs(z))>60: return None
    sid=get('source_id','id') or ''
    c=color_from_bp_rp(get('bp_rp'))
    return str(sid),x,y,z,float(mag),*c


def read_hdf5(path,limit):
    import h5py, numpy as np
    with h5py.File(path,'r') as h:
        def arr(name): return np.asarray(h[name])
        keys=set(h.keys())
        l=arr('l') if 'l' in keys else None
        b=arr('b') if 'b' in keys else None
        ra=arr('ra') if 'ra' in keys else None; dec=arr('dec') if 'dec' in keys else None; plx=arr('parallax'); mag=arr('phot_g_mean_mag'); sid=arr('source_id')
        dist=arr('distance_gspphot') if 'distance_gspphot' in keys else None
        bp=arr('phot_bp_mean_mag') if 'phot_bp_mean_mag' in keys else None
        rp=arr('phot_rp_mean_mag') if 'phot_rp_mean_mag' in keys else None
    rows=[]
    # Mini files are only 100k, so vectorised loading is fine.
    order=np.argsort(mag)
    for i in order[:limit]:
        d=distance_kpc(plx[i], dist[i] if dist is not None else None)
        if d is None: continue
        if l is not None and b is not None:
            x,y,z=galactic_xyz(l[i],b[i],d)
        else:
            row={'ra':ra[i],'dec':dec[i]};
            # use the shared ICRS path
            ar=math.radians(float(ra[i])); dr=math.radians(float(dec[i])); cd=math.cos(dr)
            xe=d*cd*math.cos(ar); ye=d*cd*math.sin(ar); ze=d*math.sin(dr)
            xg=-0.0548755604*xe-0.8734370902*ye-0.4838350155*ze
            yg=0.4941094279*xe-0.4448296300*ye+0.7469822445*ze
            zg=-0.8676661490*xe-0.1980763734*ye+0.4559837762*ze
            x,y,z=SUN_R_KPC-xg,yg,zg
        if max(abs(x),abs(y),abs(z))>60: continue
        bp_rp=(float(bp[i])-float(rp[i])) if bp is not None and rp is not None and finite(bp[i]) and finite(rp[i]) else None
        c=color_from_bp_rp(bp_rp)
        rows.append((str(int(sid[i])),x,y,z,float(mag[i]),*c))
    return rows


def read_csv(path,limit):
    rows=[]
    with open(path,newline='',encoding='utf-8-sig') as f:
        r=csv.DictReader(f)
        for row in r:
            x=row_from_mapping(row)
            if x: rows.append(x)
    rows.sort(key=lambda q:q[4])
    return rows[:limit]


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('input')
    ap.add_argument('output')
    ap.add_argument('--limit',type=int,default=100000)
    args=ap.parse_args()
    inp=Path(args.input); out=Path(args.output); out.parent.mkdir(parents=True,exist_ok=True)
    rows=read_hdf5(inp,args.limit) if inp.suffix.lower() in {'.hdf5','.h5'} else read_csv(inp,args.limit)
    with open(out,'wb') as f:
        f.write(MAGIC); f.write(struct.pack('<II',len(rows),0))
        for r in rows: f.write(struct.pack('<7f',*r[1:]))
    meta=out.with_name(out.stem+'-meta.csv')
    with open(meta,'w',newline='',encoding='utf-8') as f:
        w=csv.writer(f); w.writerow(['source_id','x_kpc','y_kpc','z_kpc','phot_g_mean_mag','r','g','b']); w.writerows(rows)
    print(f'Wrote {len(rows):,} Gaia stars -> {out}')
    print(f'Coordinates: Galactocentric kpc, Sun=(+{SUN_R_KPC},0,0)')

if __name__=='__main__': main()
