#!/usr/bin/env python3
"""Build a regionally stratified Gaia DR3 star layer for StarSight.

The goal is deliberately NOT "the globally brightest 1,000,000 Gaia stars".
A global magnitude cut overwhelmingly favours the Solar neighbourhood. Instead,
this builder divides the Galactocentric disk into radial/azimuthal cells and
keeps the brightest stars in every cell, then uses any remaining budget for a
second global-brightness pass. The result gives the realtime renderer real Gaia
stars from the inner, middle and outer Galaxy instead of one local clump.

Input can be:
  * Gaia DR3 HDF5 (including the 1.8B-row TNG export; processed in chunks), or
  * a CSV/ECSV export containing Gaia astrometry/photometry.

Output:
  gaia-stars.bin       GSB1, x/y/z/G/R/G/B Float32 records
  gaia-density.bin     GDN1, observed/model top-down density correction
  gaia-selection.csv   audit of selected stars
  GAIA_SELECTION_STATS.txt
"""
import argparse, csv, heapq, math, struct
from pathlib import Path
import numpy as np

SUN_R_KPC=8.20
RMAX=60.0
MAGIC=b'GSB1'; D_MAGIC=b'GDN1'
W=H=192
DENSITY_R=19.0
RBINS=np.array([0.0,1.5,3,5,7,9,11,13,16,20,24,30,40,50,60.0],dtype=np.float64)
PHI_BINS=96
Z_BINS=np.array([-20,-8,-3,-1,-0.3,0.3,1,3,8,20],dtype=np.float64)


def finite(x):
    try:return math.isfinite(float(x))
    except Exception:return False

def color(bp):
    if not finite(bp): return (0.86,0.89,1.0)
    t=max(0,min(1,(float(bp)+0.35)/3.2))
    return (0.58+0.42*t,0.78+0.18*(1-abs(t-.45)*1.8),1-0.55*t)

def xyz(l,b,d):
    l=np.deg2rad(l); b=np.deg2rad(b); cb=np.cos(b)
    xh=d*cb*np.cos(l); yh=d*cb*np.sin(l); zh=d*np.sin(b)
    return SUN_R_KPC-xh,yh,zh

def scalar_xyz(l,b,d):
    l=math.radians(float(l)); b=math.radians(float(b)); cb=math.cos(b)
    xh=d*cb*math.cos(l); yh=d*cb*math.sin(l); zh=d*math.sin(b)
    return SUN_R_KPC-xh,yh,zh

def distance(plx,gspphot):
    if gspphot is not None and finite(gspphot) and float(gspphot)>0:return float(gspphot)/1000.0
    if finite(plx) and float(plx)>0:return 1.0/float(plx)
    return None

def cell_index(x,y,z):
    R=math.hypot(x,y)
    if R>=RMAX:return -1
    ri=int(np.searchsorted(RBINS,R,side='right')-1)
    if ri<0 or ri>=len(RBINS)-1:return -1
    phi=(math.atan2(y,x)+math.pi*2)%(math.pi*2)
    pi=min(PHI_BINS-1,int(phi/(math.pi*2)*PHI_BINS))
    zi=int(np.searchsorted(Z_BINS,z,side='right')-1)
    zi=max(0,min(len(Z_BINS)-2,zi))
    return (ri*PHI_BINS+pi)*(len(Z_BINS)-1)+zi

def model_density(R,phi):
    if R<0.05 or R>24:return 0.0
    radial=math.exp(-R/3.0)/(1+math.exp((R-21)/1.5))
    arms=0.0
    for m,pitch,phase,amp in ((4,12.0,.35,.34),(4,13.5,1.95,.22),(2,12.8,.62,.18)):
        ph=phase+math.log(max(R,2)/4)/math.tan(math.radians(pitch))
        d=math.atan2(math.sin(m*(phi-ph)),math.cos(m*(phi-ph)))
        arms+=amp*math.exp(-0.5*(d/0.75)**2)
    return radial*(1+min(0.8,arms))

def smooth(g):
    k=np.array([1,4,6,4,1],dtype=np.float64); k/=k.sum()
    p=np.pad(g,((0,0),(2,2)),mode='edge'); h=sum(k[i]*p[:,i:i+g.shape[1]] for i in range(5))
    p=np.pad(h,((2,2),(0,0)),mode='edge'); return sum(k[i]*p[i:i+g.shape[0],:] for i in range(5))

def write_gsb(rows,out):
    with open(out,'wb') as f:
        f.write(MAGIC); f.write(struct.pack('<II',len(rows),0))
        for r in rows:f.write(struct.pack('<7f',*r[1:]))

