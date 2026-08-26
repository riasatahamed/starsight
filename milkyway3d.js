(() => {
  'use strict';
  let active = null;
  const TAU = Math.PI * 2;
  // v33: high-density procedural Galaxy. The star budget is adaptive on mobile.
  const MODEL_STARS = 1400000;
  const MODEL_DUST = 105000;
  const MODEL_HALO = 20000;
  const MODEL_GAS = 36000;
  const MODEL_HII = 10000;
  const MODEL_CLUSTERS = 1500;
  const GAIA_TARGET = 0;
  const DATA_BASE = './data/milkyway/';
  const DENSITY_W = 192, DENSITY_H = 192;

  function status(t){ const e=document.getElementById('galaxyStatusText'); if(e) e.textContent=t; }
  function count(n){ const e=document.getElementById('galaxyCount'); if(e) e.textContent=Number(n).toLocaleString(); }
  function mulberry32(seed){ return ()=>{ let t=seed+=0x6D2B79F5; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }
  function gaussian(rnd){ const a=Math.max(1e-9,rnd()),b=rnd(); return Math.sqrt(-2*Math.log(a))*Math.cos(TAU*b); }
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function smoothstep(a,b,x){const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
  function wrap(a){return Math.atan2(Math.sin(a),Math.cos(a));}

  const MW = {
    sunR: 8.20, outerR: 17.5, haloR: 55.0,
    thinZ: 0.22, thickZ: 0.78,
    barAngle: -0.46,
    // Four named large-scale structures, with irregularity rather than perfect arms.
    arms: [
      {name:'Scutum-Centaurus', phase:0.34, pitch:12.6, amp:0.34, width:0.32},
      {name:'Sagittarius-Carina', phase:1.82, pitch:12.2, amp:0.25, width:0.36},
      {name:'Perseus', phase:3.26, pitch:13.0, amp:0.30, width:0.38},
      {name:'Norma-Outer', phase:4.72, pitch:12.8, amp:0.22, width:0.42}
    ],
    spur:{phase:-0.58, radius:8.25, length:1.65, width:0.30}
  };
  // Solar System position: ~8.2 kpc from the Galactic centre, placed on the model's
  // Orion spur so the locator represents the Sun's real large-scale Galactic neighbourhood.
  const SUN_X = MW.sunR * Math.cos(MW.spur.phase);
  const SUN_Z = MW.sunR * Math.sin(MW.spur.phase);

  function armSignal(R,phi,arm){
    if(R<2.0||R>16.8)return 0;
    const ph=arm.phase+Math.log(Math.max(R,2)/4)/Math.tan(arm.pitch*Math.PI/180);
    const d=wrap(phi-ph);
    // Use cross-track distance in kpc so distant arms do not become concentric rings.
    const wiggle=0.055*Math.sin(R*2.4+arm.phase*3.0)+0.025*Math.sin(R*6.1-phi*5.0);
    const widthKpc=arm.width*(0.72+0.028*R);
    const crossTrack=R*wrap(d-wiggle);
    return Math.exp(-0.5*Math.pow(crossTrack/widthKpc,2));
  }
  function namedArmField(R,phi){
    if(R<1.8||R>16.8)return 0;
    let s=0; for(const a of MW.arms)s+=a.amp*armSignal(R,phi,a);
    const dphi=wrap(phi-MW.spur.phase);
    const spurR=MW.spur.radius+0.85*dphi;
    const spur=smoothstep(MW.spur.length,0,Math.abs(dphi))*Math.exp(-0.5*Math.pow((R-spurR)/MW.spur.width,2));
    return clamp(s+0.24*spur,0,0.95);
  }
  function diskDensity(R,phi,z){
    if(R<0.03||R>MW.outerR)return 0;
    const trunc=1/(1+Math.exp((R-21.5)/1.5));
    const thin=Math.exp(-Math.abs(z)/MW.thinZ);
    const thick=0.115*Math.exp(-Math.abs(z)/MW.thickZ);
    return Math.exp(-R/3.15)*(0.90*thin+0.10*thick)*trunc*(1+namedArmField(R,phi));
  }
  function stellarColor(rnd,R,arm){
    const young=0.010+0.22*arm*Math.exp(-Math.max(R-2,0)/18);
    if(rnd()<young){
      const q=rnd(); return q<0.70?[0.56+0.24*q,0.75+0.18*q,1.0]:[1.0,0.38+0.25*q,0.52+0.28*q];
    }
    const q=rnd(), warm=clamp(1-R/17,0,1)*0.55+rnd()*0.45;
    return [0.72+0.25*q+0.035*warm,0.78+0.17*q,0.89+0.10*q-0.05*warm];
  }
  function sampleDisk(rnd){
    for(let tries=0;tries<220;tries++){
      const R=0.28+Math.pow(rnd(),0.53)*17.0,phi=rnd()*TAU;
      const youngPlane=rnd()<0.90; const z=gaussian(rnd)*(youngPlane?MW.thinZ:MW.thickZ);
      const arm=namedArmField(R,phi); const accept=0.46+0.54*clamp(arm,0,1);
      if(rnd()<accept)return [R*Math.cos(phi),R*Math.sin(phi),z,R,phi,arm];
    }
    const R=2+15*rnd(),phi=rnd()*TAU; return [R*Math.cos(phi),R*Math.sin(phi),gaussian(rnd)*MW.thinZ,R,phi,namedArmField(R,phi)];
  }
  function writePoint(out,k,x,y,z,size,r,g,b,a){
    const i=k*8;
    // Renderer convention is XZ = Galactic plane, Y = Galactic north.
    out[i]=x;out[i+1]=z;out[i+2]=y;out[i+3]=size;out[i+4]=r;out[i+5]=g;out[i+6]=b;out[i+7]=a;
  }
  function makeGalaxyStars(target){
    const out=new Float32Array(target*8),rnd=mulberry32(0xA11CE019);let k=0;
    while(k<Math.floor(target*0.93)){
      const p=sampleDisk(rnd),R=p[3],arm=p[5],c=stellarColor(rnd,R,arm);
      const mott=0.72+0.28*(0.5+0.5*Math.sin(R*2.1+p[4]*5.2)+0.22*Math.sin(R*8-p[4]*11));
      const size=rnd()<0.08+0.28*arm?0.38+rnd()*1.05:0.22+rnd()*0.68; const alpha=(0.045+rnd()*0.095)*Math.exp(-R/21)*(0.82+1.35*arm)*mott;
      writePoint(out,k++,p[0],p[1],p[2],size,c[0],c[1],c[2],alpha);
    }
    // Explicit central bulge + bar, elongated at the correct position angle.
    while(k<target){
      const gx=gaussian(rnd),gy=gaussian(rnd),gz=gaussian(rnd);
      const bx=gx*1.75,by=gy*0.62; const ca=Math.cos(MW.barAngle),sa=Math.sin(MW.barAngle);
      const x=bx*ca-by*sa,y=bx*sa+by*ca,z=gz*(0.28+0.13*Math.abs(gx));
      const q=Math.hypot(bx/2.9,by/1.05); const a=(0.018+rnd()*0.034)*Math.exp(-q*q*0.65);
      writePoint(out,k++,x,y,z,0.22+rnd()*0.68,1.0,0.70+0.20*rnd(),0.42+0.22*rnd(),a);
    }
    return out;
  }
  function makeHalo(target){
    const out=new Float32Array(target*8),rnd=mulberry32(0xA10C001);let k=0;
    while(k<target){
      const r=4+Math.pow(rnd(),0.35)*50, u=rnd()*2-1, t=Math.sqrt(1-u*u),ph=rnd()*TAU;
      const x=r*t*Math.cos(ph),y=r*t*Math.sin(ph),z=r*u;
      const a=(0.003+rnd()*0.009)*Math.exp(-r/32); const c=rnd()<0.72?[0.62,0.72,0.95]:[0.95,0.84,0.68];
      writePoint(out,k++,x,y,z,0.10+rnd()*0.24,c[0],c[1],c[2],a);
    }
    return out;
  }
  function makeDust(target){
    const out=new Float32Array(target*8),rnd=mulberry32(0xD0572026);let k=0;
    while(k<target){
      const R=1.3+Math.pow(rnd(),0.56)*16.2,phi=rnd()*TAU,s=namedArmField(R,phi);
      if(s<0.035&&rnd()>0.12)continue;
      const lane=gaussian(rnd)*(0.055+0.18*s),x=(R+lane)*Math.cos(phi),y=(R+lane)*Math.sin(phi),z=gaussian(rnd)*(0.020+0.010*R);
      const size=1.8+rnd()*7.0,a=(0.018+rnd()*0.075)*(0.28+1.8*s);
      writePoint(out,k++,x,y,z,size,0.006,0.008,0.010,a);
    }
    return out;
  }
  function makeGas(target,red=false){
    const out=new Float32Array(target*8),rnd=mulberry32(red?0x2210001:0x6A500001);let k=0;
    while(k<target){
      const R=2+Math.pow(rnd(),0.55)*15.0,phi=rnd()*TAU,arm=namedArmField(R,phi);
      if(rnd()>0.10+0.78*arm)continue;
      const x=(R+gaussian(rnd)*0.12*arm)*Math.cos(phi),y=(R+gaussian(rnd)*0.12*arm)*Math.sin(phi),z=gaussian(rnd)*(0.025+0.06*arm);
      const size=0.8+rnd()*4.5*(0.6+arm),a=(red?0.018:0.012)+rnd()*(red?0.075:0.045)*(0.4+1.7*arm);
      const c=red?[1.0,0.20+0.22*rnd(),0.20+0.28*rnd()]:[0.35,0.62+0.25*rnd(),1.0];
      writePoint(out,k++,x,y,z,size,c[0],c[1],c[2],a);
    }
    return out;
  }
  function makeHII(target){return makeGas(target,true);}
  function galacticXYZ(l,b,d){
    const lr=l*Math.PI/180,br=b*Math.PI/180,cb=Math.cos(br); const xh=d*cb*Math.cos(lr),yh=d*cb*Math.sin(lr),zh=d*Math.sin(br);return [MW.sunR-xh,yh,zh];
  }
  function makeClusters(target){
    const out=new Float32Array(target*8),rnd=mulberry32(0xC157001);let k=0;
    // Globular clusters: old halo population, concentrated toward the Galactic centre.
    while(k<target){
      const r=2+Math.pow(rnd(),0.48)*28,u=rnd()*2-1,t=Math.sqrt(1-u*u),ph=rnd()*TAU;
      const x=r*t*Math.cos(ph),y=r*t*Math.sin(ph),z=r*u*0.72;
      const size=0.5+rnd()*2.1,a=0.045+rnd()*0.07; writePoint(out,k++,x,y,z,size,1.0,0.78+0.18*rnd(),0.46+0.25*rnd(),a);
    }
    // Large and Small Magellanic Clouds: explicit satellite systems at their observed sky directions.
    const sats=[{l:280.47,b:-32.89,d:50,n:Math.floor(target*.025)},{l:302.80,b:-44.30,d:62,n:Math.floor(target*.015)}];
    for(const s of sats){const q=galacticXYZ(s.l,s.b,s.d);const n=Math.max(20,s.n);for(let i=0;i<n&&k<target;i++){
      const rr=Math.pow(rnd(),0.45)*(i<n*0.15?0.9:2.8),u=rnd()*2-1,t=Math.sqrt(1-u*u),ph=rnd()*TAU;
      writePoint(out,k++,q[0]+rr*t*Math.cos(ph),q[1]+rr*t*Math.sin(ph),q[2]+rr*u,0.16+rnd()*0.75,0.78+0.22*rnd(),0.82+0.18*rnd(),1.0,0.035+rnd()*0.05);
    }}
    return out;
  }

  // v35: procedural intergalactic / rogue-star field. These stars are intentionally
  // not part of the disk: they float at large radii behind the Milky Way and provide
  // the sparse, natural deep-space stellar background seen around real galaxy views.
  function makeBackgroundStars(target=42000){
    const out=new Float32Array(target*8),rnd=mulberry32(0xBADC0FFE);let k=0;
    while(k<target){
      // Keep most stars outside the visible disk but closer than the old 78–100 kpc shell
      // so they remain perceptible without turning the background into a star wall.
      const r=34+Math.pow(rnd(),0.72)*58;
      const u=rnd()*2-1,t=Math.sqrt(1-u*u),ph=rnd()*TAU;
      const x=r*t*Math.cos(ph),y=r*u,z=r*t*Math.sin(ph);
      const hot=rnd()<.15,warm=rnd()<.20;
      const c=hot?[.56,.73,1.0]:warm?[1.0,.72,.48]:[.74,.84,1.0];
      const rareBright=rnd()<.012;
      const size=rareBright?.85+rnd()*.85:.22+rnd()*.72;
      const alpha=rareBright?.18+rnd()*.18:.045+rnd()*.15;
      writePoint(out,k++,x,y,z,size,c[0],c[1],c[2],alpha);
    }
    return out;
  }
  const BG_BACK_VS=`#version 300 es
    precision highp float;layout(location=0)in vec2 aPos;out vec2 vUv;
    void main(){vUv=aPos*.5+.5;gl_Position=vec4(aPos,0.,1.);}`;
  const BG_BACK_FS=`#version 300 es
    precision highp float;in vec2 vUv;out vec4 outColor;
    void main(){
      vec2 p=vUv-.5;
      float radial=1.-smoothstep(.08,.78,length(p*vec2(1.0,.72)));
      float upper=1.-smoothstep(.10,.92,vUv.y);
      vec3 edge=vec3(.006,.018,.040);
      vec3 blue=vec3(.012,.052,.115);
      vec3 center=vec3(.022,.078,.165);
      vec3 c=mix(edge,blue,radial*.72);
      c=mix(c,center,radial*radial*.42);
      c*=.88+.12*upper;
      outColor=vec4(c,1.);
    }`;
  const BG_VS=`#version 300 es
    precision highp float;layout(location=0)in vec3 aPos;layout(location=1)in float aSize;layout(location=2)in vec4 aColor;
    uniform mat4 uView,uProj;uniform float uDpr;out vec4 vColor;
    void main(){vec4 v=uView*vec4(aPos,1.);gl_Position=uProj*v;float ds=clamp(34./max(2.,-v.z),.28,2.8);gl_PointSize=clamp((.24+.78*aSize)*ds*uDpr,.28*uDpr,3.4*uDpr);vColor=vec4(aColor.rgb,aColor.a*.78);}`;
  const BG_FS=`#version 300 es
    precision highp float;in vec4 vColor;out vec4 outColor;
    void main(){vec2 p=gl_PointCoord*2.-1.;float d=dot(p,p);if(d>1.)discard;float core=exp(-7.5*d),halo=exp(-1.4*d);outColor=vec4(vColor.rgb,vColor.a*(.82*core+.18*halo));}`;
  const SUN_VS=`#version 300 es
    precision highp float;layout(location=0)in vec3 aPos;uniform mat4 uView,uProj;uniform float uDpr,uDistance;void main(){vec4 v=uView*vec4(aPos,1.);gl_Position=uProj*v;float ds=clamp(34./max(2.,-v.z),.7,4.2);gl_PointSize=clamp((2.8+1.8*clamp(18./max(1.,uDistance),.35,1.8))*ds*uDpr,4.*uDpr,15.*uDpr);}`;
  const SUN_FS=`#version 300 es
    precision highp float;out vec4 outColor;void main(){vec2 p=gl_PointCoord*2.-1.;float d=dot(p,p);if(d>1.)discard;float core=exp(-9.0*d),halo=exp(-2.0*d);outColor=vec4(1.0,.82,.34,.95*core+.30*halo);}`;
  const GALAXY_VS=`#version 300 es
    precision highp float;layout(location=0)in vec3 aPos;out vec2 vXZ;uniform mat4 uView,uProj;void main(){vXZ=aPos.xz;gl_Position=uProj*uView*vec4(aPos,1.0);}`;
  const GALAXY_FS=`#version 300 es
    precision highp float;in vec2 vXZ;out vec4 outColor;uniform sampler2D uDensityTex;uniform float uDensityEnabled;
    float hash21(vec2 p){p=fract(p*vec2(127.1,311.7));p+=dot(p,p+34.7);return fract(p.x*p.y);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=hash21(i),b=hash21(i+vec2(1,0)),c=hash21(i+vec2(0,1)),d=hash21(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
    float fbm(vec2 p){float s=0.,a=.52;for(int i=0;i<5;i++){s+=a*noise(p);p=p*2.02+11.7;a*=.5;}return s;}
    float arm(vec2 p,float phase,float pitch,float width){float R=length(p),phi=atan(p.y,p.x);if(R<1.6||R>17.2)return 0.;float ph=phase+log(max(R,2.)/4.)/tan(pitch);float d=atan(sin(phi-ph),cos(phi-ph));d-=.10*sin(R*1.7+phase*4.)+.05*sin(R*4.3-phi*2.);return exp(-.5*pow(d/(width*(.82+.025*R)),2.));}
    void main(){vec2 p=vXZ;float R=length(p);if(R>19.)discard;float n=fbm(p*.27+vec2(2.4,-3.7));
      float a1=.34*arm(p,.34,.220, .32),a2=.25*arm(p,1.82,.213,.36),a3=.30*arm(p,3.26,.227,.38),a4=.22*arm(p,4.72,.223,.42);
      float arms=a1+a2+a3+a4;float phi=atan(p.y,p.x);float ds=atan(sin(phi+.58),cos(phi+.58));float spur=.24*smoothstep(1.65,0.,abs(ds))*exp(-.5*pow((R-(8.25+.85*ds))/.30,2.));
      float thin=exp(-R/6.2)*smoothstep(18.,.5,R);float bulge=exp(-R*R/12.);float bar=exp(-pow((p.x*cos(-.46)-p.y*sin(-.46))/2.9,2.)-pow((p.x*sin(-.46)+p.y*cos(-.46))/1.0,2.));
      vec2 uv=p/38.+.5;float corr=(uDensityEnabled>.5)?texture(uDensityTex,uv).r:1.;corr=mix(.72,1.52,corr);
      float cloud=pow(clamp(.45*n+.55*fbm(p*.95+8.),0.,1.),1.7);float diffuse=thin*(.035+.16*n)*(1.+.70*arms)+.018*bulge+.022*bar;float armLight=thin*(.085*arms+.040*spur)*(0.65+.75*n);
      vec3 warm=vec3(1.0,.84,.66),cool=vec3(.60,.74,1.0);vec3 base=mix(warm,cool,smoothstep(2.5,20.5,R));base=mix(base,vec3(1.0,.66,.46),pow(bulge,.72)*.18);float pink=pow(clamp(arms+spur,0.,1.),1.7)*(.18+.82*cloud);base=mix(base,vec3(1.0,.42,.42),pink*.065);
      float light=(diffuse+armLight)*corr;float edge=smoothstep(19.,13.,R);light*=edge;outColor=vec4(base,light);}`;
  // v28 photographic 3D strategy:
  // The same 3D stellar population is rendered twice: first as extremely soft,
  // low-alpha unresolved stellar light, then as a sparse resolved component.
  // This makes millions of stars integrate into a photographic-looking galaxy
  // instead of reading as a cloud of white balls. No 2D galaxy card is used.
  const HAZE_VS=`#version 300 es
    precision highp float;
    layout(location=0)in vec3 aPos;layout(location=1)in float aSize;layout(location=2)in vec4 aColor;
    uniform mat4 uView,uProj;uniform float uDpr,uDistance,uStrength;uniform sampler2D uDensityTex;uniform float uDensityEnabled;
    out vec4 vColor;
    void main(){
      vec4 v=uView*vec4(aPos,1.);gl_Position=uProj*v;
      float depth=max(2.,-v.z);
      float ds=clamp(34./depth,.34,7.0);
      float R=length(aPos.xz);
      float inner=1.-smoothstep(1.8,11.5,R);
      float outer=smoothstep(9.0,18.5,R);
      vec2 uv=aPos.xz/38.+.5;
      float density=(uDensityEnabled>.5&&R<19.)?texture(uDensityTex,uv).r:1.;
      density=mix(.58,1.75,density);
      // Broad unresolved light: larger soft kernels represent the integrated flux of
      // many unresolved stars. The Gaia-calibrated density field modulates the flux.
      float size=(2.15+3.65*aSize)*ds*uDpr*(.86+.48*inner)*mix(.72,1.35,density/1.75);
      gl_PointSize=clamp(size,.8*uDpr,24.0*uDpr);
      vec3 c=aColor.rgb;
      c=mix(c,vec3(1.0,.70,.43),inner*.20);
      c=mix(c,vec3(.30,.55,1.0),outer*.14);
      float glowWeight=mix(.62,1.15,clamp(aSize/1.5,0.,1.));
      float armFlux=.62+.62*clamp(density-1.0,0.,.75);
      float lum=dot(c,vec3(.2126,.7152,.0722)); c=mix(vec3(lum),c,1.48); c=clamp(c,0.,1.); vColor=vec4(c,aColor.a*uStrength*(.30+.42*inner)*glowWeight*armFlux);
    }`;
  const HAZE_FS=`#version 300 es
    precision highp float;in vec4 vColor;out vec4 outColor;
    void main(){
      vec2 p=gl_PointCoord*2.-1.;float d=dot(p,p);if(d>1.)discard;
      // Gaussian core + broad halo; no hard circular particles.
      float g=exp(-5.0*d);float h=exp(-1.05*d);
      float a=vColor.a*(.72*g+.28*h);
      outColor=vec4(vColor.rgb,a);
    }`;
  const PROC_VS=`#version 300 es
    precision highp float;layout(location=0)in vec3 aPos;layout(location=1)in float aSize;layout(location=2)in vec4 aColor;
    uniform mat4 uView,uProj;uniform float uDpr,uBoost,uDistance;uniform sampler2D uDensityTex;uniform float uDensityEnabled;
    out vec4 vColor;
    void main(){
      vec4 v=uView*vec4(aPos,1.);gl_Position=uProj*v;
      float depth=max(2.,-v.z),ds=clamp(30./depth,.28,5.0);
      float R=length(aPos.xz),phi=atan(aPos.z,aPos.x);
      float bulge=1.-smoothstep(1.2,5.5,R);
      vec2 uv=aPos.xz/38.+.5;float corr=(uDensityEnabled>.5&&R<19.)?texture(uDensityTex,uv).r:1.;corr=mix(.78,1.20,corr);
      // Resolved component: visible stellar points sit above the integrated-light haze. The haze carries the unresolved population; this pass restores the star field visible in photographic references.
      float size=(.46+1.05*aSize)*ds*uDpr*(.82+.18*bulge);
      gl_PointSize=clamp(size,.42*uDpr,5.4*uDpr);
      vec3 c=aColor.rgb;
      float lum=dot(c,vec3(.2126,.7152,.0722)); c=mix(vec3(lum),c,1.22); c=clamp(c,0.,1.);
      c=mix(c,vec3(1.0,.68,.40),bulge*.16);
      float starAlpha = aColor.a * uBoost * corr * (0.98 + 2.45*aSize); vColor=vec4(c,clamp(starAlpha,0.012,0.34));
    }`;
  const PROC_FS=`#version 300 es
    precision highp float;in vec4 vColor;out vec4 outColor;
    void main(){
      // Most procedural stars remain unresolved: they contribute through the
      // integrated-light pass, while only the brighter tail resolves into points.
      if(vColor.a<0.095)discard;
      vec2 p=gl_PointCoord*2.-1.;float d=dot(p,p);if(d>1.)discard;
      float core=exp(-7.6*d);float halo=exp(-1.35*d);
      float bright=clamp((vColor.a-.095)*7.5,0.,1.);
      float a=vColor.a*(.92*core+.08*halo)+vColor.a*.08*bright*halo;
      outColor=vec4(vColor.rgb,a);
    }`;
  const HALO_VS=PROC_VS;
  const HALO_FS=PROC_FS;
  const DUST_VS=`#version 300 es
    precision highp float;layout(location=0)in vec3 aPos;layout(location=1)in float aSize;layout(location=2)in vec4 aColor;uniform mat4 uView,uProj;uniform float uDpr,uBoost,uDistance;out vec4 vColor;void main(){vec4 v=uView*vec4(aPos,1.);gl_Position=uProj*v;float ds=clamp(34./max(2.,-v.z),.38,6.5);gl_PointSize=clamp(aSize*ds*uDpr*2.1,.45*uDpr,16.*uDpr);vColor=vec4(aColor.rgb,aColor.a*uBoost);}`;
  const DUST_FS=`#version 300 es
    precision highp float;in vec4 vColor;out vec4 outColor;void main(){vec2 p=gl_PointCoord*2.-1.;float d=dot(p,p);if(d>1.)discard;float soft=exp(-1.35*d);outColor=vec4(vColor.rgb,vColor.a*soft);}`;
  const REAL_VS=`#version 300 es
    precision highp float;layout(location=0)in vec3 aPos;layout(location=1)in float aMag;layout(location=2)in vec3 aColor;uniform mat4 uView,uProj;uniform float uDpr,uZoom,uGalaxyFade;out float vMag;out vec3 vColor;out float vFade;void main(){vec4 v=uView*vec4(aPos,1.);gl_Position=uProj*v;float ds=clamp(22./max(2.,-v.z),.30,4.6);float b=clamp((7.-aMag)/5.5,.025,1.);gl_PointSize=clamp((.18+b*1.28)*ds*uDpr*(.94+.06*uZoom),.24*uDpr,7.2*uDpr);vMag=aMag;vColor=aColor;vFade=uGalaxyFade;}`;
  const REAL_FS=`#version 300 es
    precision highp float;in float vMag;in vec3 vColor;in float vFade;out vec4 outColor;void main(){vec2 p=gl_PointCoord*2.-1.;float d=dot(p,p);if(d>1.)discard;float core=exp(-5.8*d),halo=exp(-.82*d);float bright=clamp((3.8-vMag)/4.6,0.,1.);float baseA=clamp((8.-vMag)/6.6,.002,.72);float a=baseA*(.78*core+.16*halo+.12*bright*halo)*vFade;vec3 c=mix(vColor,vec3(.72,.80,.94),.22)+vec3(core*(.04+.16*bright));outColor=vec4(c,a);}`;

  // v32 integrated-light pipeline: render the unresolved stellar population into a
  // low-resolution 3D scene buffer, then perform a small separable Gaussian blur.
  // This makes dense stellar populations integrate into photographic-looking light
  // instead of reading as millions of independent points. The geometry remains 3D.
  const BLUR_VS=`#version 300 es
    precision highp float;layout(location=0)in vec2 aPos;out vec2 vUv;
    void main(){vUv=aPos*.5+.5;gl_Position=vec4(aPos,0.,1.);}`;
  const BLUR_FS=`#version 300 es
    precision highp float;in vec2 vUv;out vec4 outColor;
    uniform sampler2D uTex;uniform vec2 uTexel;uniform vec2 uDir;uniform float uStrength;
    void main(){
      vec3 c=texture(uTex,vUv).rgb*.227027;
      c+=texture(uTex,vUv+uDir*uTexel*1.384615).rgb*.316216;
      c+=texture(uTex,vUv-uDir*uTexel*1.384615).rgb*.316216;
      c+=texture(uTex,vUv+uDir*uTexel*3.230769).rgb*.070270;
      c+=texture(uTex,vUv-uDir*uTexel*3.230769).rgb*.070270;
      outColor=vec4(c*uStrength,1.);
    }`;
  function perspective(out,fovy,aspect,near,far){const f=1/Math.tan(fovy/2),nf=1/(near-far);out[0]=f/aspect;out[1]=0;out[2]=0;out[3]=0;out[4]=0;out[5]=f;out[6]=0;out[7]=0;out[8]=0;out[9]=0;out[10]=(far+near)*nf;out[11]=-1;out[12]=0;out[13]=0;out[14]=2*far*near*nf;out[15]=0;return out;}
  function lookAt(out,e,c,u){let zx=e[0]-c[0],zy=e[1]-c[1],zz=e[2]-c[2],l=Math.hypot(zx,zy,zz)||1;zx/=l;zy/=l;zz/=l;let xx=u[1]*zz-u[2]*zy,xy=u[2]*zx-u[0]*zz,xz=u[0]*zy-u[1]*zx;l=Math.hypot(xx,xy,xz)||1;xx/=l;xy/=l;xz/=l;const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;out[0]=xx;out[1]=yx;out[2]=zx;out[3]=0;out[4]=xy;out[5]=yy;out[6]=zy;out[7]=0;out[8]=xz;out[9]=yz;out[10]=zz;out[11]=0;out[12]=-(xx*e[0]+xy*e[1]+xz*e[2]);out[13]=-(yx*e[0]+yy*e[1]+yz*e[2]);out[14]=-(zx*e[0]+zy*e[1]+zz*e[2]);out[15]=1;return out;}
  function link(gl,vs,fs){const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,vs));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
  function buffer(gl,data){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return b;}
  function bindProc(gl,b){gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,32,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,1,gl.FLOAT,false,32,12);gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,4,gl.FLOAT,false,32,16);}
  function bindReal(gl,b){gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,28,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,1,gl.FLOAT,false,28,12);gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,3,gl.FLOAT,false,28,16);}
  function realBuffer(gl,stars){
    if(stars && stars.data instanceof Float32Array){
      // Stored Gaia convention is X,Y,Z with Galactic plane XY. Swap Y/Z for the renderer's XZ plane.
      const src=stars.data,count=stars.count;const d=new Float32Array(count*7);
      for(let i=0;i<count;i++){const s=i*7,o=i*7;d[o]=src[s];d[o+1]=src[s+2];d[o+2]=src[s+1];d[o+3]=src[s+3];d[o+4]=src[s+4];d[o+5]=src[s+5];d[o+6]=src[s+6];}
      return {buffer:buffer(gl,d),count};
    }
    const v=(stars||[]).filter(s=>Number.isFinite(+s.x)&&Number.isFinite(+s.y)&&Number.isFinite(+s.z));const d=new Float32Array(v.length*7);
    for(let i=0;i<v.length;i++){const s=v[i],o=i*7,c=s.c||[.86,.88,1];d[o]=+s.x;d[o+1]=+s.z;d[o+2]=+s.y;d[o+3]=Number.isFinite(+s.mag)?+s.mag:8;d[o+4]=c[0];d[o+5]=c[1];d[o+6]=c[2];}
    return {buffer:buffer(gl,d),count:v.length};
  }
  function makeDensityTexture(gl,grid){const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);const data=grid||new Uint8Array(DENSITY_W*DENSITY_H).fill(255);gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,DENSITY_W,DENSITY_H,0,gl.RED,gl.UNSIGNED_BYTE,data);gl.bindTexture(gl.TEXTURE_2D,null);return tex;}
  function renderer(canvas,stars,models,options={}){
    const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:false});if(!gl)throw Error('WebGL2 unavailable');
    const rendererName=String(gl.getParameter(gl.RENDERER)||'').toLowerCase();
    const isAdreno710=/adreno.*710/.test(rendererName);
    const isMobile=/android|iphone|ipad|mobile/.test(navigator.userAgent||'');
    const targetFPS=isMobile?45:60, frameBudget=1000/targetFPS;
    const starTotal=Math.floor(models.stars.length/8);
    const starCap=Math.min(starTotal,isAdreno710?1000000:(isMobile?900000:1200000));
    let starDrawCount=Math.min(starCap,isMobile?700000:900000),perfGood=0,perfBad=0,lastFrame=performance.now();
    const bgBackP=link(gl,BG_BACK_VS,BG_BACK_FS),bgP=link(gl,BG_VS,BG_FS),sunP=link(gl,SUN_VS,SUN_FS),hazeP=link(gl,HAZE_VS,HAZE_FS),procP=link(gl,PROC_VS,PROC_FS),haloP=link(gl,HALO_VS,HALO_FS),dustP=link(gl,DUST_VS,DUST_FS),blurP=link(gl,BLUR_VS,BLUR_FS);
    const bgQuad=buffer(gl,new Float32Array([-1,-1,1,-1,-1,1,1,1])),bgData=makeBackgroundStars(42000),bgBuf=buffer(gl,bgData),procBuf=buffer(gl,models.stars),haloBuf=buffer(gl,models.halo),dustBuf=buffer(gl,models.dust),gasBuf=buffer(gl,models.gas),hiiBuf=buffer(gl,models.hii),clusterBuf=buffer(gl,models.clusters); bgBuf.count=Math.floor(bgData.length/8);
    const sunPos=buffer(gl,new Float32Array([SUN_X,0,SUN_Z]));
    procBuf.starsCount=Math.floor(models.stars.length/8);haloBuf.count=Math.floor(models.halo.length/8);dustBuf.count=Math.floor(models.dust.length/8);gasBuf.count=Math.floor(models.gas.length/8);hiiBuf.count=Math.floor(models.hii.length/8);clusterBuf.count=Math.floor(models.clusters.length/8);
    const densityTex=makeDensityTexture(gl,null),densityEnabled=0;
    const quad=buffer(gl,new Float32Array([-1,-1,1,-1,-1,1,1,1]));
    let sceneFbo=null,sceneTex=null,blurFbo=null,blurTex=null,sceneW=1,sceneH=1;
    function allocLightBuffers(w,h){
      sceneW=Math.max(1,Math.floor(w*.55));sceneH=Math.max(1,Math.floor(h*.55));
      for(const f of [sceneTex,blurTex])if(f)gl.deleteTexture(f);for(const f of [sceneFbo,blurFbo])if(f)gl.deleteFramebuffer(f);
      const tex=()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,sceneW,sceneH,0,gl.RGBA,gl.UNSIGNED_BYTE,null);return t;};
      sceneTex=tex();blurTex=tex();
      sceneFbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,sceneFbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,sceneTex,0);
      blurFbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,blurFbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,blurTex,0);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindTexture(gl.TEXTURE_2D,null);
    }
    let yaw=0.08,pitch=0.88,distance=25,target=[0,0,0],drag=false,lx=0,ly=0,raf=0,alive=true,zoom=1;
    const view=new Float32Array(16),proj=new Float32Array(16);
    const tooltip=document.getElementById('galaxyTooltip');
    const featurePoint=(R,phi,y=0)=>[R*Math.cos(phi),y,R*Math.sin(phi)];
    const featureList=[
      {id:'sun',name:'The Sun',meta:'Solar System · Orion Spur',pos:[SUN_X,0,SUN_Z],copy:'Our Solar System lies about 8.2 kpc from the Galactic centre, in a small branch called the Orion Spur.',distance:'≈ 26,700 light-years from the Galactic centre'},
      {id:'core',name:'Galactic Centre',meta:'Central bulge · Sagittarius A*',pos:[0,0,0],copy:'The dense central region of the Milky Way surrounds Sagittarius A*, the supermassive black hole at its heart.',distance:'≈ 8.2 kpc from the Sun'},
      {id:'bar',name:'Central Bar',meta:'Barred-spiral structure',pos:featurePoint(1.65,MW.barAngle),copy:'The Milky Way is a barred spiral. This elongated stellar bar connects the inner bulge to the larger spiral structure.',distance:'Several kiloparsecs long'},
      {id:'scutum',name:'Scutum–Centaurus Arm',meta:'Major spiral arm',pos:featurePoint(10.2,MW.arms[0].phase+Math.log(10.2/4)/Math.tan(MW.arms[0].pitch*Math.PI/180)),copy:'One of the Milky Way’s major spiral arms, rich in molecular clouds, young stars and star-forming regions.',distance:'Outer-disk structure'},
      {id:'sagittarius',name:'Sagittarius–Carina Arm',meta:'Major spiral arm',pos:featurePoint(8.9,MW.arms[1].phase+Math.log(8.9/4)/Math.tan(MW.arms[1].pitch*Math.PI/180)),copy:'A prominent spiral arm containing many bright nebulae and active star-forming regions.',distance:'Passes through the inner Galactic disk'},
      {id:'perseus',name:'Perseus Arm',meta:'Major spiral arm',pos:featurePoint(12.1,MW.arms[2].phase+Math.log(12.1/4)/Math.tan(MW.arms[2].pitch*Math.PI/180)),copy:'A broad outer spiral structure. From the Solar neighbourhood it is one of the major arms beyond the Orion Spur.',distance:'Outer Milky Way disk'},
      {id:'orion',name:'Orion Spur',meta:'Solar neighbourhood',pos:featurePoint(MW.spur.radius+0.35,MW.spur.phase),copy:'A relatively small spur between the Sagittarius–Carina and Perseus arms. The Sun resides here.',distance:'≈ 8.2 kpc from the Galactic centre'},
      {id:'halo',name:'Stellar Halo',meta:'Extended Galactic component',pos:[18,4,0],copy:'A huge, diffuse population of old stars and globular clusters surrounding the main Galactic disk.',distance:'Extends far beyond the visible disk'}
    ];
    let hoverFeature=null,lastPointer=[0,0],pointerMoved=false;
    function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);const w=Math.max(1,Math.floor(r.width*d)),h=Math.max(1,Math.floor(r.height*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;allocLightBuffers(w,h);}gl.viewport(0,0,canvas.width,canvas.height);}
    function camera(){const cp=Math.cos(pitch),sp=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw);return[target[0]+distance*cp*cy,target[1]+distance*sp,target[2]+distance*cp*sy];}
    function uniforms(p){gl.uniformMatrix4fv(gl.getUniformLocation(p,'uView'),false,view);gl.uniformMatrix4fv(gl.getUniformLocation(p,'uProj'),false,proj);gl.uniform1f(gl.getUniformLocation(p,'uDpr'),Math.min(devicePixelRatio||1,2));gl.uniform1f(gl.getUniformLocation(p,'uDistance'),distance);}
    function projectPoint(pos){
      const x=pos[0],y=pos[1],z=pos[2];
      const vx=view[0]*x+view[4]*y+view[8]*z+view[12],vy=view[1]*x+view[5]*y+view[9]*z+view[13],vz=view[2]*x+view[6]*y+view[10]*z+view[14],vw=view[3]*x+view[7]*y+view[11]*z+view[15];
      const cx=proj[0]*vx+proj[4]*vy+proj[8]*vz+proj[12]*vw,cy=proj[1]*vx+proj[5]*vy+proj[9]*vz+proj[13]*vw,cw=proj[3]*vx+proj[7]*vy+proj[11]*vz+proj[15]*vw;
      if(cw<=0.001)return null;
      const ndcX=cx/cw,ndcY=cy/cw;
      if(ndcX<-1.15||ndcX>1.15||ndcY<-1.15||ndcY>1.15)return null;
      const r=canvas.getBoundingClientRect();
      return {x:(ndcX*.5+.5)*r.width,y:(1-(ndcY*.5+.5))*r.height};
    }
    function updateTooltip(x,y,force=false){
      if(!tooltip)return;
      const r=canvas.getBoundingClientRect(),px=x-r.left,py=y-r.top;
      let best=null,bestD=Infinity;
      for(const f of featureList){const p=projectPoint(f.pos);if(!p)continue;const d=Math.hypot(p.x-px,p.y-py);if(d<bestD&&d<24){best=f;bestD=d;}}
      if(!best){if(!force){hoverFeature=null;tooltip.classList.remove('visible');tooltip.setAttribute('aria-hidden','true');}return;}
      hoverFeature=best;tooltip.innerHTML='<div class=\"tt-title\">'+best.name+'</div><div class=\"tt-meta\">'+best.meta+'</div><div class=\"tt-copy\">'+best.copy+'</div><div class=\"tt-distance\">'+best.distance+'</div>';
      tooltip.classList.add('visible');tooltip.setAttribute('aria-hidden','false');
      if(matchMedia('(max-width: 800px)').matches){tooltip.style.left='';tooltip.style.top='';}else{const tx=Math.min(r.width-350,Math.max(10,px+12)),ty=Math.min(r.height-145,Math.max(10,py+12));tooltip.style.left=tx+'px';tooltip.style.top=ty+'px';}
    }
    function draw(){if(!alive)return;resize();const eye=camera();lookAt(view,eye,target,[0,1,0]);perspective(proj,Math.PI/3,canvas.width/canvas.height,.03,160);
      // Deep-space galactic-blue background, followed by the sparse distant rogue-star field.
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.useProgram(bgBackP);gl.bindBuffer(gl.ARRAY_BUFFER,bgQuad);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.useProgram(bgP);uniforms(bgP);bindProc(gl,bgBuf);gl.drawArrays(gl.POINTS,0,bgBuf.count);
      // Pass A: accumulate unresolved stellar luminosity into a half-resolution 3D buffer.
      // This is a true view of the 3D point population, not a 2D galaxy card.
      gl.bindFramebuffer(gl.FRAMEBUFFER,sceneFbo);gl.viewport(0,0,sceneW,sceneH);gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(hazeP);uniforms(hazeP);gl.uniform1f(gl.getUniformLocation(hazeP,'uStrength'),.062);gl.uniform1i(gl.getUniformLocation(hazeP,'uDensityTex'),0);gl.uniform1f(gl.getUniformLocation(hazeP,'uDensityEnabled'),densityEnabled);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,densityTex);bindProc(gl,procBuf);gl.drawArrays(gl.POINTS,0,starDrawCount);
      // Pass B/C: separable blur of the accumulated stellar light.
      gl.bindFramebuffer(gl.FRAMEBUFFER,blurFbo);gl.viewport(0,0,sceneW,sceneH);gl.disable(gl.BLEND);gl.useProgram(blurP);gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,sceneTex);gl.uniform1i(gl.getUniformLocation(blurP,'uTex'),0);gl.uniform2f(gl.getUniformLocation(blurP,'uTexel'),1/sceneW,1/sceneH);gl.uniform2f(gl.getUniformLocation(blurP,'uDir'),1,0);gl.uniform1f(gl.getUniformLocation(blurP,'uStrength'),1.0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.useProgram(blurP);gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,blurTex);gl.uniform1i(gl.getUniformLocation(blurP,'uTex'),0);gl.uniform2f(gl.getUniformLocation(blurP,'uTexel'),1/sceneW,1/sceneH);gl.uniform2f(gl.getUniformLocation(blurP,'uDir'),0,1);gl.uniform1f(gl.getUniformLocation(blurP,'uStrength'),.50);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      // Resolved model stars sit over the integrated light, followed by gas/dust and real Gaia stars.
      gl.enable(gl.BLEND);gl.useProgram(procP);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);uniforms(procP);gl.uniform1f(gl.getUniformLocation(procP,'uBoost'),1.48);gl.uniform1i(gl.getUniformLocation(procP,'uDensityTex'),0);gl.uniform1f(gl.getUniformLocation(procP,'uDensityEnabled'),densityEnabled);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,densityTex);bindProc(gl,procBuf);gl.drawArrays(gl.POINTS,0,starDrawCount);
      gl.useProgram(haloP);uniforms(haloP);gl.uniform1f(gl.getUniformLocation(haloP,'uBoost'),.92);bindProc(gl,haloBuf);gl.drawArrays(gl.POINTS,0,haloBuf.count);
      gl.useProgram(dustP);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);uniforms(dustP);gl.uniform1f(gl.getUniformLocation(dustP,'uBoost'),.34);bindProc(gl,gasBuf);gl.drawArrays(gl.POINTS,0,gasBuf.count);gl.uniform1f(gl.getUniformLocation(dustP,'uBoost'),.50);bindProc(gl,hiiBuf);gl.drawArrays(gl.POINTS,0,hiiBuf.count);gl.uniform1f(gl.getUniformLocation(dustP,'uBoost'),.24);bindProc(gl,dustBuf);gl.drawArrays(gl.POINTS,0,dustBuf.count);gl.uniform1f(gl.getUniformLocation(dustP,'uBoost'),.24);bindProc(gl,clusterBuf);gl.drawArrays(gl.POINTS,0,clusterBuf.count);
      // The Sun is fixed at 8.20 kpc from the Galactic centre. The locator view reveals that
      // position in the same 3D coordinate system as the Milky Way model, without a connecting line.
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(sunP);uniforms(sunP);gl.bindBuffer(gl.ARRAY_BUFFER,sunPos);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);gl.drawArrays(gl.POINTS,0,1);
      if(hoverFeature) updateTooltip(lastPointer[0],lastPointer[1],true);
      const now=performance.now(),dt=now-lastFrame;lastFrame=now;
      if(dt>frameBudget*1.18){perfBad++;perfGood=0;if(perfBad>=5){starDrawCount=Math.max(350000,Math.floor(starDrawCount*.82));perfBad=0;}}
      else if(dt<frameBudget*.78){perfGood++;perfBad=0;if(perfGood>=12){starDrawCount=Math.min(starCap,Math.floor(starDrawCount*1.08));perfGood=0;}}
      raf=requestAnimationFrame(draw);
    }
    function setView(k){if(k==='sun'){target=[SUN_X,0,SUN_Z];yaw=Math.PI;pitch=.08;distance=2.4;zoom=1.8;}else if(k==='locate-sun'){target=[0,0,0];yaw=0.02;pitch=1.12;distance=27.5;zoom=1;}else if(k==='center'){target=[0,0,0];yaw=.12;pitch=.12;distance=7.2;zoom=1.2;}else{target=[0,0,0];yaw=.08;pitch=.88;distance=25;zoom=1;}}
    canvas.onpointerdown=e=>{drag=true;pointerMoved=false;lx=e.clientX;ly=e.clientY;lastPointer=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);if(e.pointerType==='mouse')updateTooltip(e.clientX,e.clientY);};
    canvas.onpointermove=e=>{lastPointer=[e.clientX,e.clientY];if(!drag){updateTooltip(e.clientX,e.clientY);return;}const dx=e.clientX-lx,dy=e.clientY-ly;if(Math.abs(dx)+Math.abs(dy)>3)pointerMoved=true;lx=e.clientX;ly=e.clientY;yaw-=dx*.004;pitch=clamp(pitch+dy*.003,-1.48,1.48);if(pointerMoved&&tooltip){tooltip.classList.remove('visible');tooltip.setAttribute('aria-hidden','true');hoverFeature=null;}};
    canvas.onpointerup=e=>{drag=false;if(!pointerMoved)updateTooltip(e.clientX,e.clientY,true);};
    canvas.onpointercancel=()=>{drag=false;pointerMoved=false;};
    canvas.onwheel=e=>{e.preventDefault();distance=clamp(distance*Math.exp(e.deltaY*.0012),.35,68);zoom=clamp(30/distance,.55,4);};
    resize();requestAnimationFrame(draw);
    return{setView,destroy(){alive=false;cancelAnimationFrame(raf);for(const b of [bgQuad,bgBuf,procBuf,haloBuf,dustBuf,gasBuf,hiiBuf,clusterBuf,sunPos,quad])gl.deleteBuffer(b);for(const f of [sceneTex,blurTex])if(f)gl.deleteTexture(f);for(const f of [sceneFbo,blurFbo])if(f)gl.deleteFramebuffer(f);gl.deleteProgram(bgBackP);gl.deleteProgram(bgP);gl.deleteProgram(sunP);gl.deleteProgram(hazeP);gl.deleteProgram(procP);gl.deleteProgram(haloP);gl.deleteProgram(dustP);gl.deleteProgram(blurP);gl.deleteTexture(densityTex);}};
  }

  async function gunzipB64(b64){
    const bin=atob(b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
    if(typeof DecompressionStream==='undefined')throw Error('DecompressionStream unavailable');
    const ds=new DecompressionStream('gzip');const stream=new Blob([u8]).stream().pipeThrough(ds);return await new Response(stream).arrayBuffer();
  }
  async function decodeEmbeddedModel(name){
    const pack=window.STARSIGHT_EMBEDDED_GALAXY?.[name];if(!pack)throw Error('embedded model '+name+' unavailable');
    const a=await gunzipB64(pack),dv=new DataView(a);if(dv.byteLength<36||dv.getUint32(0,false)!==0x47513141)throw Error('bad embedded model');
    const n=dv.getUint32(4,true),mn=[dv.getFloat32(8,true),dv.getFloat32(12,true),dv.getFloat32(16,true)],mx=[dv.getFloat32(20,true),dv.getFloat32(24,true),dv.getFloat32(28,true)],sizeMax=dv.getFloat32(32,true);
    const src=new Uint8Array(a,36),out=new Float32Array(n*8);
    for(let i=0;i<n;i++){const q=i*11,o=i*8;const x=src[q]|(src[q+1]<<8),y=src[q+2]|(src[q+3]<<8),z=src[q+4]|(src[q+5]<<8);out[o]=mn[0]+x/65535*(mx[0]-mn[0]);out[o+1]=mn[1]+y/65535*(mx[1]-mn[1]);out[o+2]=mn[2]+z/65535*(mx[2]-mn[2]);out[o+3]=(src[q+6]/255)*sizeMax;out[o+4]=src[q+7]/255;out[o+5]=src[q+8]/255;out[o+6]=src[q+9]/255;out[o+7]=src[q+10]/255;}
    return out;
  }
  async function loadQuantizedStars(){
    const decode=async(a)=>{const dv=new DataView(a);if(dv.byteLength<36||dv.getUint32(0,false)!==0x47513141)throw Error('bad GQ1A');const n=dv.getUint32(4,true),mn=[dv.getFloat32(8,true),dv.getFloat32(12,true),dv.getFloat32(16,true)],mx=[dv.getFloat32(20,true),dv.getFloat32(24,true),dv.getFloat32(28,true)],sm=dv.getFloat32(32,true),src=new Uint8Array(a,36),out=new Float32Array(n*8);for(let i=0;i<n;i++){const q=i*11,o=i*8;const x=src[q]|(src[q+1]<<8),y=src[q+2]|(src[q+3]<<8),z=src[q+4]|(src[q+5]<<8);out[o]=mn[0]+x/65535*(mx[0]-mn[0]);out[o+1]=mn[1]+y/65535*(mx[1]-mn[1]);out[o+2]=mn[2]+z/65535*(mx[2]-mn[2]);out[o+3]=src[q+6]/255*sm;out[o+4]=src[q+7]/255;out[o+5]=src[q+8]/255;out[o+6]=src[q+9]/255;out[o+7]=src[q+10]/255;}return out;};
    try{const r=await fetch(DATA_BASE+'model-stars-q.bin',{cache:'no-store'});if(r.ok)return await decode(await r.arrayBuffer());}catch(_){}
    return await decodeEmbeddedModel('stars');
  }
  async function loadModel(name){try{const r=await fetch(DATA_BASE+'model-'+name+'.bin',{cache:'no-store'});if(r.ok){const a=await r.arrayBuffer();return new Float32Array(a);}}catch(_){ }return await decodeEmbeddedModel(name);}
  async function loadModels(){
    const out={};out.stars=await loadQuantizedStars();
    for(const name of ['halo','dust','gas','hii','clusters']){try{out[name]=await loadModel(name);}catch(e){console.warn('Milky Way layer unavailable:',name,e);out[name]=new Float32Array(0);}}
    if(out.stars.length===0) out.stars=makeGalaxyStars(MODEL_STARS);
    if(out.halo.length===0) out.halo=makeHalo(MODEL_HALO);
    if(out.dust.length===0) out.dust=makeDust(MODEL_DUST);
    if(out.gas.length===0) out.gas=makeGas(MODEL_GAS,false);
    if(out.hii.length===0) out.hii=makeHII(MODEL_HII);
    if(out.clusters.length===0) out.clusters=makeClusters(MODEL_CLUSTERS);
    return out;
  }
  async function init(){
    if(active)return active;const canvas=document.getElementById('galaxyCanvas');if(!canvas)return null;
    try{
      status('Building high-density procedural Milky Way…');
      const models=await loadModels();
      const modelCount=Math.floor(models.stars.length/8);
      const total=modelCount+Math.floor(models.halo.length/8)+Math.floor(models.dust.length/8)+Math.floor(models.gas.length/8)+Math.floor(models.hii.length/8)+Math.floor(models.clusters.length/8);
      count(total);
      active=renderer(canvas,null,models,{});
      status(`${modelCount.toLocaleString()} procedural stars · adaptive mobile LOD · 3D stellar density · thin/thick disk · barred bulge · 4 irregular arms · Orion spur · gas/HII · dust · halo · clusters`);
      document.getElementById('galaxyLoading')?.classList.add('hidden');
      document.getElementById('galaxyHomeBtn')?.addEventListener('click',()=>active?.setView('sun'));
      document.getElementById('galaxyLocateSunBtn')?.addEventListener('click',()=>active?.setView('locate-sun'));
      document.getElementById('galaxyCenterBtn')?.addEventListener('click',()=>active?.setView('center'));
      document.getElementById('galaxyTopBtn')?.addEventListener('click',()=>active?.setView('top'));
      return active;
    }catch(e){console.error('Milky Way init failed',e);status('Milky Way renderer error — WebGL2 or data unavailable');document.getElementById('galaxyLoading')?.classList.add('hidden');return null;}
  }
  window.initMilkyWayExplorer=init;
})();
