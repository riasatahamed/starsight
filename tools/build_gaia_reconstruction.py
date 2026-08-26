#!/usr/bin/env python3
"""Build StarSight's Gaia-first Milky Way data products.

Inputs:
  * IllustrisTNG gaia_dr3_mini.hdf5 (100k bright stars)
  * full Gaia DR3 HDF5 (237 GB) -- streamed in chunks
  * Gaia/CosmoScout CSV files with RA/Dec/parallax/G/BP-RP

Outputs:
  gaia-stars.bin   GSB1 runtime catalogue: x,y,z,Gmag,r,g,b
  gaia-density.bin GDN1 160x160 top-down density correction map

The density map is intentionally a *correction* to StarSight's Milky Way
population model, not a claim that Gaia is complete everywhere. It is built
from observed stars and softly blended with the model expectation, so missing
or highly incomplete regions do not create artificial holes.
"""
import argparse, csv, heapq, math, struct
from pathlib import Path
import numpy as np

SUN_R_KPC=8.20
RMAX=24.0
W=H=160
MAGIC=b'GSB1'; D_MAGIC=b'GDN1'


def finite(x):
    try: return math.isfinite(float(x))
    except Exception: return False

def color(bp_rp):
    if not finite(bp_rp): return (0.86,0.89,1.0)
    t=max(0,min(1,(float(bp_rp)+0.35)/3.2))
    return (0.58+0.42*t, 0.78+0.18*(1-abs(t-.45)*1.8), 1-0.55*t)

def xyz(l,b,d):
    l=math.radians(float(l)); b=math.radians(float(b)); cb=math.cos(b)
    x=d*cb*math.cos(l); y=d*cb*math.sin(l); z=d*math.sin(b)
    return SUN_R_KPC-x,y,z

def dist(plx, gspphot=None):
    if gspphot is not None and finite(gspphot) and float(gspphot)>0: return float(gspphot)/1000
    if finite(plx) and float(plx)>0: return 1/float(plx)
    return None

def icrs_to_gal(ra,dec,d):
    ar=math.radians(float(ra)); dr=math.radians(float(dec)); cd=math.cos(dr)
    xe=cd*math.cos(ar); ye=cd*math.sin(ar); ze=math.sin(dr)
    xg=-0.0548755604*xe-0.8734370902*ye-0.4838350155*ze
    yg=0.4941094279*xe-0.4448296300*ye+0.7469822445*ze
    zg=-0.8676661490*xe-0.1980763734*ye+0.4559837762*ze
    l=math.degrees(math.atan2(yg,xg))%360; b=math.degrees(math.asin(max(-1,min(1,zg))))
    return xyz(l,b,d)

def model_density(R,phi):
    if R<0.05 or R>RMAX: return 0.0
    radial=math.exp(-R/3.0)
    trunc=1/(1+math.exp((R-20.8)/1.4))
    def mode(m,pitch,phase,amp):
        if R<1.6 or R>21.8:return 0
        ph=phase+math.log(max(R,2)/4)/math.tan(math.radians(pitch))
        d=math.atan2(math.sin(phi-ph),math.cos(phi-ph))
        width=(0.58 if m==2 else 0.48)*(0.86+0.025*R)
        return amp*math.exp(-0.5*(d/width)**2)
    arm=mode(2,12.8,.62,.27)+mode(3,13.6,-.84,.10)
    return radial*trunc*(1+arm)

def write_gsb(rows,out):
    out.parent.mkdir(parents=True,exist_ok=True)
    with open(out,'wb') as f:
        f.write(MAGIC); f.write(struct.pack('<II',len(rows),0))
        for r in rows:
            f.write(struct.pack('<7f',*r[1:]))

def smooth_grid(g):
    # Separable 5-tap Gaussian-ish blur; numpy-only, no scipy dependency.
    k=np.array([1,4,6,4,1],dtype=np.float64); k/=k.sum()
    p=np.pad(g,((0,0),(2,2)),mode='edge')
    h=sum(k[i]*p[:,i:i+g.shape[1]] for i in range(5))
    p=np.pad(h,((2,2),(0,0)),mode='edge')
    return sum(k[i]*p[i:i+g.shape[0],:] for i in range(5))

def density_map(rows):
    obs=np.zeros((H,W),np.float64)
    model=np.zeros((H,W),np.float64)
    # Weight distant stars mildly upward to prevent the bright-star selection
    # from making the outer disk disappear, but cap the correction.
    for r in rows:
        x,y=r[1],r[2]; R=math.hypot(x,y)
        if R>=RMAX: continue
        ix=min(W-1,max(0,int((x/RMAX*0.5+0.5)*W)))
        iy=min(H-1,max(0,int((y/RMAX*0.5+0.5)*H)))
        d=math.hypot(x-SUN_R_KPC,y)
        w=min(4.0,1.0+0.12*d)
        obs[iy,ix]+=w
    yy,xx=np.mgrid[0:H,0:W]
    x=(xx+0.5)/W*2*RMAX-RMAX; y=(yy+0.5)/H*2*RMAX-RMAX
    R=np.hypot(x,y); phi=np.arctan2(y,x)
    for j in range(H):
        for i in range(W): model[j,i]=model_density(float(R[j,i]),float(phi[j,i]))
    obs=smooth_grid(smooth_grid(obs)); model=smooth_grid(model)+1e-6
    # Normalise locally by model, then compress toward 1.0. Areas with too
    # few observed stars are not allowed to dominate.
    ratio=obs/model
    nz=obs>np.percentile(obs[obs>0],20) if np.any(obs>0) else np.zeros_like(obs,dtype=bool)
    if np.any(nz):
        med=float(np.median(ratio[nz])); ratio=ratio/max(med,1e-9)
    else: ratio=np.ones_like(model)
    ratio=np.clip(ratio,0.72,1.48)
    # Where there is no data, leave the procedural model untouched.
    ratio=np.where(obs>np.percentile(obs[obs>0],10) if np.any(obs>0) else False,ratio,1.0)
    return ratio.astype(np.float32)