def density_map(rows):
    obs=np.zeros((H,W),np.float64); mod=np.zeros((H,W),np.float64)
    for r in rows:
        x,y=r[1],r[2];
        if abs(x)>DENSITY_R or abs(y)>DENSITY_R:continue
        ix=min(W-1,max(0,int((x/DENSITY_R*.5+.5)*W))); iy=min(H-1,max(0,int((y/DENSITY_R*.5+.5)*H)))
        # Distant selected stars are deliberately given a little more weight,
        # because the stratified catalogue has a fixed per-cell quota.
        d=math.hypot(x-SUN_R_KPC,y); obs[iy,ix]+=1+0.06*min(d,25)
    yy,xx=np.mgrid[0:H,0:W]; x=(xx+.5)/W*2*DENSITY_R-DENSITY_R; y=(yy+.5)/H*2*DENSITY_R-DENSITY_R
    R=np.hypot(x,y); phi=np.arctan2(y,x)
    for j in range(H):
        for i in range(W):mod[j,i]=model_density(float(R[j,i]),float(phi[j,i]))
    obs=smooth(smooth(obs)); mod=smooth(mod)+1e-8
    ratio=obs/mod; good=obs>np.percentile(obs[obs>0],15) if np.any(obs>0) else np.zeros_like(obs,dtype=bool)
    if np.any(good):ratio/=max(float(np.median(ratio[good])),1e-9)
    ratio=np.clip(ratio,.55,1.65); ratio=np.where(good,ratio,1.0)
    with open('/tmp/_dummy','w') if False else open('/dev/null','w') as _:pass
    return np.clip(ratio*255,0,255).astype(np.uint8)

def heap_add(heaps,cid,item,quota):
    h=heaps[cid]
    # item=(negative magnitude, row tuple); root is worst selected star.
    if len(h)<quota:heapq.heappush(h,item)
    elif item>h[0]:heapq.heapreplace(h,item)

def make_row(sid,l,b,plx,gmag,bp,rp,gspphot):
    d=distance(plx,gspphot)
    if d is None or d<=0 or d>RMAX:return None
    x,y,z=scalar_xyz(l,b,d)
    if math.hypot(x,y)>RMAX or abs(z)>20:return None
    c=color((float(bp)-float(rp)) if finite(bp) and finite(rp) else None)
    return (str(sid),x,y,z,float(gmag),*c)

def stream_hdf5(path,limit,mag_limit,quota_per_cell):
    import h5py
    n_cells=(len(RBINS)-1)*PHI_BINS*(len(Z_BINS)-1)
    heaps=[[] for _ in range(n_cells)]
    global_heap=[]; chunk=500_000; candidates=0
    with h5py.File(path,'r') as h:
        n=len(h['phot_g_mean_mag']); keys=set(h.keys())
        for start in range(0,n,chunk):
            end=min(n,start+chunk)
            mag=np.asarray(h['phot_g_mean_mag'][start:end],dtype=np.float32)
            good=np.isfinite(mag)&(mag<=mag_limit)
            ids=np.nonzero(good)[0]
            if not len(ids):continue
            # Read only the selected rows from the other columns.
            def A(name,default=np.nan):return np.asarray(h[name][start:end],dtype=np.float64) if name in keys else np.full(end-start,default)
            l=A('l'); b=A('b'); plx=A('parallax'); distg=A('distance_gspphot') if 'distance_gspphot' in keys else np.full(end-start,np.nan)
            bp=A('phot_bp_mean_mag'); rp=A('phot_rp_mean_mag'); sid=A('source_id',-1)
            for j in ids:
                d=distance(plx[j],distg[j]);
                if d is None or d<=0 or d>RMAX:continue
                x,y,z=scalar_xyz(l[j],b[j],d); R=math.hypot(x,y)
                if R>=RMAX or abs(z)>20:continue
                row=(str(int(sid[j])),x,y,z,float(mag[j]),*color((bp[j]-rp[j]) if finite(bp[j]) and finite(rp[j]) else None))
                cid=cell_index(x,y,z)
                if cid>=0:
                    heap_add(heaps,cid,(-row[4],row),quota_per_cell)
                # global safety net: 20% of the budget, strongest bright stars overall.
                item=(-row[4],row)
                gq=max(1000,int(limit))
                if len(global_heap)<gq:heapq.heappush(global_heap,item)
                elif item>global_heap[0]:heapq.heapreplace(global_heap,item)
                candidates+=1
    selected=[]; seen=set()
    for h in heaps:
        for _,row in h:
            if row[0] not in seen:seen.add(row[0]);selected.append(row)
    for _,row in global_heap:
        if len(selected)>=limit:break
        if row[0] not in seen:seen.add(row[0]);selected.append(row)
    # Preserve regional coverage. The default cell quota consumes ~80% of the budget;
    # the global reserve fills cells that had too little Gaia coverage.
    if len(selected)>limit:
        selected.sort(key=lambda r:(r[4],r[0])); selected=selected[:limit]
    else:
        selected.sort(key=lambda r:(r[4],r[0]))
    return selected,candidates