def rows_from_hdf5(path,limit):
    import h5py
    with h5py.File(path,'r') as h:
        n=len(h['phot_g_mean_mag']); chunk=250000
        # Keep the brightest `limit` entries without loading the 237GB table.
        heap=[]
        for start in range(0,n,chunk):
            end=min(n,start+chunk); mag=np.asarray(h['phot_g_mean_mag'][start:end],dtype=np.float32)
            good=np.isfinite(mag)
            idx=np.nonzero(good)[0]
            for local in idx:
                m=float(mag[local]); item=(-m,start+int(local))
                if len(heap)<limit: heapq.heappush(heap,item)
                elif item>heap[0]: heapq.heapreplace(heap,item)
        ids=[idx for _,idx in sorted(heap,reverse=True)]
        # Preserve brightness order.
        ids.sort(key=lambda i: float(h['phot_g_mean_mag'][i]))
        l=np.asarray(h['l'][ids]); b=np.asarray(h['b'][ids]); plx=np.asarray(h['parallax'][ids]); mag=np.asarray(h['phot_g_mean_mag'][ids])
        distarr=np.asarray(h['distance_gspphot'][ids]) if 'distance_gspphot' in h else None
        bp=np.asarray(h['phot_bp_mean_mag'][ids]) if 'phot_bp_mean_mag' in h else None
        rp=np.asarray(h['phot_rp_mean_mag'][ids]) if 'phot_rp_mean_mag' in h else None
        sid=np.asarray(h['source_id'][ids])
        rows=[]
        for i in range(len(ids)):
            d=dist(plx[i],distarr[i] if distarr is not None else None)
            if d is None or d<=0: continue
            x,y,z=xyz(l[i],b[i],d)
            if max(abs(x),abs(y),abs(z))>60: continue
            bp_rp=float(bp[i]-rp[i]) if bp is not None and rp is not None and finite(bp[i]) and finite(rp[i]) else None
            c=color(bp_rp); rows.append((str(int(sid[i])),x,y,z,float(mag[i]),*c))
        return rows

def rows_from_csv(path,limit):
    rows=[]
    with open(path,newline='',encoding='utf-8-sig') as f:
        r=csv.DictReader(f)
        for q in r:
            try:
                m=float(q.get('phot_g_mean_mag',q.get('gmag',q.get('mag'))));
                if q.get('l') is not None and q.get('b') is not None:
                    d=dist(q.get('parallax'),q.get('distance_gspphot')); x,y,z=xyz(q['l'],q['b'],d)
                else:
                    d=dist(q.get('parallax'),q.get('distance_gspphot')); x,y,z=icrs_to_gal(q['ra'],q['dec'],d)
                if d is None or max(abs(x),abs(y),abs(z))>60: continue
                c=color(q.get('bp_rp')); rows.append((str(q.get('source_id','')),x,y,z,m,*c))
            except Exception: continue
    rows.sort(key=lambda x:x[4]); return rows[:limit]

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('input'); ap.add_argument('outdir'); ap.add_argument('--limit',type=int,default=100000); a=ap.parse_args()
    inp=Path(a.input); out=Path(a.outdir); out.mkdir(parents=True,exist_ok=True)
    rows=rows_from_hdf5(inp,a.limit) if inp.suffix.lower() in {'.h5','.hdf5'} else rows_from_csv(inp,a.limit)
    write_gsb(rows,out/'gaia-stars.bin')
    grid=density_map(rows)
    with open(out/'gaia-density.bin','wb') as f:
        f.write(D_MAGIC); f.write(struct.pack('<III',W,H,0)); f.write(np.clip(grid*255.0,0,255).astype(np.uint8).tobytes(order='C'))
    with open(out/'GAIA_RECONSTRUCTION_STATS.txt','w') as f:
        f.write(f'Gaia stars written: {len(rows):,}\n')
        if rows:
            rs=[math.hypot(r[1],r[2]) for r in rows]
            f.write(f'Galactocentric R range: {min(rs):.3f}..{max(rs):.3f} kpc\n')
        f.write('Density product: 160x160 top-down observed/model correction, clamped 0.72..1.48.\n')
    print(f'Wrote {len(rows):,} Gaia stars and Gaia density correction to {out}')

if __name__=='__main__': main()