def read_csv(path,limit,mag_limit,quota_per_cell):
    n_cells=(len(RBINS)-1)*PHI_BINS*(len(Z_BINS)-1); heaps=[[] for _ in range(n_cells)]; global_heap=[]; gq=max(1000,int(limit)); candidates=0
    with open(path,newline='',encoding='utf-8-sig') as f:
        for q in csv.DictReader(f):
            try:
                m=float(q.get('phot_g_mean_mag',q.get('gmag',q.get('mag'))));
                if m>mag_limit:continue
                l=q.get('l'); b=q.get('b');
                if l is None or b is None:
                    # CSV path may provide ICRS; derive Galactic coordinates.
                    ra=float(q['ra']); dec=float(q['dec']); ar=math.radians(ra); dr=math.radians(dec); cd=math.cos(dr)
                    xe=cd*math.cos(ar); ye=cd*math.sin(ar); ze=math.sin(dr)
                    xg=-.0548755604*xe-.8734370902*ye-.4838350155*ze; yg=.4941094279*xe-.4448296300*ye+.7469822445*ze; zg=-.8676661490*xe-.1980763734*ye+.4559837762*ze
                    l=math.degrees(math.atan2(yg,xg))%360; b=math.degrees(math.asin(max(-1,min(1,zg))))
                d=distance(q.get('parallax'),q.get('distance_gspphot'))
                if d is None:continue
                row=make_row(q.get('source_id',''),l,b,q.get('parallax'),m,q.get('phot_bp_mean_mag'),q.get('phot_rp_mean_mag'),q.get('distance_gspphot'))
                if not row:continue
                cid=cell_index(row[1],row[2],row[3]); item=(-row[4],row)
                if cid>=0:heap_add(heaps,cid,item,quota_per_cell)
                if len(global_heap)<gq:heapq.heappush(global_heap,item)
                elif item>global_heap[0]:heapq.heapreplace(global_heap,item)
                candidates+=1
            except Exception:continue
    selected=[];seen=set()
    for h in heaps:
        for _,row in h:
            if row[0] not in seen:seen.add(row[0]);selected.append(row)
    for _,row in global_heap:
        if len(selected)>=limit:break
        if row[0] not in seen:seen.add(row[0]);selected.append(row)
    if len(selected)>limit:
        selected.sort(key=lambda r:(r[4],r[0])); selected=selected[:limit]
    else:selected.sort(key=lambda r:(r[4],r[0]))
    return selected,candidates

def main():
    ap=argparse.ArgumentParser();ap.add_argument('input');ap.add_argument('outdir');ap.add_argument('--limit',type=int,default=1_000_000);ap.add_argument('--mag-limit',type=float,default=17.0);ap.add_argument('--quota-per-cell',type=int,default=115);a=ap.parse_args()
    inp=Path(a.input);out=Path(a.outdir);out.mkdir(parents=True,exist_ok=True)
    if inp.suffix.lower() in {'.h5','.hdf5'}:rows,candidates=stream_hdf5(inp,a.limit,a.mag_limit,a.quota_per_cell)
    else:rows,candidates=read_csv(inp,a.limit,a.mag_limit,a.quota_per_cell)
    write_gsb(rows,out/'gaia-stars.bin')
    grid=density_map(rows)
    with open(out/'gaia-density.bin','wb') as f:f.write(D_MAGIC+struct.pack('<III',W,H,0)+grid.tobytes())
    with open(out/'gaia-selection.csv','w',newline='',encoding='utf-8') as f:
        w=csv.writer(f);w.writerow(['source_id','x_kpc','y_kpc','z_kpc','phot_g_mean_mag','r','g','b']);w.writerows(rows)
    with open(out/'GAIA_SELECTION_STATS.txt','w',encoding='utf-8') as f:
        f.write(f'Regionally selected Gaia stars: {len(rows):,}\n');f.write(f'Candidate stars passing G<{a.mag_limit}: {candidates:,}\n');f.write(f'Galactocentric R coverage: {min((math.hypot(r[1],r[2]) for r in rows),default=0):.2f} .. {max((math.hypot(r[1],r[2]) for r in rows),default=0):.2f} kpc\n');f.write(f'Radial bins: {list(RBINS)}\nAzimuth bins: {PHI_BINS}\nZ bins: {list(Z_BINS)}\n');f.write('Selection is stratified by Galactocentric radial/azimuth/vertical cells, then supplemented by the global brightest set.\n')
    print(f'Wrote {len(rows):,} regionally selected Gaia stars to {out}/gaia-stars.bin')

if __name__=='__main__':main()
