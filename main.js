// --- ORIGINAL RENDER AND UI LOGIC ---

function createBgStars() {
    const container = document.getElementById('bgStars');
    for (let i = 0; i < 60; i++) {
        const star = document.createElement('div');
        star.className = 'bg-star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        const size = Math.random() * 2 + 1;
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.setProperty('--duration', (Math.random() * 3 + 2) + 's');
        star.style.setProperty('--delay', (Math.random() * 5) + 's');
        star.style.setProperty('--min-op', (Math.random() * 0.3 + 0.1));
        star.style.setProperty('--max-op', (Math.random() * 0.5 + 0.4));
        container.appendChild(star);
    }
    for (let i = 0; i < 2; i++) {
        const shoot = document.createElement('div');
        shoot.className = 'shooting-star';
        shoot.style.left = (Math.random() * 60 + 10) + '%';
        shoot.style.top = (Math.random() * 25 + 5) + '%';
        shoot.style.setProperty('--shoot-dur', (Math.random() * 6 + 8) + 's');
        shoot.style.setProperty('--shoot-delay', (Math.random() * 20 + 5) + 's');
        container.appendChild(shoot);
    }
}
createBgStars();

function galacticToEquatorial(l, b) {
    const l_rad = l * Math.PI / 180;
    const b_rad = b * Math.PI / 180;
    
    const alpha_p = 192.85948 * Math.PI / 180; 
    const delta_p = 27.12825 * Math.PI / 180;   
    const l_cp = 122.93192 * Math.PI / 180;   

    const sin_b = Math.sin(b_rad);
    const cos_b = Math.cos(b_rad);
    const sin_dp = Math.sin(delta_p);
    const cos_dp = Math.cos(delta_p);
    
    const sin_d = sin_dp * sin_b + cos_dp * cos_b * Math.cos(l_cp - l_rad);
    const dec = Math.asin(sin_d);
    
    const y = cos_b * Math.sin(l_cp - l_rad);
    const x = cos_dp * sin_b - sin_dp * cos_b * Math.cos(l_cp - l_rad);
    
    let ra = alpha_p + Math.atan2(y, x);
    if (ra < 0) ra += 2 * Math.PI;
    if (ra > 2 * Math.PI) ra -= 2 * Math.PI;
    
    return { ra: ra * 180 / Math.PI, dec: dec * 180 / Math.PI };
}

const MW_BLOBS = [];
const MW_STARS = [];
// Fine-scale Milky Way filaments and dust lanes. These are anchored in Galactic
// coordinates so the visual texture follows the scientifically projected band.
const MW_FINE = [];
const MW_DUST = [];
const MW_FILAMENTS = [];

function initMilkyWay() {
    for (let l = 0; l < 360; l += 3) {
        const l_wrapped = (l > 180) ? 360 - l : l; 
        const intensity = Math.pow(1 - (l_wrapped / 180), 1.5); 
        const coreWidth = 8 + intensity * 18; 
        const maxAlpha = 0.015 + intensity * 0.04; 
        
        const rCol = Math.round(150 + intensity * 40);
        const gCol = Math.round(170 + intensity * 15);
        const bCol = Math.round(200 - intensity * 30);
        const colorStr = `${rCol}, ${gCol}, ${bCol}`;

        for (let j = 0; j < 5; j++) {
            const bOffset = (Math.random() - 0.5) * coreWidth;
            let a = maxAlpha * (Math.random() * 0.6 + 0.4);
            if ((l > 320 || l < 80) && Math.abs(bOffset) < 4) a *= 0.15; 
            if (l > 340 || l < 20) { if (bOffset > 1 && bOffset < 5) a *= 0.3; }
            const eq = galacticToEquatorial(l, bOffset);
            MW_BLOBS.push({ raHrs: eq.ra / 15, dec: eq.dec, sizeDeg: Math.random() * 9 + 4, alpha: a, color: colorStr });
        }

        for(let k = 0; k < 15; k++) {
            const bOffset = (Math.random() - 0.5) * coreWidth * 1.2;
            const lOffset = l + (Math.random() - 0.5) * 3;
            const eq = galacticToEquatorial(lOffset, bOffset);
            MW_STARS.push({ raHrs: eq.ra / 15, dec: eq.dec, sizeDeg: Math.random() * 0.6 + 0.1, baseAlpha: Math.random() * 0.8 + 0.1, blinkSpd: Math.random() * 2.0 + 0.5, blinkOff: Math.random() * Math.PI * 2 });
        }
    }

    // Fine photographic structure: irregular filaments concentrated around b=0.
    for (let l = 0; l < 360; l += 2) {
        const rad = l * Math.PI / 180;
        const core = Math.exp(-Math.pow(Math.min(Math.abs(((l + 180) % 360) - 180), 180) / 42, 2));
        for (let k = 0; k < 7; k++) {
            const n = Math.sin(rad * (2.7 + k * .37) + k * 1.71) * .55 +
                      Math.sin(rad * (7.1 + k * .19) - k * .83) * .25;
            const b = n * (2.2 + core * 2.8) + (k - 3) * (0.75 + core * .45);
            const eq = galacticToEquatorial(l + Math.sin(rad * 3 + k) * .8, b);
            MW_FINE.push({ raHrs:eq.ra/15, dec:eq.dec, sizeDeg:1.8 + Math.random()*2.8, alpha:.006 + Math.random()*.012 });
        }
        // Two broad, irregular dark lanes crossing the bright galactic band.
        for (let k = 0; k < 2; k++) {
            const laneB = Math.sin(rad * (1.15 + k*.27) + k*1.4) * (1.2 + core*2.2) + (k ? 2.1 : -1.0);
            const eq = galacticToEquatorial(l + Math.sin(rad*4+k)*1.2, laneB);
            MW_DUST.push({ raHrs:eq.ra/15, dec:eq.dec, sizeDeg:4.5 + core*4 + Math.random()*2.5, alpha:.045 + core*.025 });
        }

        // Long, low-contrast filaments create photographic continuity between the
        // brighter cloud structures. They remain tied to Galactic coordinates.
        if (l % 10 === 0) {
            for (let f = 0; f < 2; f++) {
                const pts = [];
                for (let q = -8; q <= 8; q++) {
                    const ll = l + q * 1.6;
                    const rr = ll * Math.PI / 180;
                    const bb = Math.sin(rr * (2.2 + f*.31) + f*1.9 + l*.017) * (1.1 + core*2.1)
                             + (f ? 1.8 : -1.5) + Math.sin(rr*6.7 + f)*0.45;
                    const ee = galacticToEquatorial(ll, bb);
                    pts.push({raHrs:ee.ra/15, dec:ee.dec});
                }
                MW_FILAMENTS.push(pts);
            }
        }
    }
}
initMilkyWay();

// Generate a perfectly soft, transparent cloud brush in memory
const mwBrush = document.createElement('canvas');
mwBrush.width = 64;
mwBrush.height = 64;
const bCtx = mwBrush.getContext('2d');
const bGrad = bCtx.createRadialGradient(32, 32, 0, 32, 32, 32);

// Creates a soft, feathery white puff of smoke
bGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
bGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.15)');
bGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.05)');
bGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

bCtx.fillStyle = bGrad;
bCtx.fillRect(0, 0, 64, 64);
const brushReady = true;

// --- REALISTIC DSO VISUAL VARIATION (precomputed once, deterministic per object) ---
// Gives galaxies an inclination/orientation, nebulae a mottled cloud shape, and
// clusters a scatter of individually-resolved member stars — all cheap to draw
// per-frame because the randomness is generated a single time at load, not every tick.
function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
function mulberry32(seed) {
    let a = seed;
    return function() {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function initDsoVisuals() {
    DSO_OBJECTS.forEach(obj => {
        const rand = mulberry32(hashStr(obj.name));
        const desc = obj.desc || '';
        if (obj.type === 'galaxy') {
            // Astrophoto-style: warm yellow-white core (old stellar population) blending into
            // cooler blue spiral arms (young hot stars) — the classic long-exposure look.
            const elliptical = /elliptical/i.test(desc);
            const axisRatio = elliptical ? (0.65 + rand() * 0.35) : (0.2 + rand() * 0.5);
            const stars = [];
            const dust = [];
            // Deterministic stellar population: old warm stars in the bulge,
            // cooler/blue stars preferentially tracing spiral structure.
            const starCount = elliptical ? 90 : 150;
            for (let i = 0; i < starCount; i++) {
                const rr = Math.pow(rand(), elliptical ? 1.55 : 1.22);
                const ang = rand() * Math.PI * 2;
                let x = Math.cos(ang) * rr;
                let y = Math.sin(ang) * rr * (elliptical ? 0.82 : 0.72);
                if (!elliptical) {
                    const armWave = Math.sin(ang * 2.0 - rr * 8.0);
                    x += armWave * (1 - rr) * 0.045;
                    y += Math.cos(ang * 2.0 - rr * 8.0) * (1 - rr) * 0.035;
                }
                stars.push({ x, y, size: 0.35 + rand() * 0.95,
                    hot: rand() < (elliptical ? .12 : .38), alpha: .18 + rand() * .62 });
            }
            for (let i = 0; i < (elliptical ? 4 : 11); i++) {
                const ang = rand() * Math.PI * 2;
                const rr = .18 + rand() * .72;
                dust.push({ ang, rr, width: .018 + rand() * .035, alpha: .06 + rand() * .10 });
            }
            obj._vis = {
                posAngle: rand() * 180,
                axisRatio,
                coreHue: elliptical ? '255,225,175' : '255,214,168',
                armHue: elliptical ? '255,214,175' : '120,160,255',
                stars, dust
            };
        } else if (obj.type === 'nebula') {
            const planetary = /planetary nebula/i.test(desc);
            const emission = /emission/i.test(desc);
            const reflection = /reflection/i.test(desc);
            // Saturated Hubble-palette colors: red/magenta for emission (H-alpha), blue for
            // reflection (scattered starlight), cyan-teal for planetary nebulae (OIII/OIII+Ha).
            let hue = '255,110,120';
            if (emission) hue = '255,90,90';
            if (reflection) hue = '100,150,255';
            if (planetary) hue = '80,230,210';
            const blobCount = planetary ? 1 : (3 + Math.floor(rand() * 3));
            const blobs = [];
            for (let i = 0; i < blobCount; i++) {
                blobs.push({
                    dx: (rand() - 0.5) * (planetary ? 0.08 : 1.05),
                    dy: (rand() - 0.5) * (planetary ? 0.08 : 1.05),
                    rScale: planetary ? 1.0 : (0.4 + rand() * 0.5),
                    aScale: 0.5 + rand() * 0.5,
                    // slight per-blob hue drift so the cloud isn't a single flat color
                    hueShift: Math.floor((rand() - 0.5) * 40)
                });
            }
            obj._vis = { hue, blobs, planetary };
        } else if (obj.type === 'cluster') {
            const globular = /globular/i.test(desc);
            const dotCount = globular ? (11 + Math.floor(rand() * 7)) : (7 + Math.floor(rand() * 8));
            const dots = [];
            // Real star colors as seen in photos: mostly white, with blue-hot and gold-cool outliers.
            const starHues = ['255,255,255', '190,210,255', '255,224,180', '255,244,214'];
            for (let i = 0; i < dotCount; i++) {
                let dx, dy;
                if (globular) {
                    const radius = Math.pow(rand(), 1.6);
                    const ang = rand() * Math.PI * 2;
                    dx = Math.cos(ang) * radius; dy = Math.sin(ang) * radius;
                } else {
                    dx = (rand() - 0.5) * 1.7; dy = (rand() - 0.5) * 1.7;
                }
                const hue = starHues[Math.floor(rand() * starHues.length)];
                dots.push({ dx, dy, sizeRel: 0.35 + rand() * 0.65, briRel: 0.5 + rand() * 0.5, hue });
            }
            obj._vis = { globular, dots };
        }
    });
}
initDsoVisuals();

const FAINT_STARS_AR = [];
for (let i = 0; i < 600; i++) {
    FAINT_STARS_AR.push({
        az: Math.random() * 360,
        alt: Math.random() * 90,
        br: Math.random() * 0.6 + 0.1,
        blinkOff: Math.random() * Math.PI * 2
    });
}


function getConstellationFull(abbr) {
    return CONST_FULL_NAMES[abbr] || abbr;
}

function getVisibilityCategory(alt) {
    if (alt <= 0) return { label: 'Below Horizon', color: '#ff4b4b', icon: '◌' };
    if (alt < 10) return { label: 'Barely Visible', color: '#ffcf26', icon: '◐' };
    if (alt < 30) return { label: 'Low in Sky', color: '#8896ab', icon: '◑' };
    if (alt <= 60) return { label: 'Well Placed', color: '#00e676', icon: '◒' };
    return { label: 'Best Viewing', color: '#00f0ff', icon: '●' };
}

function formatDistance(dist_ly) {
    if (!dist_ly) return '';
    if (dist_ly >= 1000000) return (dist_ly / 1000000).toFixed(1) + 'M ly';
    if (dist_ly >= 1000) return (dist_ly / 1000).toFixed(1) + 'k ly';
    return dist_ly.toFixed(1) + ' ly';
}

function getDescriptiveStellarType(name, temp) {
    if (LUMINOSITY_CLASS[name]) return LUMINOSITY_CLASS[name];
    if (temp > 10000) return 'blue star';
    if (temp > 7500) return 'white star';
    if (temp > 6000) return 'yellow-white star';
    if (temp > 5200) return 'yellow dwarf';
    if (temp > 3700) return 'orange dwarf';
    return 'red dwarf';
}

function getStarColorHex(temp) {
    if (!temp) return '#e2e8f0';
    if (temp >= 30000) return '#7aa0ff';
    if (temp >= 10000) return '#a8c4ff';
    if (temp >= 7500)  return '#d8e4ff';
    if (temp >= 6000)  return '#fff8dc';
    if (temp >= 5200)  return '#ffe066';
    if (temp >= 3700)  return '#ffaa44';
    return '#ff6644';
}

// Luminosity classes derived from catalog spectral types (Yale BSC / SIMBAD).
// Keys match BRIGHT_STARS exactly (203/203).
const LUMINOSITY_CLASS = {
  'Sirius':'dwarf', 'Canopus':'bright giant', 'Arcturus':'giant', 'Vega':'dwarf', 'Capella':'giant', 'Rigel':'supergiant',
  'Procyon':'subgiant', 'Betelgeuse':'supergiant', 'Altair':'dwarf', 'Aldebaran':'giant', 'Spica':'giant', 'Antares':'supergiant',
  'Pollux':'giant', 'Deneb':'supergiant', 'Regulus':'dwarf', 'Castor':'dwarf', 'Bellatrix':'giant', 'Alnilam':'supergiant',
  'Alnitak':'supergiant', 'Saiph':'supergiant', 'Mintaka':'bright giant', 'Polaris':'supergiant', 'Alpheratz':'subgiant', 'Hamal':'giant',
  'Rigel Kentaurus':'dwarf', 'Hadar':'giant', 'Acrux':'subgiant', 'Achernar':'dwarf', 'Fomalhaut':'dwarf', 'Denebola':'dwarf',
  'Alkaid':'dwarf', 'Mizar':'dwarf', 'Alioth':'dwarf', 'Megrez':'dwarf', 'Phecda':'dwarf', 'Merak':'dwarf',
  'Dubhe':'giant', 'Mirfak':'supergiant', 'Alphard':'bright giant', 'Regor':'supergiant', 'Alhena':'subgiant', 'Sadr':'supergiant',
  'Wezen':'supergiant', 'Kaus Australis':'giant', 'Avior':'giant', 'Menkalinan':'subgiant', 'Atria':'bright giant', 'Algieba':'giant',
  'Miaplacidus':'subgiant', 'Enif':'supergiant', 'Scheat':'bright giant', 'Markab':'dwarf', 'Peacock':'subgiant', 'Alnair':'subgiant',
  'Sabik':'dwarf', 'Rasalhague':'giant', 'Shaula':'subgiant', 'Gacrux':'giant', 'Mimosa':'giant', 'Gienah':'giant',
  'Acrab':'dwarf', 'Zubeneschamali':'dwarf', 'Unukalhai':'giant', 'Kochab':'giant', 'Pherkad':'bright giant', 'Eltanin':'giant',
  'Schedar':'giant', 'Caph':'giant', 'Ruchbah':'giant', 'Algol':'dwarf', 'Menkar':'giant', 'Diphda':'giant',
  'Mirach':'giant', 'Almach':'bright giant', 'El Nath':'giant', 'Alcyone':'giant', 'Pleione':'dwarf', 'Maia':'giant',
  'Merope':'subgiant', 'Electra':'giant', 'Taygeta':'subgiant', 'Atlas':'giant', 'Zavijava':'dwarf', 'Porrima':'dwarf',
  'Vindemiatrix':'giant', 'Auva':'giant', 'Izar':'dwarf', 'Muphrid':'subgiant', 'Seginus':'giant', 'Nekkar':'giant',
  'Zubenelgenubi':'subgiant', 'Brachium':'giant', 'Dschubba':'subgiant', 'Sargas':'bright giant', 'Kappa Scorpii':'giant', 'Lesath':'subgiant',
  'Cebalrai':'giant', 'Yed Prior':'giant', 'Yed Posterior':'giant', 'Nunki':'dwarf', 'Ascella':'giant', 'Kaus Media':'giant',
  'Kaus Borealis':'giant', 'Albaldah':'bright giant', 'Alnasl':'giant', 'Sheliak':'bright giant', 'Sulafat':'giant', 'Albireo':'bright giant',
  'Azelfafage':'subgiant', 'Tarazed':'bright giant', 'Alshain':'subgiant', 'Deneb el Okab':'giant', 'Algenib':'subgiant', 'Homam':'dwarf',
  'Matar':'bright giant', 'Cursa':'giant', 'Zaurak':'giant', 'Rana':'subgiant', 'Acamar':'giant', 'Deneb Algedi':'dwarf',
  'Dabih':'dwarf', 'Algedi':'giant', 'Nashira':'dwarf', 'Sadalsuud':'supergiant', 'Sadalmelik':'supergiant', 'Sadachbia':'dwarf',
  'Skat':'dwarf', 'Albali':'dwarf', 'Ancha':'giant', 'Situla':'giant', 'Alpherg':'giant', 'Alrescha':'dwarf',
  'Lacaille 8760':'dwarf', 'Lacaille 9352':'dwarf', 'Adhara':'bright giant', 'Delta Velorum':'dwarf', 'Mirzam':'bright giant', 'Menkent':'giant',
  'Beta Gruis':'giant', 'Muhlifain':'subgiant', 'Suhail':'supergiant', 'Alphecca':'dwarf', 'Naos':'supergiant', 'Aspidiske':'supergiant',
  'Epsilon Scorpii':'giant', 'Epsilon Centauri':'giant', 'Alpha Lupi':'giant', 'Eta Centauri':'dwarf', 'Ankaa':'giant', 'Alderamin':'dwarf',
  'Aludra':'supergiant', 'Kappa Velorum':'subgiant', 'Gamma Cassiopeiae':'subgiant', 'Zosma':'dwarf', 'Delta Centauri':'subgiant', 'Theta Aurigae':'dwarf',
  'Phact':'subgiant', 'Sheratan':'dwarf', 'Kraz':'bright giant', 'Beta Lupi':'giant', 'Alpha Muscae':'subgiant', 'Mu Velorum':'giant',
  'Al Kab':'bright giant', 'Pi Puppis':'supergiant', 'Al Dhibain Prior':'giant', 'Iota Centauri':'dwarf', 'Theta Carinae':'dwarf', 'Nair al Saif':'giant',
  'Kornephoros':'giant', 'Gamma Lupi':'subgiant', 'Rastaban':'supergiant', 'Delta Crucis':'subgiant', 'Beta Hydri':'subgiant', 'Cor Caroli':'dwarf',
  'Tureis':'bright giant', 'Zeta Herculis':'subgiant', 'Al Niyat':'dwarf', 'Nihal':'bright giant', 'Zeta Persei':'supergiant', 'Beta Trianguli Australis':'giant',
  'Beta Arae':'supergiant', 'Alpha Hydri':'dwarf', 'Alpha Tucanae':'giant', 'Delta Cygni':'subgiant', 'Tejat':'giant', 'Epsilon Persei':'dwarf',
  'Pi Scorpii':'dwarf', 'Al Niyat Sigma':'giant', 'Gamma Trianguli Australis':'dwarf', 'Gomeisa':'dwarf', 'Gamma Persei':'giant', 'Tau Puppis':'giant',
  'Alpha Arae':'dwarf', 'Algorab':'dwarf', 'Upsilon Carinae':'supergiant', 'Algenubi':'bright giant', 'Mebsuta':'supergiant', 'Deneb Okab Aus':'subgiant',
  'Almaaz':'supergiant', 'Zeta Tauri':'giant', 'Beta Trianguli':'giant', 'Gamma Hydrae':'giant', 'Minkar':'giant',
};


let lat = 24.83, lon = 88.05;
let observerTransition = null;
function setObserverLocation(newLat, newLon) {
    const fromLat = observerTransition ? observerTransition.toLat : lat;
    const fromLon = observerTransition ? observerTransition.toLon : lon;
    lat = Number(newLat); lon = Number(newLon);
    observerTransition = {
        fromLat, fromLon, toLat: lat, toLon: lon,
        start: performance.now(), duration: 850
    };
}
function getRenderedObserverLocation() {
    if (!observerTransition) return {lat, lon};
    const t = Math.min(1, Math.max(0, (performance.now() - observerTransition.start) / observerTransition.duration));
    const e = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;
    const out = {
        lat: observerTransition.fromLat + (observerTransition.toLat - observerTransition.fromLat) * e,
        lon: observerTransition.fromLon + (observerTransition.toLon - observerTransition.fromLon) * e
    };
    if (t >= 1) observerTransition = null;
    return out;
}
let cityName = 'Ranchi, India';
let isGpsLocation = false;
let liveTemp = 10;     // Standard 10°C default
let livePressure = 1010; // Standard 10 hPa default

// --- TIME TRAVEL STATE ---
// Offset (in minutes) applied to real time for the sky map, moon, and planets.
// Telescope sync/slewing always uses true real time regardless of this offset.
let timeOffsetMinutes = 0;
function getSimTime() { return new Date(Date.now() + timeOffsetMinutes * 60000); }
let timelapseActive = false;
let timelapseIntervalId = null;
let timelapseRafId = null;
let timelapseLastFrame = 0;
let timelapseUiAccumulator = 0;
let timelapseStartWallMs = 0;
let timelapseStartOffsetMinutes = 0;
let timelapseWebGLRafId = null;
let timelapseLastCanvasRenderMs = -1;
let timelapseUiTimerId = null;
let timelapseWakeLock = null;
const TIMELAPSE_STEP_MINUTES = 1.5;   // sim-minutes advanced per tick
const TIMELAPSE_TICK_MS = 30;      // real ms between ticks
const TIMELAPSE_CANVAS_FPS = 30;
const TIMELAPSE_CANVAS_INTERVAL_MS = 1000 / TIMELAPSE_CANVAS_FPS;

// Timelapse clock is wall-clock driven, so the simulation never depends on the
// Canvas 2D renderer's cadence. The same function is used by the renderer and
// the lightweight UI ticker, keeping the displayed time continuously in sync.
function updateTimelapseSimulationClock(nowMs = performance.now()) {
    if (!timelapseActive || !timelapseStartWallMs) return;
    const elapsedMs = Math.max(0, nowMs - timelapseStartWallMs);
    timeOffsetMinutes = timelapseStartOffsetMinutes +
        elapsedMs * (TIMELAPSE_STEP_MINUTES / TIMELAPSE_TICK_MS);
}

async function requestTimelapseWakeLock() {
    if (!timelapseActive || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    try {
        if (timelapseWakeLock && !timelapseWakeLock.released) return;
        timelapseWakeLock = await navigator.wakeLock.request('screen');
        timelapseWakeLock.addEventListener('release', () => {
            timelapseWakeLock = null;
        }, { once: true });
    } catch (e) {
        // Wake Lock is optional; Timelapse continues normally where unsupported.
        timelapseWakeLock = null;
    }
}

async function releaseTimelapseWakeLock() {
    const lock = timelapseWakeLock;
    timelapseWakeLock = null;
    if (!lock) return;
    try { await lock.release(); } catch (e) {}
}

// Browsers release a screen wake lock when the document becomes hidden. Re-acquire
// it automatically when the user returns while Timelapse is still running.
document.addEventListener('visibilitychange', () => {
    if (timelapseActive && document.visibilityState === 'visible') requestTimelapseWakeLock();
});

let showConstellations = true, showGrid = false, showDomeGrid = false;
let zoomLevel = 1;
let visualZoomLevel = 1; // eased visual scale for cinematic zoom transitions

// --- 1:1 "GRAB THE SKY" DRAG SCALING ---
// The yaw/pitch camera drag below was tuned in screen-pixels-per-degree for the
// default zoom (1x). That constant doesn't know about the current field of view,
// so at any other zoom level a finger drag stops tracking the sky underneath it:
// zoomed in, the same drag spins the view far past where your finger actually
// moved; zoomed out, the view barely responds. That mismatch is what makes
// panning feel disconnected compared to apps like Stellarium, where the point
// under your finger stays under your finger at any zoom. Dividing the drag by
// the current visual zoom restores that 1:1 feel at every zoom level.
function getDragZoomScale() {
    return 1 / Math.max(0.05, visualZoomLevel);
}
let currentBortle = 5;            

let panX = 0, panY = 0;           
let rotateOffset = 0;
let viewYawDeg = 0;                  // 3D celestial-camera yaw
let viewPitchDeg = 0;                // 3D celestial-camera pitch; 0 = zenith
let interactStartViewYaw = 0;
let interactStartViewPitch = 0;
const CELESTIAL_3D_MODE = true;
let rotateMode = false;           
let compassModeActive = false;
let compassHeading = null;
let smoothCompassHeading = null;
let compassPermissionPending = false;
let compassAbsoluteSeen = false;
let compassFallbackTimer = null;
let compassHintTimer = null;
let followDevicePitch = null;
let followDeviceRoll = null;
let savedManualViewYaw = 0;
let savedManualViewPitch = 0;
let savedManualViewRoll = 0;
let compassDrawPending = false;
let isInteracting = false;
const FOLLOW_DEVICE_ZOOM = 1.35; // ~94° horizontal field on the default stereographic sky camera.
let savedManualZoom = 1;
let compassGlobeLastPose = '';

// --- ASTRONOMICAL POSITION UPDATE THROTTLE ---
// Recomputing RA/Dec -> Alt/Az (precession + refraction) for every star, Milky Way
// point, and deep-sky object is the dominant per-frame cost, and it is pure waste
// while the user is panning/zooming/rotating: those gestures only change the
// screen-space transform, never where an object actually sits in the sky. Real
// sky motion is ~15 arcsec/sec, so refreshing sky positions a handful of times a
// second (instead of on every single animation frame) is visually identical while
// cutting the heaviest chunk of drawMap()'s work several times over. This is what
// makes dragging feel smooth on slower devices: during an active gesture we skip
// the astronomy recompute entirely and only redo the cheap screen projection.
const ASTRO_UPDATE_INTERVAL_MS = 120; // ~8 sky-position refreshes/sec when idle
let lastAstroUpdateTime = -1; // -1 = not yet computed; performance.now() is always >= 0
let astroPositionsFresh = false; // true only on frames where positions were actually recomputed
function shouldRefreshAstroPositions(nowMs) {
    if (lastAstroUpdateTime < 0) return true; // always compute on the first frame
    if (timelapseActive) return true; // fast-forwarding sim time must stay per-frame smooth
    if (observerTransition) return true; // mid-flight to a new location: lat/lon change every frame
    if (isInteracting || touchStartDist > 0) return false; // mid-drag/pinch: reuse cached positions
    return (nowMs - lastAstroUpdateTime) >= ASTRO_UPDATE_INTERVAL_MS;
}

// --- THERMAL-STABLE IDLE RENDER GOVERNOR ---
// The full photorealistic sky is intentionally retained at idle, but there is no
// reason to redraw it at display refresh rate when the user is only looking at it.
// On phones this matters because the repeated radial-gradient / canvas work can
// heat the SoC over a multi-minute session and trigger thermal clock reduction.
// Mobile therefore gets a low-frequency full-quality idle refresh. The sky still
// moves and twinkles, but slowly enough that 6 fps is visually natural; the user
// sees the same rendering layers, just sampled less often. Desktop gets a slightly
// higher idle rate. The instant a gesture starts, we return to native RAF cadence.
// This preserves the full visual treatment while dramatically reducing sustained
// CPU/GPU duty cycle.
const IDLE_TARGET_FPS_DESKTOP = 12;
const IDLE_TARGET_FPS_MOBILE = 6;
const IDLE_FRAME_INTERVAL_DESKTOP_MS = 1000 / IDLE_TARGET_FPS_DESKTOP;
const IDLE_FRAME_INTERVAL_MOBILE_MS = 1000 / IDLE_TARGET_FPS_MOBILE;
let lastDrawMapRenderMs = -1;
function getIdleFrameIntervalMs() {
    return isMobileDeviceCheck() ? IDLE_FRAME_INTERVAL_MOBILE_MS : IDLE_FRAME_INTERVAL_DESKTOP_MS;
}

function isActivelyGesturing() {
    // cameraActive (live AR) is included because the star overlay must track the
    // real-time camera feed frame-for-frame — throttling it would make the sky
    // visibly lag behind the live video underneath.
    return isInteracting || touchStartDist > 0 || timelapseActive || cosmicJourneyActive || cameraActive;
}
let interactStartX = 0, interactStartY = 0;
let interactStartPanX = 0, interactStartPanY = 0;
let interactStartRotate = 0;
let hoveredStar = null;
let lastInspectedObject = null; // persists after mouse/touch leaves, used by the Observing Log

let arMode = false;
let photorealisticMode = true; // Visual layer only; astronomical positions remain unchanged.
let arZoomLevel = 1.0;
let cameraActive = false;
let arTrackingActive = false;
let R_matrix = [-1,0,0, 0,0,1, 0,1,0];
let screenOrientation = 0;
let _screenCos = 1, _screenSin = 0;
let absoluteModeActive = false;

let smoothAlpha = null;
let smoothBeta = null;
let smoothGamma = null;
const SMOOTH_K = 0.12; 
let syntheticAzimuth = 180; // SOUTH-UP initial sky center
let syntheticAltitude = 0; 

let sunForcedOff = false;
let targetSunAnim = 1.0; 
let currentSunAnim = 1.0;

function updateMapHint() {
    const hint = document.getElementById('mapHint');
    if (!hint) return;
    const touchFirst = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (arMode) {
        hint.textContent = touchFirst ? 'AR Active · point phone at sky' : 'AR Active · point phone at sky to locate objects';
    } else if (touchFirst) {
        hint.textContent = compassModeActive ? 'follow device · compass + gyro · tap compass to return to manual 3D' : 'drag the hemisphere · pinch to zoom · tap for info · long-press to explore';
    } else if (rotateMode) {
        hint.textContent = compassModeActive ? 'follow device · compass + gyro · tap compass to return to manual 3D' : 'drag to rotate · scroll/pinch to zoom · hover for info · hold an object to explore';
    } else {
        hint.textContent = 'drag to pan · scroll to zoom · hover for info · long-press to explore · double-click to slew';
    }
}
function formatTime(date) { 
    if (!date) return 'UTC --:--'; 
    return 'UTC ' + date.toLocaleTimeString([], {timeZone: 'UTC', hour:'2-digit', minute:'2-digit', hour12: false}); 
}

function toggleFullscreen() {
    const panel = document.querySelector('.panel-map');
    const isFull = panel.classList.toggle('fullscreen-mode');
    document.body.classList.toggle('fullscreen-active', isFull);
    // ResizeObserver will automatically handle the redrawing of the canvas element
    
    if (!isFull && arMode) {
        exitAR();
    }
}

function constrainPan() {
    if (arMode) return; 
    
    const w = canvas.width / Math.min(window.devicePixelRatio, 2);
    const h = canvas.height / Math.min(window.devicePixelRatio, 2);
    const r = Math.max(w, h) * 0.85 * zoomLevel;
    const maxDist = r * 0.95; 
    
    const dist = Math.sqrt(panX * panX + panY * panY);
    if (dist > maxDist) {
        panX = (panX / dist) * maxDist;
        panY = (panY / dist) * maxDist;
    }
}

function resetSunToggle() {
    if (sunForcedOff) {
        sunForcedOff = false;
        document.getElementById('btnSunMap').classList.add('active');
        targetSunAnim = 1.0;
    }
}

function showArMessage(msg, duration) {
    const el = document.getElementById('arOverlayMsg');
    el.textContent = msg;
    el.style.display = 'block';
    if(duration) {
        setTimeout(() => { el.style.display = 'none'; }, duration);
    }
}

function smoothAngle(current, target, k) {
    if (current === null) return target;
    let diff = target - current;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return current + diff * k;
}

function updateRMatrixFromSmooth() {
    const deg2rad = Math.PI / 180;
    const a = smoothAlpha * deg2rad;
    const b = smoothBeta * deg2rad;
    const g = smoothGamma * deg2rad;

    const cA = Math.cos(a), sA = Math.sin(a);
    const cB = Math.cos(b), sB = Math.sin(b);
    const cG = Math.cos(g), sG = Math.sin(g);

    R_matrix[0] = cA * cG - sA * sB * sG;
    R_matrix[1] = -sA * cB;
    R_matrix[2] = cA * sG + sA * sB * cG;

    R_matrix[3] = sA * cG + cA * sB * sG;
    R_matrix[4] = cA * cB;
    R_matrix[5] = sA * sG - cA * sB * cG;

    R_matrix[6] = -cB * sG;
    R_matrix[7] = sB;
    R_matrix[8] = cB * cG;
}

function updateRMatrixFromSynthetic() {
    smoothAlpha = 360 - syntheticAzimuth;
    smoothBeta = 90 + syntheticAltitude; 
    smoothGamma = 0;
    updateRMatrixFromSmooth();
}

function freezeARTrackingForManualGesture() {
    if (!arTrackingActive) return;

    // Freeze at the exact device pose at the moment the user starts dragging.
    // Keep the camera feed running if Camera AR is active; only the sky control
    // changes from sensor-driven to manual.
    if (Number.isFinite(smoothAlpha)) syntheticAzimuth = ((360 - smoothAlpha + 180) % 360 + 360) % 360;
    if (Number.isFinite(smoothBeta)) syntheticAltitude = Math.max(-90, Math.min(90, smoothBeta - 90));

    arTrackingActive = false;
    const recenter = document.getElementById('btnRecenter');
    if (recenter) {
        recenter.style.display = 'flex';
        recenter.textContent = 'Follow Device';
    }
    updateRMatrixFromSynthetic();
}

function getCompassHeadingFromEvent(event) {
    // iOS/Safari exposes a calibrated true-north heading directly.
    if (Number.isFinite(event.webkitCompassHeading)) {
        return ((event.webkitCompassHeading % 360) + 360) % 360;
    }

    // Android Chrome: alpha=0 means the phone's top edge points north and
    // alpha increases counter-clockwise (90° = west). Convert that to the
    // conventional clockwise bearing (0°=N, 90°=E). Do not add the screen
    // orientation angle; alpha is defined in the device coordinate frame.
    if ((event.absolute === true || event.type === 'deviceorientationabsolute') && Number.isFinite(event.alpha)) {
        compassAbsoluteSeen = true;
        return ((360 - event.alpha) % 360 + 360) % 360;
    }

    // Last-resort fallback when an absolute stream is unavailable.
    if (!compassAbsoluteSeen && compassFallbackTimer === null && Number.isFinite(event.alpha)) {
        return ((360 - event.alpha) % 360 + 360) % 360;
    }
    return null;
}

function applyCompassHeading(heading) {
    if (!Number.isFinite(heading)) return;
    compassHeading = heading;

    if (smoothCompassHeading === null) {
        smoothCompassHeading = heading;
    } else {
        let diff = heading - smoothCompassHeading;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;

        // Ignore tiny magnetometer noise, follow deliberate phone movement faster.
        if (Math.abs(diff) < 0.12) return;
        const k = Math.abs(diff) > 18 ? 0.34 : (Math.abs(diff) > 5 ? 0.24 : 0.14);
        smoothCompassHeading += diff * k;
        smoothCompassHeading = (smoothCompassHeading + 360) % 360;
    }
}

function getDeviceTiltAngles(event) {
    const orientation = Number((window.screen.orientation || {}).angle ?? window.orientation ?? 0) || 0;
    const beta = Number.isFinite(event.beta) ? event.beta : 0;
    const gamma = Number.isFinite(event.gamma) ? event.gamma : 0;

    // Convert browser device axes into a stable screen-relative pitch/roll.
    // Portrait: beta is front/back tilt, gamma is side roll. Landscape swaps them.
    switch (((orientation % 360) + 360) % 360) {
        case 90:  return { pitch: gamma, roll: -beta };
        case 180: return { pitch: -beta, roll: -gamma };
        case 270: return { pitch: -gamma, roll: beta };
        default:   return { pitch: beta, roll: gamma };
    }
}

function applyDeviceOrientation(event) {
    if (!compassModeActive || arMode) return;

    const heading = getCompassHeadingFromEvent(event);
    if (heading !== null) applyCompassHeading(heading);

    if (Number.isFinite(smoothCompassHeading)) {
        const tilt = getDeviceTiltAngles(event);
        followDevicePitch = smoothAngle(followDevicePitch, tilt.pitch, 0.16);
        followDeviceRoll = smoothAngle(followDeviceRoll, tilt.roll, 0.16);

        // The 3D sky camera uses South-up at yaw=0. A physical heading of H
        // therefore maps to a camera yaw of -H. Pitch is the phone's look angle;
        // a level phone shows the zenith, while tilting it upright brings the
        // corresponding horizon direction toward the centre.
        viewYawDeg = ((180 - smoothCompassHeading + 540) % 360) - 180;
        viewPitchDeg = Math.max(-80, Math.min(80, followDevicePitch || 0));
        rotateOffset = Math.max(-45, Math.min(45, followDeviceRoll || 0));
        panX = 0;
        panY = 0;
        updateCompassDialVisual();
        if (!compassDrawPending) {
            compassDrawPending = true;
            requestAnimationFrame(() => {
                compassDrawPending = false;
                drawMap();
            });
        }
    }
}

function drawCompassGlobe() {
    const c = document.getElementById('compassGlobe');
    if (!c) return;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height, cx = W/2, cy = H/2, R = 54;
    const yaw = (viewYawDeg || 0) * Math.PI/180;
    const pitch = (viewPitchDeg || 0) * Math.PI/180;
    const roll = (rotateOffset || 0) * Math.PI/180;
    const cyaw=Math.cos(yaw), syaw=Math.sin(yaw);
    let rx=-cyaw, ry=-syaw, rz=0, ux=syaw, uy=-cyaw, uz=0, fx=0, fy=0, fz=1;
    const cp=Math.cos(pitch), sp=Math.sin(pitch);
    let nux=ux*cp+fx*sp, nuy=uy*cp+fy*sp, nuz=uz*cp+fz*sp;
    let nfx=fx*cp-ux*sp, nfy=fy*cp-uy*sp, nfz=fz*cp-uz*sp;
    ux=nux;uy=nuy;uz=nuz;fx=nfx;fy=nfy;fz=nfz;
    const cr=Math.cos(roll), sr=Math.sin(roll);
    let nrx=rx*cr+ux*sr, nry=ry*cr+uy*sr, nrz=rz*cr+uz*sr;
    let nurx=ux*cr-rx*sr, nury=uy*cr-ry*sr, nurz=uz*cr-rz*sr;
    rx=nrx;ry=nry;rz=nrz;ux=nurx;uy=nury;uz=nurz;
    const project=(E,N,U)=>{
        const x=E*rx+N*ry+U*rz, y=E*ux+N*uy+U*uz, z=E*fx+N*fy+U*fz;
        if(z<=-0.02) return null;
        const d=1+Math.max(-.98,z);
        return [cx+(x/d)*R*1.55, cy-(y/d)*R*1.55, z];
    };
    ctx.clearRect(0,0,W,H);
    // Sphere silhouette / atmosphere.
    const g=ctx.createRadialGradient(38,31,4,46,48,48);
    g.addColorStop(0,'rgba(35,62,92,.55)'); g.addColorStop(.72,'rgba(8,18,32,.55)'); g.addColorStop(1,'rgba(2,5,10,.9)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.clip();
    const line=(pts,alpha=.34,width=.65)=>{ ctx.beginPath(); let first=true; for(const q of pts){if(!q){first=true;continue;} if(first){ctx.moveTo(q[0],q[1]);first=false}else ctx.lineTo(q[0],q[1]);} ctx.strokeStyle=`rgba(130,205,255,${alpha})`;ctx.lineWidth=width;ctx.stroke(); };
    // Longitude lines.
    for(let az=0;az<360;az+=30){const pts=[];const a=az*Math.PI/180;for(let alt=-90;alt<=90;alt+=4){const ar=alt*Math.PI/180;pts.push(project(Math.cos(ar)*Math.sin(a),Math.cos(ar)*Math.cos(a),Math.sin(ar)));}line(pts,.30,.65);}
    // Latitude lines.
    for(let alt=-60;alt<=60;alt+=30){const pts=[];const ar=alt*Math.PI/180;for(let az=0;az<=360;az+=4){const a=az*Math.PI/180;pts.push(project(Math.cos(ar)*Math.sin(a),Math.cos(ar)*Math.cos(a),Math.sin(ar)));}line(pts,.25,.65);}
    // Horizon ring.
    const hp=[];for(let az=0;az<=360;az+=3){const a=az*Math.PI/180;hp.push(project(Math.sin(a),Math.cos(a),0));}line(hp,.62,1.15);
    // Direction labels are attached to the sphere, not screen-fixed.
    ctx.font='700 10px "Space Grotesk",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    const dirs=[['N',0],['NE',45],['E',90],['SE',135],['S',180],['SW',225],['W',270],['NW',315]];
    for(const [lab,az] of dirs){const a=az*Math.PI/180;const q=project(Math.sin(a)*.98,Math.cos(a)*.98,0);if(!q||q[2]<-.02)continue;ctx.fillStyle=lab==='N'?'rgba(255,255,255,.98)':'rgba(205,232,255,.76)';ctx.fillText(lab,q[0],q[1]);}
    const z=project(0,0,1); if(z){ctx.fillStyle='rgba(255,255,255,.9)';ctx.font='700 8.5px "IBM Plex Mono",monospace';ctx.fillText('ZENITH',z[0],z[1]-5);}
    ctx.restore();
    // Optical axis crosshair and small orientation cue.
    ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(cx-11,cy);ctx.lineTo(cx+11,cy);ctx.moveTo(cx,cy-11);ctx.lineTo(cx,cy+11);ctx.stroke();
    ctx.strokeStyle='rgba(90,200,255,.55)';ctx.beginPath();ctx.arc(cx,cy,R+.5,0,Math.PI*2);ctx.stroke();
}
function updateCompassDialVisual(force=false) {
    const pose=`${viewYawDeg.toFixed(2)}|${viewPitchDeg.toFixed(2)}|${rotateOffset.toFixed(2)}|${compassModeActive}`;
    if(!force && pose===compassGlobeLastPose)return;
    compassGlobeLastPose=pose;
    drawCompassGlobe();
}

function processCompassOrientation(event) {
    applyDeviceOrientation(event);
}

function setCompassVisual(active) {
    const compass = document.getElementById('skyCompass');
    const hint = document.getElementById('compassHint');
    if (!compass) return;
    compass.classList.toggle('compass-active', active);
    compass.classList.toggle('follow-device', active);
    updateCompassDialVisual();
    compass.setAttribute('aria-pressed', active ? 'true' : 'false');
    compass.setAttribute('aria-label', active ? 'Follow device active. Tap to return to manual 3D sky' : 'Follow the sky with your device orientation');
    compass.title = active ? 'Follow Device active — tap to return to manual 3D sky' : 'Tap to follow the sky with your phone';
    if (hint) {
        hint.textContent = active ? 'FOLLOW DEVICE · COMPASS + GYRO' : '3D SKY · TAP TO FOLLOW DEVICE';
        hint.classList.toggle('active', active);
    }
}

function showCompassHintOnce() {
    const hint = document.getElementById('compassHint');
    if (!hint) return;
    hint.textContent = '3D SKY · DRAG TO LOOK AROUND · TAP COMPASS TO FOLLOW DEVICE';
    hint.classList.add('visible');
    clearTimeout(compassHintTimer);
    compassHintTimer = setTimeout(() => hint.classList.remove('visible'), 2600);
}

function stopCompassAlignment(resetSky = true) {
    compassModeActive = false;
    compassHeading = null;
    smoothCompassHeading = null;
    followDevicePitch = null;
    followDeviceRoll = null;
    compassAbsoluteSeen = false;
    compassPermissionPending = false;
    if (compassFallbackTimer) { clearTimeout(compassFallbackTimer); compassFallbackTimer = null; }
    window.removeEventListener('deviceorientation', processCompassOrientation, true);
    window.removeEventListener('deviceorientationabsolute', processCompassOrientation, true);
    if (resetSky) {
        viewYawDeg = savedManualViewYaw;
        viewPitchDeg = savedManualViewPitch;
        rotateOffset = savedManualViewRoll;
        zoomLevel = savedManualZoom;
        visualZoomLevel = savedManualZoom;
    }
    setCompassVisual(false);
    updateMapHint();
    drawMap();
}

function startCompassAlignment() {
    if (arMode || timelapseActive) return;
    if (compassPermissionPending) return;
    if (!('DeviceOrientationEvent' in window)) {
        showArMessage('Compass and motion sensors are not available on this device.', 3000);
        return;
    }

    // Preserve the exact manual 3D pose so toggling Follow Device off returns
    // to the same place instead of resetting the user's sky view.
    savedManualViewYaw = viewYawDeg;
    savedManualViewPitch = viewPitchDeg;
    savedManualViewRoll = rotateOffset;
    savedManualZoom = zoomLevel;
    smoothCompassHeading = null;
    followDevicePitch = null;
    followDeviceRoll = null;

    const addCompassSensors = () => {
        window.removeEventListener('deviceorientation', processCompassOrientation, true);
        window.removeEventListener('deviceorientationabsolute', processCompassOrientation, true);
        compassAbsoluteSeen = false;
        compassFallbackTimer = null;
        compassPermissionPending = false;
        compassModeActive = true;

        // Use the browser orientation events rather than Generic Sensor.
        // This keeps Follow Device lightweight on Android/ColorOS phones.
        window.addEventListener('deviceorientationabsolute', processCompassOrientation, true);
        window.addEventListener('deviceorientation', processCompassOrientation, true);
        compassFallbackTimer = setTimeout(() => {
            compassFallbackTimer = null;
        }, 1200);
        // Device-follow is a sighting mode: use a wide, stable ~94° field so the
        // direction the phone points at sits at the centre while nearby stars keep
        // their correct relative angular spacing on screen.
        zoomLevel = FOLLOW_DEVICE_ZOOM;
        visualZoomLevel = FOLLOW_DEVICE_ZOOM;
        panX = 0; panY = 0;
        setCompassVisual(true);
        updateMapHint();
        requestAnimationFrame(drawMap);
    };

    compassPermissionPending = true;
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(state => {
            if (state === 'granted') addCompassSensors();
            else {
                compassPermissionPending = false;
                showArMessage('Motion and compass permission denied.', 3000);
            }
        }).catch(err => {
            compassPermissionPending = false;
            console.warn('Motion/compass permission error:', err);
            showArMessage('Could not access motion and compass sensors.', 3000);
        });
    } else {
        addCompassSensors();
    }
}

function toggleCompassAlignment() {
    if (compassModeActive) stopCompassAlignment(true);
    else startCompassAlignment();
}

function processOrientation(event) {
    if (compassModeActive && !arMode) processCompassOrientation(event);
    if (!arMode || !arTrackingActive) return;

    // Prefer an absolute/compass heading whenever the browser exposes one.
    // iOS supplies webkitCompassHeading; Android Chrome normally supplies
    // absolute deviceorientation data. This keeps AR tied to both gyro + compass.
    if (event.absolute) absoluteModeActive = true;
    if (absoluteModeActive && !event.absolute && event.webkitCompassHeading === undefined) return;

    let alpha = Number.isFinite(event.alpha) ? event.alpha : 0;
    let beta = Number.isFinite(event.beta) ? event.beta : 0;
    let gamma = Number.isFinite(event.gamma) ? event.gamma : 0;

    if (Number.isFinite(event.webkitCompassHeading)) {
        // webkitCompassHeading is clockwise degrees from true north.
        alpha = (360 - event.webkitCompassHeading) % 360;
        absoluteModeActive = true;
    }

    smoothAlpha = smoothAngle(smoothAlpha, alpha, SMOOTH_K);
    smoothBeta = smoothAngle(smoothBeta, beta, SMOOTH_K);
    smoothGamma = smoothAngle(smoothGamma, gamma, SMOOTH_K);

    screenOrientation = Number((window.screen.orientation || {}).angle ?? window.orientation ?? 0) || 0;
    const screenRad = screenOrientation * Math.PI / 180;
    _screenCos = Math.cos(screenRad);
    _screenSin = Math.sin(screenRad);
    updateRMatrixFromSmooth();

    const warningEl = document.getElementById('arWarning');
    if (warningEl) warningEl.style.display = R_matrix[8] > 0.1 ? 'block' : 'none';
}

function startAROrientationSensors() {
    if (!('DeviceOrientationEvent' in window)) {
        showArMessage('Device orientation sensors are not available on this device.', 3500);
        arTrackingActive = false;
        const recenter = document.getElementById('btnRecenter');
        if (recenter) recenter.style.display = 'flex';
        return;
    }

    const addSensors = () => {
        window.removeEventListener('deviceorientation', processOrientation, true);
        window.removeEventListener('deviceorientationabsolute', processOrientation, true);
        window.addEventListener('deviceorientationabsolute', processOrientation, true);
        window.addEventListener('deviceorientation', processOrientation, true);
    };

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(permissionState => {
            if (permissionState === 'granted') {
                addSensors();
            } else {
                arTrackingActive = false;
                const recenter = document.getElementById('btnRecenter');
                if (recenter) recenter.style.display = 'flex';
                showArMessage('Motion & compass permission denied.', 3500);
            }
        }).catch(err => {
            console.warn('Device orientation permission error:', err);
            arTrackingActive = false;
            const recenter = document.getElementById('btnRecenter');
            if (recenter) recenter.style.display = 'flex';
        });
    } else {
        addSensors();
    }
}

function isMobileDeviceCheck() {
    return /Mobi|Android|Tablet|iPad|iPhone/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
}

function turnCameraOn() {
    if (timelapseActive) {
        const warn = document.getElementById('arTimelapseWarning');
        if (warn) {
            warn.style.display = 'block';
            setTimeout(() => { warn.style.display = 'none'; }, 3000);
        }
        return;
    }

    if (!isMobileDeviceCheck()) {
        showArMessage("Camera AR is only available on mobile devices.", 3000);
        return;
    }

    recenterAR();

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // FIXED: Added better constraints and disabled audio
        navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: { ideal: "environment" } },
            audio: false 
        })
        .then(stream => {
            const videoEl = document.getElementById('arVideo');
            videoEl.srcObject = stream;
            
            // FIXED: iOS Safari strict autoplay requirements
            videoEl.setAttribute('playsinline', '');
            videoEl.setAttribute('muted', '');
            videoEl.muted = true;
            
            videoEl.style.display = 'block';
            
            // FIXED: Force play with a catch block
            videoEl.play().catch(e => console.warn('Video play error:', e));
            
            document.getElementById('bgStars').style.display = 'none';
            canvas.style.background = 'transparent';
            document.querySelector('.panel-map').style.setProperty('background', 'transparent', 'important');
            document.querySelector('.page-sky').style.setProperty('background', 'transparent', 'important');
            document.body.style.background = 'transparent';
            cameraActive = true;
            document.getElementById('btnCameraOn').style.display = 'none';
        })
        .catch(e => {
            console.error("Camera error:", e);
            showArMessage("Camera access denied or unavailable.", 3000);
        });
    } else {
        showArMessage("Camera not supported on this device.", 3000);
    }
}

function stopARCameraAndSensors() {
    updateMapHint();
    const videoEl = document.getElementById('arVideo');
    if (videoEl.srcObject) {
        videoEl.srcObject.getTracks().forEach(t => t.stop());
        videoEl.srcObject = null;
    }
    videoEl.style.display = 'none';
    document.getElementById('bgStars').style.display = 'block';
    canvas.style.background = 'transparent';
    const panel = document.querySelector('.panel-map');
    panel.style.removeProperty('background');
    document.querySelector('.page-sky').style.removeProperty('background');
    document.body.style.background = '';
    window.removeEventListener('deviceorientation', processOrientation, true);
    window.removeEventListener('deviceorientationabsolute', processOrientation, true);
    
    panX = 0; panY = 0; rotateOffset = 0; viewYawDeg = 0; viewPitchDeg = 0; 
    smoothAlpha = null; smoothBeta = null; smoothGamma = null;
    absoluteModeActive = false;
    cameraActive = false;
    document.getElementById('arWarning').style.display = 'none';
}

function restoreMapUI() {
    document.querySelector('.panel-map .panel-header').style.display = 'flex';
    document.querySelector('.panel-map .map-footer').style.display = 'flex';
    document.getElementById('btnFullscreen').style.display = 'flex';
    document.getElementById('arUIOverlay').style.display = 'none';
    document.getElementById('arUIOverlay').style.visibility = 'hidden';
    document.getElementById('btnSunMap').style.display = 'flex';
}

function exitAR() {
    if (arMode) {
        arMode = false;
        if (starWebGLRenderer) starWebGLRenderer.setEnabled(true);
        if (starWebGLCanvas && starWebGLEnabled) starWebGLCanvas.classList.add('webgl-ready');
        document.body.classList.remove('ar-active');
        stopARCameraAndSensors();
        restoreMapUI();
    }
    const panel = document.querySelector('.panel-map');
    if (panel.classList.contains('fullscreen-mode')) {
        toggleFullscreen(); 
    }
}

function recenterAR() {
    arTrackingActive = true;
    const recenter = document.getElementById('btnRecenter');
    if (recenter) recenter.style.display = 'none';
    smoothAlpha = null;
    smoothBeta = null;
    smoothGamma = null;
    absoluteModeActive = false;
    syntheticAzimuth = 180;
    syntheticAltitude = 0;
    updateRMatrixFromSynthetic();
    arZoomLevel = 1.0;
    if (arMode) startAROrientationSensors();
}

function toggleSun() {
    sunForcedOff = !sunForcedOff;
    setSkyToolActive('sun', !sunForcedOff);
    targetSunAnim = sunForcedOff ? 0.0 : 1.0;
    showSkyToolStatus(`DAYLIGHT ${sunForcedOff ? 'OFF' : 'ON'}`);
    drawMap();
}

function toggleAR() {
    if (!arMode && compassModeActive) stopCompassAlignment(false);
    const panel = document.querySelector('.panel-map');
    
    arMode = !arMode;
    if (starWebGLRenderer) starWebGLRenderer.setEnabled(!arMode);
    if (starWebGLCanvas) starWebGLCanvas.classList.toggle('webgl-ready', !arMode && starWebGLEnabled);
    
    if (arMode) {
        document.body.classList.add('ar-active');
        if (!panel.classList.contains('fullscreen-mode')) {
            panel.classList.add('fullscreen-mode');
            document.body.classList.add('fullscreen-active');
        }

        arTrackingActive = isMobileDeviceCheck();
        cameraActive = false;
        
        updateMapHint();
        
        document.querySelector('.panel-map .panel-header').style.display = 'none';
        document.querySelector('.panel-map .map-footer').style.display = 'none';
        document.getElementById('btnFullscreen').style.display = 'none';
        document.getElementById('btnSunMap').style.display = 'none';
        
        document.getElementById('arUIOverlay').style.display = 'block';
        document.getElementById('arUIOverlay').style.visibility = 'visible';
        document.getElementById('arUIOverlay').style.opacity = '1';
        
        const camBtn = document.getElementById('btnCameraOn');
        if (!isMobileDeviceCheck()) {
            camBtn.textContent = 'Camera AR (Mobile Only)';
            camBtn.style.opacity = '0.5';
            camBtn.style.cursor = 'not-allowed';
            camBtn.onclick = () => showArMessage("Camera AR is only available on mobile devices.", 3000);
        } else {
            camBtn.textContent = 'Turn Camera On';
            camBtn.style.opacity = '1';
            camBtn.style.cursor = 'pointer';
            camBtn.onclick = turnCameraOn;
        }
        camBtn.style.display = 'block';

        document.getElementById('btnRecenter').style.display = arTrackingActive ? 'none' : 'block';
        
        syntheticAzimuth = 180;
        syntheticAltitude = 0;
        if (!arTrackingActive) updateRMatrixFromSynthetic();
            
        if (arTrackingActive) {
            startAROrientationSensors();
        }
    } else {
        document.body.classList.remove('ar-active');
        stopCompassAlignment(true);
        stopARCameraAndSensors();
        restoreMapUI();
    }
}

const canvas = document.getElementById('starCanvas');
const starWebGLCanvas = document.getElementById('starWebGLCanvas');
const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
const tooltip = document.getElementById('starTooltip');
const ttName = document.getElementById('ttName');
const ttInfo = document.getElementById('ttInfo');
const ttType = document.getElementById('ttType');

/* =========================================================
   VOYAGER MODE
   Long-press an object to enter an immersive, scientifically
   framed scale transition. The astronomy engine remains the
   source of truth; this layer is presentation only.
   ========================================================= */
const cosmicJourney = document.getElementById('cosmicJourney');
const journeyCanvas = document.getElementById('journeyCanvas');
const journeyCtx = journeyCanvas ? journeyCanvas.getContext('2d', { alpha: false, desynchronized: true }) : null;
const journeyTargetEl = document.getElementById('journeyTarget');
const journeyStatusEl = document.getElementById('journeyStatus');
const journeyDistanceEl = document.getElementById('journeyDistance');
const journeyScaleEl = document.getElementById('journeyScale');
const journeyProgressValueEl = document.getElementById('journeyProgressValue');
const journeyProgressFillEl = document.getElementById('journeyProgressFill');
const journeyProgressThumbEl = document.getElementById('journeyProgressThumb');
const journeyProgressDestinationEl = document.getElementById('journeyProgressDestination');
const journeyExit = document.getElementById('journeyExit');
const journeyArrival = document.getElementById('journeyArrival');
const arrivalNameEl = document.getElementById('arrivalName');
const arrivalMetaEl = document.getElementById('arrivalMeta');
const arrivalFactEl = document.getElementById('arrivalFact');
const arrivalReturn = document.getElementById('arrivalReturn');

let cosmicJourneyActive = false;
let cosmicJourneyFrame = 0;
let cosmicJourneyTarget = null;
let cosmicJourneyStart = 0;
let cosmicJourneyArrivalTimer = null;
let cosmicJourneyReturnTimer = null;
let cosmicJourneyDpr = 1;
let cosmicJourneyStars = [];
let cosmicJourneyTargetCache = null;
let cosmicJourneyLastUiUpdate = 0;

function resizeJourneyCanvas() {
    if (!journeyCanvas || !journeyCtx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    // The journey is a cinematic overlay, not the precision sky map. On phones,
    // rendering a full-screen canvas at 2x DPR is disproportionately expensive.
    const maxDpr = w <= 640 ? 1.15 : (w <= 1024 ? 1.35 : 1.75);
    cosmicJourneyDpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    journeyCanvas.width = Math.round(w * cosmicJourneyDpr);
    journeyCanvas.height = Math.round(h * cosmicJourneyDpr);
    journeyCanvas.style.width = w + 'px';
    journeyCanvas.style.height = h + 'px';
    journeyCtx.setTransform(cosmicJourneyDpr, 0, 0, cosmicJourneyDpr, 0, 0);
}
window.addEventListener('resize', resizeJourneyCanvas);
resizeJourneyCanvas();

function journeyEase(t) {
    // Quintic smoothstep has zero velocity and acceleration at both ends,
    // avoiding the slight "rubber-band" feeling of the old cubic curve.
    t = Math.max(0, Math.min(1, t));
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function journeyTargetDistanceLY(obj) {
    if (obj && Number.isFinite(obj.dist) && obj.dist > 0) return obj.dist;
    if (obj && Number.isFinite(obj._distanceLy) && obj._distanceLy > 0) return obj._distanceLy;
    if (obj?.isMoon) return 1.300e0 / 31557600; // fallback: 1.3 light-seconds in light-years.
    return 0;
}

function formatJourneyLY(ly) {
    if (!Number.isFinite(ly) || ly <= 0) return '0.00';
    if (ly >= 1000000) return (ly / 1000000).toFixed(2) + 'M';
    if (ly >= 1000) return ly.toLocaleString('en-US', { maximumFractionDigits: 1 });
    if (ly >= 100) return ly.toFixed(1);
    if (ly >= 10) return ly.toFixed(2);
    if (ly >= 0.01) return ly.toFixed(4);
    return ly.toFixed(8);
}

function updateJourneyProgress(progress, force = false) {
    if (!journeyProgressValueEl || !journeyProgressFillEl) return;
    const now = performance.now();
    // DOM text is intentionally throttled; the canvas remains 60fps while the
    // number/slider refreshes at a perceptually smooth ~20fps.
    if (!force && now - cosmicJourneyLastUiUpdate < 50) return;
    cosmicJourneyLastUiUpdate = now;

    const totalLY = journeyTargetDistanceLY(cosmicJourneyTarget);
    const travelledLY = totalLY * progress;
    journeyProgressValueEl.textContent = formatJourneyLY(travelledLY);
    journeyProgressFillEl.style.transform = `scaleX(${progress})`;
    if (journeyProgressThumbEl) journeyProgressThumbEl.style.left = `${progress * 100}%`;
}

function buildJourneyTargetCache(obj) {
    if (!journeyCanvas || !journeyCtx || !obj) return;
    // Render the expensive destination artwork once. Scaling a bitmap every
    // frame is substantially cheaper on mobile than rebuilding radial gradients,
    // galaxy filaments, planetary belts, etc. every frame.
    const size = 520;
    const cache = document.createElement('canvas');
    cache.width = size;
    cache.height = size;
    const c = cache.getContext('2d', { alpha: true });
    c.clearRect(0, 0, size, size);
    drawJourneyTarget(c, obj, size / 2, size / 2, 1, 1, 1);
    cosmicJourneyTargetCache = cache;
}

function journeyObjectColor(obj) {
    if (obj.isDso) return '#8edcff';
    if (obj.isMoon) return '#f4f4ec';
    if (obj.isPlanet) return obj.c || '#dbeafe';
    return getStarColorHex(obj.temp);
}

function journeyObjectType(obj) {
    if (obj.isMoon) return 'Moon';
    if (obj.isPlanet) return obj.name || 'Planet';
    if (obj.isDso) return obj.type || 'Deep-sky object';
    return getDescriptiveStellarType(obj.name, obj.temp) || 'Star';
}

function journeyObjectMeta(obj) {
    const parts = [];
    const type = journeyObjectType(obj);
    if (type) parts.push(type);
    const dist = formatDistance(obj.dist);
    if (dist) parts.push(dist);
    if (obj.mag !== undefined && Number.isFinite(obj.mag)) parts.push('mag ' + obj.mag.toFixed(2));
    return parts.join(' · ');
}

function journeyDistanceText(obj) {
    if (obj && obj.dist) {
        if (obj.dist >= 1000000) return `≈ ${(obj.dist/1000000).toFixed(2)} million light-years`;
        if (obj.dist >= 1000) return `≈ ${(obj.dist/1000).toFixed(1)} thousand light-years`;
        return `≈ ${obj.dist.toFixed(1)} light-years`;
    }
    if (obj?.isMoon) return '≈ 1.3 light-seconds';
    if (obj?.isPlanet) return 'within the Solar System';
    return 'distance not available';
}

function journeyScaleText(obj) {
    if (obj?.isMoon) return 'Earth–Moon system';
    if (obj?.isPlanet) return 'Solar System';
    if (obj?.isDso) {
        const t = String(obj.type || '').toLowerCase();
        if (t.includes('galaxy')) return 'Milky Way · Local Group · deep sky';
        if (t.includes('nebula')) return 'Milky Way · stellar nursery / remnant';
        return 'Milky Way · deep sky';
    }
    return 'Solar neighborhood · stellar scale';
}

const JOURNEY_FACTS = {
    // Stars
    'Sirius': 'Sirius is a binary system only 8.6 light-years away. Sirius B is a white dwarf — the dense remnant of a once Sun-like star.',
    'Vega': 'Vega is one of the best-studied nearby stars and rotates so rapidly that it is noticeably flattened at its poles.',
    'Betelgeuse': 'Betelgeuse is a red supergiant in Orion. Its enormous atmosphere extends far beyond the scale of the Sun, and it is expected to end its life as a supernova.',
    'Antares': 'Antares is a red supergiant whose name means “rival of Mars,” a reference to its striking orange-red color in Scorpius.',
    'Rigel': 'Rigel is a blue supergiant in Orion. It shines with extraordinary intrinsic power despite being hundreds of light-years away.',
    'Arcturus': 'Arcturus is an orange giant and one of the brightest stars in the northern sky. Its high proper motion has been measurable for centuries.',
    'Altair': 'Altair spins extraordinarily fast, completing one rotation in roughly 9 hours. Its rapid rotation makes the star visibly oblate.',
    'Polaris': 'Polaris is a Cepheid variable star. Its subtle pulsations make it an important rung on the cosmic distance ladder.',
    'Fomalhaut': 'Fomalhaut is surrounded by a prominent debris disk — a cold belt of dust and planetesimal material left over from planetary-system formation.',
    'Castor': 'Castor is a remarkable multiple-star system: six stars are gravitationally associated in three binary pairs.',
    'Algol': 'Algol is an eclipsing binary. One star periodically passes in front of the other, causing the system’s brightness to fall in a predictable rhythm.',
    'Mizar': 'Mizar and Alcor form a famous naked-eye double in the handle of the Big Dipper. Mizar itself is a multiple-star system.',
    'Almach': 'Almach is a striking multiple-star system in Andromeda, famous for the contrasting colors of its bright components.',
    'Algieba': 'Algieba is a beautiful binary star in Leo. Its two components appear as contrasting golden points through a telescope.',
    // Planets
    'Jupiter': 'Jupiter is the largest planet in the Solar System. Its atmosphere is divided into fast-moving belts and zones, and the Great Red Spot is a gigantic long-lived storm.',
    'Saturn': 'Saturn’s rings are made mostly of water ice and rock particles. The main ring system spans hundreds of thousands of kilometres but is astonishingly thin.',
    'Mars': 'Mars hosts Olympus Mons, the largest volcano in the Solar System, rising more than 20 kilometres above the surrounding plains.',
    'Venus': 'Venus rotates slowly and in the opposite direction to most planets. Its thick carbon-dioxide atmosphere creates an extreme greenhouse effect.',
    'Mercury': 'Mercury has the shortest year of any planet — only 88 Earth days — yet its solar day lasts 176 Earth days.',
    'Uranus': 'Uranus rotates almost on its side, giving it extreme seasons. Its blue-green colour comes largely from methane in the atmosphere.',
    'Neptune': 'Neptune has the fastest winds measured on any planet in the Solar System, with storms driven through its cold, hydrogen-rich atmosphere.',
    'Moon': 'The Moon is tidally locked to Earth, so the same hemisphere always faces us. Its heavily cratered surface preserves billions of years of Solar System history.',
    'Sun': 'The Sun contains more than 99% of the mass of the Solar System and powers nearly every visible process in Earth’s sky.',
    // Deep sky
    'Andromeda Galaxy': 'Andromeda is the nearest major galaxy to the Milky Way, about 2.5 million light-years away. Its disk spans roughly six full-Moon diameters across the sky.',
    'Triangulum Galaxy': 'The Triangulum Galaxy is a spiral galaxy in the Local Group. It is smaller than both the Milky Way and Andromeda and contains many active star-forming regions.',
    'Whirlpool Galaxy': 'The Whirlpool Galaxy is a nearly face-on spiral whose tidal interaction with its companion helps trigger intense regions of star formation.',
    'Bode Galaxy': 'M81 is a grand-design spiral galaxy with a bright central bulge and well-defined arms. It lies about 12 million light-years away.',
    'Cigar Galaxy': 'M82 is a nearby starburst galaxy where gravitational interaction has helped trigger an extraordinary rate of new star formation.',
    'Virgo Galaxy': 'M87 is a giant elliptical galaxy in the Virgo Cluster. A supermassive black hole at its centre produced the famous first-ever black-hole image released by the Event Horizon Telescope.',
    'Orion Nebula': 'The Orion Nebula is a nearby stellar nursery about 1,300 light-years away. Ultraviolet light from its young massive stars is sculpting the surrounding gas and dust.',
    'Crab Nebula': 'The Crab Nebula is the expanding remnant of a supernova observed on Earth in 1054. At its heart is a rapidly spinning neutron star called a pulsar.',
    'Lagoon Nebula': 'The Lagoon Nebula is a huge stellar nursery in Sagittarius, glowing where ultraviolet radiation from young stars excites its surrounding gas.',
    'Eagle Nebula': 'The Eagle Nebula contains the famous Pillars of Creation — towering columns of gas and dust sculpted by young stars.',
    'Trifid Nebula': 'The Trifid Nebula combines emission, reflection and dark nebulae in one remarkable region, giving it three distinct visual components.',
    'Ring Nebula': 'The Ring Nebula is the glowing shell of gas expelled by a dying Sun-like star. Its central white dwarf is the remnant left behind.',
    'Dumbbell Nebula': 'The Dumbbell Nebula is a planetary nebula formed when a dying low-mass star shed its outer layers into space.',
    'Pleiades': 'The Pleiades are a young open cluster whose brightest stars are surrounded by faint reflection nebulosity. The cluster is only about 100 million years old.',
    'Beehive Cluster': 'The Beehive is one of the nearest open clusters to the Solar System. Under dark skies, dozens of its stars are visible without optical aid.',
    'Hercules Cluster': 'M13 is one of the most famous globular clusters in the northern sky, containing hundreds of thousands of old stars packed into a sphere only a few hundred light-years across.'
};

function journeyFact(obj) {
    const name = String(obj?.name || '').trim();
    if (JOURNEY_FACTS[name]) return JOURNEY_FACTS[name];
    const type = String(obj?.type || '').toLowerCase();
    const desc = String(obj?.desc || '');
    const dist = obj?.dist ? formatDistance(obj.dist) : '';
    if (obj?.isMoon) return JOURNEY_FACTS.Moon;
    if (obj?.isPlanet || obj?.isSun) return JOURNEY_FACTS[name] || `This ${name} is shown with its calculated apparent position, phase and orientation.`;
    if (type.includes('galaxy')) {
        if (/elliptical/i.test(desc)) return `This is an elliptical galaxy — dominated by older stars and a smooth, rounded stellar distribution.${dist ? ` It lies about ${dist} away.` : ''}`;
        if (/spiral/i.test(desc)) return `This is a spiral galaxy, with a rotating disk containing stars, gas and dust.${dist ? ` Its light has travelled about ${dist} to reach us.` : ''}`;
        return `This deep-sky object is a galaxy beyond the Milky Way.${dist ? ` Its light has travelled about ${dist} to reach Earth.` : ''}`;
    }
    if (type.includes('nebula')) {
        if (/planetary/i.test(desc)) return `A planetary nebula is the glowing shell expelled by a dying low-mass star.${dist ? ` This one is about ${dist} away.` : ''}`;
        if (/reflection/i.test(desc)) return `A reflection nebula shines by scattering light from nearby stars through interstellar dust.${dist ? ` It lies about ${dist} away.` : ''}`;
        if (/emission/i.test(desc)) return `An emission nebula glows as energetic starlight excites its surrounding gas.${dist ? ` This region lies about ${dist} away.` : ''}`;
        return `A cloud of interstellar gas and dust, shaped by radiation, gravity and stellar winds.${dist ? ` It lies about ${dist} away.` : ''}`;
    }
    if (type.includes('cluster')) {
        if (/globular/i.test(desc)) return `A globular cluster is a dense, ancient swarm of stars bound together by gravity.${dist ? ` This cluster is about ${dist} away.` : ''}`;
        if (/open cluster/i.test(desc)) return `An open cluster is a group of stars born from the same molecular cloud and still loosely bound together.${dist ? ` It lies about ${dist} away.` : ''}`;
        return `A stellar cluster: many stars gathered in the same region of the Milky Way.${dist ? ` Its light has travelled about ${dist} to reach us.` : ''}`;
    }
    if (obj?.dist) return `A ${getDescriptiveStellarType(obj.name, obj.temp)} about ${formatDistance(obj.dist)} away. Its colour and brightness reflect its physical temperature and intrinsic luminosity.`;
    return `A catalogued stellar object with measured position, brightness and spectral properties.`;
}

function getJourneyObjectAt(clientX, clientY) {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    let closest = null;
    let closestDist = 17;
    const allObjs = [...lastStarPositions, ...(typeof lastPlanetPositions !== 'undefined' ? lastPlanetPositions : [])];
    for (const obj of allObjs) {
        if (!obj || !obj.onScreen || obj.alt < 0 || !Number.isFinite(obj.x) || !Number.isFinite(obj.y)) continue;
        const dx = mx - obj.x;
        const dy = my - obj.y;
        const d = Math.hypot(dx, dy);
        if (d < closestDist) { closestDist = d; closest = obj; }
    }
    return closest;
}

function snapshotJourneyStars(target) {
    const w = window.innerWidth, h = window.innerHeight;
    const rect = canvas.getBoundingClientRect();
    const source = [...lastStarPositions, ...(typeof lastPlanetPositions !== 'undefined' ? lastPlanetPositions : [])]
        .filter(o => o && o.onScreen && o.alt >= 0 && Number.isFinite(o.x) && Number.isFinite(o.y));
    const targetX = rect.left + target.x;
    const targetY = rect.top + target.y;

    // Preserve the real local sky: prioritize the brightest objects and then add a
    // deterministic spatial sample so the destination still feels connected to the sky map.
    const ranked = [...source].sort((a,b) => (a.mag ?? 6) - (b.mag ?? 6));
    const selected = [];
    const seen = new Set();
    ranked.slice(0, 140).forEach(o => { selected.push(o); seen.add(o); });
    const step = Math.max(1, Math.floor(source.length / 300));
    for (let i = 0; i < source.length && selected.length < 440; i += step) {
        if (!seen.has(source[i])) { selected.push(source[i]); seen.add(source[i]); }
    }

    // Do NOT include the selected target in the travelling background field.
    // The target is rendered separately below. Keeping it here creates a second
    // copy at the centre of the frame, which makes the animation look like a
    // large star is shooting over / covering the original small star.
    const targetX0 = rect.left + target.x;
    const targetY0 = rect.top + target.y;
    cosmicJourneyStars = selected.filter(o => o !== target &&
        Math.hypot((rect.left + o.x) - targetX0, (rect.top + o.y) - targetY0) > 1.5
    ).map(o => {
        const x = rect.left + o.x, y = rect.top + o.y;
        const dx = x - targetX, dy = y - targetY;
        const radius = Math.max(1, Math.hypot(dx, dy));
        const col = o.isDso ? {r:180,g:205,b:235} : journeyStarRGB(o);
        return {
            x, y, dx, dy, radius,
            size: o.isPlanet ? 1.25 : (o.isDso ? 1.0 : Math.min(2.5, Math.max(.45, (4.8 - (o.mag ?? 4)) * .19 + .55))),
            alpha: o.isPlanet ? .5 : (o.isDso ? .18 : Math.min(.8, Math.max(.16, 1 - ((o.mag ?? 4) + 1) / 10))),
            color: `rgb(${col.r},${col.g},${col.b})`
        };
    });
}

function journeyStarRGB(obj) {
    return getStarColor(obj?.temp);
}

function drawJourneyStar(ctx, obj, focus) {
    const c = journeyStarRGB(obj);
    const mag = Number.isFinite(obj.mag) ? obj.mag : 2;
    const size = Math.max(2.2, 3.4 + Math.max(0, -mag) * 1.8) * (1 + focus * .35);
    const halo = size * (4.8 + Math.max(0, -mag) * 2.2);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(0,0,0,0,0,halo);
    g.addColorStop(0, `rgba(255,255,255,${.98})`);
    g.addColorStop(.035, `rgba(${c.r},${c.g},${c.b},${.95})`);
    g.addColorStop(.16, `rgba(${c.r},${c.g},${c.b},${.42})`);
    g.addColorStop(.48, `rgba(${c.r},${c.g},${c.b},${.10})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,halo,0,Math.PI*2); ctx.fill();
    ctx.globalCompositeOperation='source-over';
    ctx.fillStyle='rgba(255,255,255,.98)'; ctx.beginPath(); ctx.arc(0,0,Math.max(.8,size*.46),0,Math.PI*2); ctx.fill();
    // Restrained diffraction spikes only for bright stars, like an optical point source.
    if (mag < 1.2) {
        const spike = size * (3.2 + Math.max(0,-mag));
        ctx.strokeStyle=`rgba(${c.r},${c.g},${c.b},${.18 + focus*.12})`;
        ctx.lineWidth=.55;
        ctx.beginPath(); ctx.moveTo(-spike,0);ctx.lineTo(spike,0);ctx.moveTo(0,-spike);ctx.lineTo(0,spike);ctx.stroke();
        ctx.strokeStyle=`rgba(255,255,255,.08)`; ctx.beginPath(); ctx.moveTo(-spike*.55,-spike*.55);ctx.lineTo(spike*.55,spike*.55);ctx.moveTo(spike*.55,-spike*.55);ctx.lineTo(-spike*.55,spike*.55);ctx.stroke();
    }
    ctx.restore();
}

function drawJourneyPlanet(ctx, obj, focus) {
    const name = obj.name || '';
    const size = ({Jupiter:38,Saturn:37,Venus:30,Mars:29,Mercury:25,Uranus:30,Neptune:30,Sun:42}[name] || 26) * (1 + focus*.12);
    const pc = obj.isSun ? '#ffd27a' : (obj.c || '#dbeafe');
    // Soft atmospheric halo and limb light.
    const glow = ctx.createRadialGradient(-size*.25,-size*.28,size*.05,0,0,size*3.2);
    glow.addColorStop(0, `${pc}55`); glow.addColorStop(.28, `${pc}20`); glow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.globalCompositeOperation='screen'; ctx.fillStyle=glow; ctx.beginPath();ctx.arc(0,0,size*3.2,0,Math.PI*2);ctx.fill();

    let ringOuter=0, ringSquash=.48;
    if(name==='Saturn'){
        ringOuter=size*2.65;
        const tilt = (typeof obj.ringTilt === 'number') ? obj.ringTilt : 27;
        ringSquash=Math.max(.12,Math.abs(Math.sin(tilt*Math.PI/180))*.9+.05);
        ctx.save();ctx.rotate(-8*Math.PI/180);ctx.globalCompositeOperation='screen';
        const rings=[['rgba(245,235,210,.48)',.16,1],['rgba(185,170,145,.34)',.065,.92],['rgba(248,240,220,.42)',.055,.80],['rgba(45,38,30,.48)',.028,.73]];
        rings.forEach(([c,lw,rr])=>{ctx.strokeStyle=c;ctx.lineWidth=size*lw;ctx.beginPath();ctx.ellipse(0,0,ringOuter*rr,ringOuter*rr*ringSquash,0,0,Math.PI*2);ctx.stroke();});
        ctx.restore();
    }

    ctx.save();ctx.beginPath();ctx.arc(0,0,size,0,Math.PI*2);ctx.clip();
    // Physically-inspired limb darkening / illumination direction.
    const phase = Number.isFinite(obj.phaseAngle) ? Math.max(0,Math.min(180,obj.phaseAngle)) : 0;
    const illum = obj.isSun ? 1 : Math.max(.12, Math.min(1,(1+Math.cos(phase*Math.PI/180))/2));
    const lightX = -size*.28, lightY = -size*.34;
    const pg=ctx.createRadialGradient(lightX,lightY,size*.02,0,0,size*1.15);
    pg.addColorStop(0,'rgba(255,255,255,.50)');pg.addColorStop(.22,`${pc}e8`);pg.addColorStop(.68,pc);pg.addColorStop(1,'rgba(0,0,0,.62)');
    ctx.globalCompositeOperation='source-over';ctx.fillStyle=pg;ctx.fillRect(-size,-size,size*2,size*2);

    if(name==='Jupiter'){
        // Multi-frequency turbulent belts rather than perfectly straight stripes.
        const bands=[[-.78,.18,'225,202,170'],[-.58,.11,'130,100,78'],[-.42,.16,'240,225,196'],[-.22,.10,'150,120,94'],[-.05,.19,'235,218,188'],[.16,.11,'140,105,82'],[.34,.17,'235,220,194'],[.56,.12,'135,100,78'],[.75,.17,'225,205,174']];
        bands.forEach(([cy,h,c],bi)=>{
            ctx.fillStyle=`rgba(${c},.34)`;
            ctx.beginPath();
            for(let i=0;i<=36;i++){const x=-size+i*(2*size/36);const yy=cy*size + Math.sin(i*.72+bi*1.9)*size*.025 + Math.sin(i*.19+bi)*size*.018;if(i===0)ctx.moveTo(x,yy-h*size/2);else ctx.lineTo(x,yy-h*size/2);}
            for(let i=36;i>=0;i--){const x=-size+i*(2*size/36);const yy=cy*size + Math.sin(i*.72+bi*1.9)*size*.025 + Math.sin(i*.19+bi)*size*.018;ctx.lineTo(x,yy+h*size/2);}
            ctx.closePath();ctx.fill();
        });
        // Great Red Spot with nested turbulent edge.
        ctx.fillStyle='rgba(185,105,78,.62)';ctx.beginPath();ctx.ellipse(size*.28,size*.24,size*.22,size*.115,-.08,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='rgba(245,190,155,.22)';ctx.lineWidth=size*.025;ctx.beginPath();ctx.ellipse(size*.28,size*.24,size*.26,size*.145,-.08,0,Math.PI*2);ctx.stroke();
    } else if(name==='Saturn'){
        for(let i=-4;i<=4;i++){ctx.fillStyle=`rgba(120,100,80,${.05+Math.abs(i)*.012})`;ctx.fillRect(-size,(i*.19)*size,size*2,size*.035);}
    } else if(name==='Mars'){
        ctx.fillStyle='rgba(100,48,34,.34)';
        [[-.20,.18,.55,.32],[.34,-.08,.30,.22],[-.38,-.30,.22,.18]].forEach(m=>{ctx.beginPath();ctx.ellipse(m[0]*size,m[1]*size,m[2]*size,m[3]*size,.15,0,Math.PI*2);ctx.fill();});
        ctx.fillStyle='rgba(255,255,255,.72)';ctx.beginPath();ctx.ellipse(-size*.18,-size*.78,size*.35,size*.13,.08,0,Math.PI*2);ctx.fill();
    } else if(name==='Venus'){
        for(let i=0;i<7;i++){ctx.strokeStyle=`rgba(255,245,205,${.07+i*.012})`;ctx.lineWidth=size*.04;ctx.beginPath();ctx.moveTo(-size,(i-3)*size*.25);ctx.quadraticCurveTo(0,(i-3)*size*.25+Math.sin(i)*size*.08,size,(i-3)*size*.25+Math.cos(i)*size*.06);ctx.stroke();}
    } else if(name==='Mercury'){
        for(let i=0;i<18;i++){const a=Math.sin(i*18.7)*43758.5;const u=a-Math.floor(a);const b=Math.sin(i*9.1)*43758.5;const v=b-Math.floor(b);ctx.fillStyle=`rgba(80,70,60,${.08+u*.12})`;ctx.beginPath();ctx.arc((u*1.7-.85)*size,(v*1.7-.85)*size,(.015+u*.025)*size,0,Math.PI*2);ctx.fill();}
    } else if(name==='Uranus'||name==='Neptune'){
        for(let i=-4;i<=4;i++){ctx.strokeStyle=`rgba(255,255,255,${.025+Math.abs(i)*.006})`;ctx.lineWidth=size*.025;ctx.beginPath();ctx.moveTo(-size,(i*.2)*size);ctx.lineTo(size,(i*.2)*size);ctx.stroke();}
        if(name==='Neptune'){ctx.fillStyle='rgba(55,75,110,.22)';ctx.beginPath();ctx.ellipse(size*.18,size*.08,size*.18,size*.06,-.15,0,Math.PI*2);ctx.fill();}
    } else if(name==='Sun'){
        for(let i=0;i<28;i++){const a=Math.sin(i*19.7)*43758.5;const u=a-Math.floor(a), b=Math.sin(i*7.4)*43758.5;const v=b-Math.floor(b);ctx.fillStyle=`rgba(150,75,20,${.04+u*.10})`;ctx.beginPath();ctx.arc((u*1.7-.85)*size,(v*1.7-.85)*size,(.018+u*.035)*size,0,Math.PI*2);ctx.fill();}
    }
    // Simulate phase by masking the unilluminated hemisphere for inner planets.
    if(!obj.isSun && (name==='Mercury'||name==='Venus') && illum < .98){
        ctx.globalCompositeOperation='source-over';
        const shadowW=size*(1-illum)*1.95;
        const shadowX = size*(illum-.5)*.9;
        const sg=ctx.createLinearGradient(-size,0,size,0);sg.addColorStop(0,'rgba(0,0,0,.78)');sg.addColorStop(.72,'rgba(0,0,0,.42)');sg.addColorStop(1,'rgba(0,0,0,0)');
        ctx.save();ctx.translate(shadowX,0);ctx.scale(Math.max(.18,shadowW/size),1);ctx.fillStyle=sg;ctx.beginPath();ctx.ellipse(0,0,size,size,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    ctx.restore();
    if(name==='Saturn'){
        ctx.save();ctx.rotate(-8*Math.PI/180);ctx.globalCompositeOperation='source-over';
        ctx.strokeStyle='rgba(245,236,215,.80)';ctx.lineWidth=size*.13;ctx.beginPath();ctx.ellipse(0,0,ringOuter,ringOuter*ringSquash,0,0,Math.PI);ctx.stroke();
        ctx.strokeStyle='rgba(35,28,20,.48)';ctx.lineWidth=size*.035;ctx.beginPath();ctx.ellipse(0,0,ringOuter*.83,ringOuter*.83*ringSquash,0,0,Math.PI);ctx.stroke();
        ctx.strokeStyle='rgba(215,202,178,.62)';ctx.lineWidth=size*.075;ctx.beginPath();ctx.ellipse(0,0,ringOuter*.70,ringOuter*.70*ringSquash,0,0,Math.PI);ctx.stroke();
        ctx.restore();
    }
    ctx.globalCompositeOperation='source-over';
}

function drawJourneyMoon(ctx, obj, focus) {
    const r=29*(1+focus*.15);
    const g=ctx.createRadialGradient(-r*.3,-r*.35,0,0,0,r*1.7);g.addColorStop(0,'rgba(255,255,250,.52)');g.addColorStop(1,'rgba(255,255,250,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r*1.7,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.clip();
    const mg=ctx.createRadialGradient(-r*.35,-r*.35,0,r*.15,r*.1,r*1.2);mg.addColorStop(0,'#fffef4');mg.addColorStop(.62,'#d9d9d0');mg.addColorStop(1,'#85858a');ctx.fillStyle=mg;ctx.fillRect(-r,-r,r*2,r*2);
    const maria=[[-.32,-.38,.30,.24],[.05,-.15,.20,.24],[.12,.10,.22,.16],[-.45,.12,.32,.34],[.45,-.30,.12,.12],[-.05,.42,.18,.14]];
    ctx.fillStyle='rgba(85,90,98,.25)';maria.forEach(m=>{ctx.beginPath();ctx.ellipse(m[0]*r,m[1]*r,m[2]*r,m[3]*r,0,0,Math.PI*2);ctx.fill();});
    for(let i=0;i<42;i++){const a=Math.sin(i*91.7)*43758.5;const u=a-Math.floor(a);const b=Math.sin(i*47.2)*43758.5;const v=b-Math.floor(b);const x=(u*1.7-.85)*r,y=(v*1.7-.85)*r,rr=(.01+(i%5)*.006)*r;ctx.fillStyle=`rgba(70,75,82,${.04+(i%4)*.012})`;ctx.beginPath();ctx.arc(x,y,rr,0,Math.PI*2);ctx.fill();}
    ctx.globalCompositeOperation='destination-out';const mp=obj.mp||0;const w=Math.cos(mp*Math.PI/180)*r;
    if(mp<180){ctx.rect(-r,-r,r,r*2);ctx.fill();ctx.beginPath();ctx.ellipse(0,0,Math.abs(w),r,0,0,Math.PI*2);if(mp>=90){ctx.globalCompositeOperation='source-over';ctx.fillStyle='#d9d9d0';ctx.fill();}else ctx.fill();}
    else{ctx.rect(0,-r,r,r*2);ctx.fill();ctx.beginPath();ctx.ellipse(0,0,Math.abs(w),r,0,0,Math.PI*2);if(mp<270){ctx.globalCompositeOperation='source-over';ctx.fillStyle='#d9d9d0';ctx.fill();}else ctx.fill();}
    ctx.restore();
}

function drawJourneyGalaxy(ctx, obj, focus) {
    const vis=obj._vis||{}; const desc=(obj.desc||'').toLowerCase();
    const elliptical=/elliptical/.test(desc);
    const angularDeg=Math.max(0.001, Number(obj.sizeDeg)||0.05);
    const naturalRadius=Math.max(55, Math.min(205, 58 + 36*Math.log10(1 + angularDeg*120)));
    const size=(elliptical ? naturalRadius*.9 : naturalRadius)*(1+focus*.08);
    ctx.save();
    ctx.rotate((vis.posAngle||0)*Math.PI/180);
    ctx.scale(1,Math.max(.22,vis.axisRatio||.55));
    const arm=vis.armHue||'150,180,255', core=vis.coreHue||'255,220,180';

    // Very soft outer halo, followed by a denser stellar disk.
    let g=ctx.createRadialGradient(0,0,0,0,0,size*1.05);
    g.addColorStop(0,`rgba(${core},.72)`);g.addColorStop(.12,`rgba(${core},.40)`);g.addColorStop(.38,`rgba(${arm},.16)`);g.addColorStop(.72,`rgba(${arm},.035)`);g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,size,0,Math.PI*2);ctx.fill();

    // Individual stars add photographic grain and prevent the galaxy from looking like a flat SVG.
    ctx.globalCompositeOperation='screen';
    (vis.stars||[]).forEach((st,i)=>{
        const x=st.x*size,y=st.y*size,r=Math.max(.45,st.size*(.65+focus*.18));
        const c=st.hot ? '175,205,255' : '255,220,175';
        ctx.fillStyle=`rgba(${c},${st.alpha*.34})`;ctx.beginPath();ctx.arc(x,y,r*2.2,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=`rgba(${c},${Math.min(.92,st.alpha)})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    });

    if(!elliptical){
        // Two broad, irregular arms with multiple thin filaments.
        for(let armIndex=0;armIndex<2;armIndex++){
            for(let layer=0;layer<3;layer++){
                ctx.beginPath();
                for(let i=0;i<=100;i++){
                    const t=i/100, ang=t*Math.PI*(3.0+layer*.15)+armIndex*Math.PI + Math.sin(t*12+layer)*.035;
                    const rr=size*(.06+t*.86);
                    const x=Math.cos(ang)*rr, y=Math.sin(ang)*rr;
                    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
                }
                ctx.strokeStyle=`rgba(${arm},${.055+focus*.035-layer*.012})`;ctx.lineWidth=size*(.085-layer*.018);ctx.stroke();
            }
        }
        // Dust lanes: irregular dark ribbons crossing the disk.
        ctx.globalCompositeOperation='source-over';
        (vis.dust||[]).forEach((d,i)=>{
            const x=Math.cos(d.ang)*d.rr*size, y=Math.sin(d.ang)*d.rr*size;
            ctx.strokeStyle=`rgba(18,25,38,${d.alpha})`;ctx.lineWidth=size*d.width;
            ctx.beginPath();ctx.arc(x,y,size*(.35+.08*(i%3)),d.ang-.65,d.ang+.65);ctx.stroke();
        });
    }

    // Bright compact bulge and central nucleus.
    ctx.globalCompositeOperation='screen';
    const bulge=ctx.createRadialGradient(0,0,0,0,0,size*.34);bulge.addColorStop(0,'rgba(255,255,255,.94)');bulge.addColorStop(.12,`rgba(${core},.88)`);bulge.addColorStop(.55,`rgba(${core},.24)`);bulge.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=bulge;ctx.beginPath();ctx.arc(0,0,size*.34,0,Math.PI*2);ctx.fill();
    ctx.restore();
}

function drawJourneyNebula(ctx, obj, focus) {
    const vis=obj._vis||{}; const base=vis.hue||'255,110,120';
    const size=145*(1+focus*.12);
    ctx.save();ctx.globalCompositeOperation='screen';
    const blobs=vis.blobs||[{dx:0,dy:0,rScale:1,aScale:1,hueShift:0}];
    blobs.forEach((b,i)=>{
        const bx=b.dx*size,by=b.dy*size,br=size*b.rScale;
        const bc=shiftHue(base,b.hueShift||0);const g=ctx.createRadialGradient(bx,by,0,bx,by,br);
        g.addColorStop(0,`rgba(${bc},${Math.min(.72,.28+b.aScale*.26+focus*.10)})`);g.addColorStop(.24,`rgba(${bc},.24)`);g.addColorStop(.65,`rgba(${bc},.07)`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(bx,by,br,0,Math.PI*2);ctx.fill();
    });
    // Fine filaments: deterministic wisps give the cloud depth at arrival.
    for(let i=0;i<14;i++){const a=i*.73, rr=size*(.25+(i%5)*.10);ctx.strokeStyle=`rgba(${shiftHue(base,(i%4-1)*14)},${.045+focus*.02})`;ctx.lineWidth=size*.012;ctx.beginPath();for(let j=0;j<=28;j++){const t=j/28, ang=a+t*1.7, r=rr*(.72+t*.6);const x=Math.cos(ang)*r,y=Math.sin(ang)*r*.72+(Math.sin(t*8+i)*size*.035);if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}
    if(vis.planetary){ctx.strokeStyle=`rgba(${base},.55)`;ctx.lineWidth=size*.035;ctx.beginPath();ctx.arc(0,0,size*.42,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
}

function drawJourneyCluster(ctx, obj, focus) {
    const vis=obj._vis||{};const size=105*(1+focus*.12);
    const glow=ctx.createRadialGradient(0,0,0,0,0,size);glow.addColorStop(0,'rgba(255,250,235,.28)');glow.addColorStop(.55,'rgba(180,195,220,.07)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,size,0,Math.PI*2);ctx.fill();
    (vis.dots||[]).forEach(d=>{const x=d.dx*size,y=d.dy*size,r=Math.max(1.2,size*.035*d.sizeRel);const c=d.hue||'255,255,255';const g=ctx.createRadialGradient(x,y,0,x,y,r*4);g.addColorStop(0,`rgba(${c},${.8*d.briRel})`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*4,0,Math.PI*2);ctx.fill();ctx.fillStyle=`rgba(${c},${.75*d.briRel})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();});
}

function journeyDestinationRadius(obj, focus) {
    if (obj?.isMoon) return 29*(1+focus*.15);
    if (obj?.isPlanet || obj?.isSun) return ({Jupiter:38,Saturn:37,Venus:30,Mars:29,Mercury:25,Uranus:30,Neptune:30,Sun:42}[obj.name] || 26)*(1+focus*.12);
    if (!obj?.isDso) return Math.max(2.2, 3.4 + Math.max(0,-(obj.mag||2))*1.8)*(1+focus*.35);
    const type=String(obj.type||'').toLowerCase();
    if(type.includes('galaxy')) { const d=Math.max(.001,Number(obj.sizeDeg)||.05); return Math.max(55,Math.min(205,58+36*Math.log10(1+d*120))); }
    if(type.includes('nebula')) return 145*(1+focus*.12);
    return 105*(1+focus*.12);
}
function journeySourceRadius(obj) {
    if (obj?.isMoon) return 4.8;
    if (obj?.isPlanet || obj?.isSun) return Math.max(3.0, 4.5 + (obj.sizeFactor||.5)*3.5);
    if (!obj?.isDso) return Math.max(.8, Math.min(3.2, 2.2 + Math.max(0,-(obj.mag||2))*0.55));
    const type=String(obj.type||'').toLowerCase();
    if(type.includes('galaxy')) return Math.max(1.8,Math.min(5,1.6+Math.sqrt(Math.max(.01,obj.sizeDeg))*2));
    if(type.includes('nebula')) return Math.max(1.8,Math.min(5,1.8+Math.sqrt(Math.max(.01,obj.sizeDeg))*2));
    return 2.8;
}
function drawJourneyTarget(ctx, obj, x, y, focus, scale=1, alpha=1) {
    if (!obj) return;
    ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;ctx.scale(scale,scale);
    if(obj.isMoon){drawJourneyMoon(ctx,obj,focus);}
    else if(obj.isPlanet||obj.isSun){drawJourneyPlanet(ctx,obj,focus);}
    else if(!obj.isDso){drawJourneyStar(ctx,obj,focus);}
    else {
        const type=String(obj.type||'').toLowerCase();
        if(type.includes('galaxy')) drawJourneyGalaxy(ctx,obj,focus);
        else if(type.includes('nebula')) drawJourneyNebula(ctx,obj,focus);
        else drawJourneyCluster(ctx,obj,focus);
    }
    ctx.restore();
}

function drawJourneyFrame(now) {
    if (!cosmicJourneyActive || !journeyCtx) return;
    const w = window.innerWidth, h = window.innerHeight;
    const cx = w / 2, cy = h / 2;
    const elapsed = now - cosmicJourneyStart;
    const duration = 3600;
    const p = Math.min(1, elapsed / duration);
    const eased = journeyEase(p);

    journeyCtx.clearRect(0, 0, w, h);
    journeyCtx.fillStyle = '#000';
    journeyCtx.fillRect(0, 0, w, h);

    // Keep the animated background cheap. The vignette supplies most of the
    // cinematic depth, so a flat low-alpha haze is enough during motion.
    if (p < .92) {
        journeyCtx.fillStyle = `rgba(28,48,72,${0.028 * (1-p)})`;
        journeyCtx.fillRect(0, 0, w, h);
    }

    const rect = canvas.getBoundingClientRect();
    const targetX = rect.left + (Number.isFinite(cosmicJourneyTarget?.x) ? cosmicJourneyTarget.x : rect.width/2);
    const targetY = rect.top + (Number.isFinite(cosmicJourneyTarget?.y) ? cosmicJourneyTarget.y : rect.height/2);
    // The selected object itself is the thing that travels. It starts at its actual
    // sky-map position and scales continuously into the destination rendering, so
    // the eye reads one object being magnified rather than a new large object popping in.
    const travel = Math.pow(eased, 1.18);
    const tx = targetX + (cx - targetX) * travel;
    const ty = targetY + (cy - targetY) * travel;
    const focus = Math.pow(eased, 1.55);
    const srcR = journeySourceRadius(cosmicJourneyTarget);
    const dstR = journeyDestinationRadius(cosmicJourneyTarget, focus);
    const targetScale = (1 - travel) * (srcR / Math.max(.001, dstR)) + travel;
    const targetAlpha = Math.min(1, .72 + eased*.28);

    // Fewer, deterministic background points on small screens keeps the
    // cinematic motion fluid without changing the actual sky-map quality.
    const starStride = window.innerWidth <= 640 ? 1.55 : (window.innerWidth <= 1024 ? 1.2 : 1);
    for (let si = 0; si < cosmicJourneyStars.length; si += starStride) {
        const st = cosmicJourneyStars[Math.floor(si)];
        if (!st) continue;
        const radial = 1 + focus * (1.8 + Math.min(10, 180 / st.radius));
        const sx = cx + st.dx * radial;
        const sy = cy + st.dy * radial;
        const fade = Math.max(0, 1 - Math.max(0, p - .72) / .28);
        journeyCtx.globalAlpha = st.alpha * fade;
        journeyCtx.fillStyle = st.color;
        journeyCtx.beginPath();
        journeyCtx.arc(sx, sy, st.size * (1 + focus * .25), 0, Math.PI*2);
        journeyCtx.fill();
        if (p > .18 && p < .82 && st.radius > 35) {
            const streak = Math.min(85, focus * st.radius * .34);
            const ux = st.dx / st.radius, uy = st.dy / st.radius;
            journeyCtx.strokeStyle = st.color;
            journeyCtx.globalAlpha = st.alpha * .16 * Math.min(1, focus * 2);
            journeyCtx.lineWidth = Math.max(.35, st.size * .45);
            journeyCtx.beginPath();
            journeyCtx.moveTo(sx - ux * streak, sy - uy * streak);
            journeyCtx.lineTo(sx, sy);
            journeyCtx.stroke();
        }
    }
    journeyCtx.globalAlpha = 1;

    // The destination itself is cached once and only scaled during motion.
    if (cosmicJourneyTargetCache) {
        journeyCtx.save();
        journeyCtx.globalAlpha = targetAlpha;
        journeyCtx.translate(tx, ty);
        journeyCtx.scale(targetScale, targetScale);
        journeyCtx.drawImage(cosmicJourneyTargetCache, -260, -260);
        journeyCtx.restore();
    } else {
        drawJourneyTarget(journeyCtx, cosmicJourneyTarget, tx, ty, focus, targetScale, targetAlpha);
    }

    updateJourneyProgress(eased, p >= 1);

    if (p < 1) {
        if (p < .22) journeyStatusEl.textContent = 'Leaving the celestial sphere';
        else if (p < .56) journeyStatusEl.textContent = 'Crossing astronomical scale';
        else if (p < .86) journeyStatusEl.textContent = 'Entering the object’s scale';
        else journeyStatusEl.textContent = 'Resolving the destination';
        journeyDistanceEl.textContent = journeyDistanceText(cosmicJourneyTarget);
        journeyScaleEl.textContent = journeyScaleText(cosmicJourneyTarget);
        cosmicJourneyFrame = requestAnimationFrame(drawJourneyFrame);
    } else {
        journeyStatusEl.textContent = 'Destination resolved · visualized at a natural observing scale';
        journeyDistanceEl.textContent = journeyDistanceText(cosmicJourneyTarget);
        journeyScaleEl.textContent = journeyScaleText(cosmicJourneyTarget);
        cosmicJourney.classList.add('arrived');
        // Stay at the destination for 15 seconds. The user can always return sooner.
        cosmicJourneyArrivalTimer = setTimeout(() => endCosmicJourney(), 15000);
    }
}

function beginCosmicJourney(target) {
    if (!target || cosmicJourneyActive || arMode || timelapseActive) return;
    if (!cosmicJourney || !journeyCanvas) return;

    cosmicJourneyActive = true;
    cosmicJourneyTarget = target;
    clearTimeout(cosmicJourneyArrivalTimer);
    clearTimeout(cosmicJourneyReturnTimer);
    cancelAnimationFrame(cosmicJourneyFrame);

    tooltip.classList.remove('visible');
    hoveredStar = null;
    canvas.classList.remove('hovering-star', 'cosmic-hold');
    document.body.classList.add('cosmic-journey-active');
    cosmicJourney.classList.remove('returning', 'arrived');
    cosmicJourney.classList.add('active');
    cosmicJourney.setAttribute('aria-hidden', 'false');

    journeyTargetEl.textContent = target.name || 'Unnamed Star';
    if (journeyProgressDestinationEl) journeyProgressDestinationEl.textContent = (target.name || 'DESTINATION').toUpperCase();
    journeyDistanceEl.textContent = journeyDistanceText(target);
    journeyScaleEl.textContent = journeyScaleText(target);
    arrivalNameEl.textContent = target.name || 'Unnamed Star';
    arrivalMetaEl.textContent = journeyObjectMeta(target) || journeyObjectType(target);
    arrivalFactEl.textContent = journeyFact(target);
    journeyStatusEl.textContent = 'Preparing astronomical scale transition';

    resizeJourneyCanvas();
    snapshotJourneyStars(target);
    cosmicJourneyTargetCache = null;
    buildJourneyTargetCache(target);
    cosmicJourneyLastUiUpdate = 0;
    updateJourneyProgress(0, true);
    cosmicJourneyStart = performance.now();
    cosmicJourneyFrame = requestAnimationFrame(drawJourneyFrame);
}

function endCosmicJourney() {
    if (!cosmicJourneyActive) return;
    clearTimeout(cosmicJourneyArrivalTimer);
    cosmicJourney.classList.remove('active', 'arrived');
    cosmicJourney.classList.add('returning');
    cosmicJourney.setAttribute('aria-hidden', 'true');
    clearTimeout(cosmicJourneyReturnTimer);
    cosmicJourneyReturnTimer = setTimeout(() => {
        cosmicJourney.classList.remove('returning');
        document.body.classList.remove('cosmic-journey-active');
        cosmicJourneyActive = false;
        cosmicJourneyTarget = null;
        cosmicJourneyStars = [];
        cosmicJourneyTargetCache = null;
    }, 560);
}

if (arrivalReturn) arrivalReturn.addEventListener('click', endCosmicJourney);
if (journeyExit) journeyExit.addEventListener('click', endCosmicJourney);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && cosmicJourneyActive) { e.preventDefault(); endCosmicJourney(); } });

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const nextW = Math.max(1, Math.round(rect.width * dpr));
    const nextH = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW;
        canvas.height = nextH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
}
// Robust ResizeObserver eliminates distortion/stretching when containers adapt layout
const resizeObserver = new ResizeObserver(() => resizeCanvas());
resizeObserver.observe(canvas);

// Per-frame projection basis, set once at the top of drawMap() and reused by every
// projectAz() call that frame. projectAz() used to re-read canvas.width/height and
// devicePixelRatio and rebuild these from scratch on every single call — harmless in
// isolation, but it's invoked thousands of times per frame (once per star, Milky Way
// point, grid line, label...), so the redundant work adds up on slower devices.
let _projW = 0, _projH = 0, _projCx = 0, _projCy = 0;
let _fastHorizonLSTDeg = 0, _fastHorizonLatRad = 0, _fastHorizonSinLat = 0, _fastHorizonCosLat = 1;

// Timelapse-only cached ecliptic points. These coordinates are static, so their
// ecliptic-to-equatorial conversion is performed once rather than rebuilding 72
// Astronomy.Horizon calls every animation frame.
const TIMELAPSE_ZODIACAL_POINTS = [];
function initTimelapseZodiacalPoints() {
    if (TIMELAPSE_ZODIACAL_POINTS.length) return;
    const eps = 23.43929111 * Math.PI / 180;
    for (let i = 0; i < 72; i++) {
        const lam = i * 5 * Math.PI / 180;
        const sinDec = Math.sin(eps) * Math.sin(lam);
        const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
        const ra = Math.atan2(Math.sin(lam) * Math.cos(eps), Math.cos(lam));
        TIMELAPSE_ZODIACAL_POINTS.push({
            raDeg: ((ra * 180 / Math.PI) + 360) % 360,
            decDeg: dec * 180 / Math.PI
        });
    }
}
initTimelapseZodiacalPoints();

function timelapseEquatorialENU(raDeg, decDeg) {
    const ha = (_fastHorizonLSTDeg - raDeg) * Math.PI / 180;
    const sinH = Math.sin(ha), cosH = Math.cos(ha);
    const decRad = decDeg * Math.PI / 180;
    const sinDec = Math.sin(decRad), cosDec = Math.cos(decRad);
    return {
        E: -cosDec * sinH,
        N: _fastHorizonCosLat * sinDec - _fastHorizonSinLat * cosDec * cosH,
        U: _fastHorizonSinLat * sinDec + _fastHorizonCosLat * cosDec * cosH
    };
}

function timelapseHorizonFromEquatorial(raDeg, decDeg) {
    const v = timelapseEquatorialENU(raDeg, decDeg);
    let alt = Math.asin(Math.max(-1, Math.min(1, v.U))) * 180 / Math.PI;
    const az = ((Math.atan2(v.E, v.N) * 180 / Math.PI) + 360) % 360;
    if (alt >= -1.0) alt += dynamicRefraction(alt);
    return { altitude: alt, azimuth: az, E: v.E, N: v.N, U: v.U };
}

function updateProjectionBasis() {
    _projW = canvas.width / Math.min(window.devicePixelRatio, 2);
    _projH = canvas.height / Math.min(window.devicePixelRatio, 2);
    _projCx = _projW / 2;
    _projCy = _projH / 2;
}

// Convert an already-known horizon position to the local sky basis once.
// AR changes only the device rotation matrix, so this basis remains valid while
// the phone moves and avoids repeating four trig calls for every object/frame.
function cacheENUFromAltAz(pt, alt, az) {
    const altRad = alt * Math.PI / 180;
    const azRad = az * Math.PI / 180;
    const cosAlt = Math.cos(altRad);
    pt._enuE = cosAlt * Math.sin(azRad);
    pt._enuN = cosAlt * Math.cos(azRad);
    pt._enuU = Math.sin(altRad);
    pt._enuValid = true;
}

function projectENU(E, N, U) {
    const w = _projW, h = _projH, cx = _projCx, cy = _projCy;
    if (CELESTIAL_3D_MODE && !arMode) {
        // True 3D celestial camera. We represent the visible hemisphere on the
        // screen with a stereographic projection. The sphere itself is 3D:
        // ENU vectors are rotated into a camera basis, then projected from the
        // antipode of the camera direction. At the default orientation the
        // zenith is centered and South is at the top of the screen.
        const yaw = viewYawDeg * Math.PI / 180;
        const pitch = viewPitchDeg * Math.PI / 180;
        const roll = rotateOffset * Math.PI / 180;

        const cyaw = Math.cos(yaw), syaw = Math.sin(yaw);
        // Camera basis after yaw around local Up.
        let rx = -cyaw, ry = -syaw, rz = 0;
        let ux = syaw,  uy = -cyaw, uz = 0;
        let fx = 0, fy = 0, fz = 1;

        // Pitch around the camera's right axis.
        const cp = Math.cos(pitch), sp = Math.sin(pitch);
        const nux = ux * cp + fx * sp;
        const nuy = uy * cp + fy * sp;
        const nuz = uz * cp + fz * sp;
        const nfx = fx * cp - ux * sp;
        const nfy = fy * cp - uy * sp;
        const nfz = fz * cp - uz * sp;
        ux = nux; uy = nuy; uz = nuz;
        fx = nfx; fy = nfy; fz = nfz;

        // Roll the instrument around its optical axis. This is the existing
        // South-Up rotateOffset, now applied as a real camera roll.
        const cr = Math.cos(roll), sr = Math.sin(roll);
        const nrx = rx * cr + ux * sr;
        const nry = ry * cr + uy * sr;
        const nrz = rz * cr + uz * sr;
        const nurx = ux * cr - rx * sr;
        const nury = uy * cr - ry * sr;
        const nurz = uz * cr - rz * sr;
        rx = nrx; ry = nry; rz = nrz;
        ux = nurx; uy = nury; uz = nurz;

        const camX = E * rx + N * ry + U * rz;
        const camY = E * ux + N * uy + U * uz;
        const camZ = E * fx + N * fy + U * fz;
        if (camZ <= 0.0005) return { x: -9999, y: -9999, dist: 0, onScreen: false, z3d: camZ };

        const focal = Math.max(w, h) * 0.425 * visualZoomLevel;
        const denom = 1 + camZ;
        const px = camX / denom * 2 * focal;
        const py = camY / denom * 2 * focal;
        const x = cx + px;
        const y = cy - py;
        const onScreen = x > -w && x < w * 2 && y > -h && y < h * 2;
        return { x, y, dist: 1 / camZ, onScreen, z3d: camZ };
    }

    const focalLength = Math.max(w, h) * 0.85 * arZoomLevel;
    const dx = R_matrix[0] * E + R_matrix[3] * N + R_matrix[6] * U;
    const dy = R_matrix[1] * E + R_matrix[4] * N + R_matrix[7] * U;
    const dz = R_matrix[2] * E + R_matrix[5] * N + R_matrix[8] * U;
    const z_depth = -dz;
    if (z_depth <= 0.01) return { x: -9999, y: -9999, dist: 0, onScreen: false, z3d: z_depth };
    const px = (dx / z_depth) * focalLength;
    const py = (dy / z_depth) * focalLength;
    const sx = px * _screenCos + py * _screenSin;
    const sy = -px * _screenSin + py * _screenCos;
    const x = cx + sx;
    const y = cy - sy;
    const onScreen = x > -w && x < w*2 && y > -h && y < h*2;
    return { x, y, dist: 1, onScreen, z3d: z_depth };
}

function projectCachedSkyPoint(pt) {
    if (!pt._enuValid) cacheENUFromAltAz(pt, pt._cAlt, pt._cAz);
    return projectENU(pt._enuE, pt._enuN, pt._enuU);
}

function projectAz(alt, az) {
    const altRad = alt * Math.PI / 180;
    const azRad = az * Math.PI / 180;
    const cosAlt = Math.cos(altRad);
    const E = cosAlt * Math.sin(azRad);
    const N = cosAlt * Math.cos(azRad);
    const U = Math.sin(altRad);
    return projectENU(E, N, U);
}

// --- HORIZON DIRECTION MARKERS (N / NE / E / SE / S / SW / W / NW) ---
// Direction markers use the same 3D camera orientation as the sky. At the
// absolute minimum zoom (0.4x), all eight directions remain available as
// compact edge markers. Once the user zooms in, only directions that are
// actually inside the current sky view are drawn — never off-screen.
const CARDINAL_DIRS = [
    { label: 'N',  az: 0   },
    { label: 'NE', az: 45  },
    { label: 'E',  az: 90  },
    { label: 'SE', az: 135 },
    { label: 'S',  az: 180 },
    { label: 'SW', az: 225 },
    { label: 'W',  az: 270 },
    { label: 'NW', az: 315 }
];
const CARDINAL_COLOR = '#00f0ff';
const MIN_SKY_ZOOM = 0.4;

function getDirectionMarkerProjection(az) {
    const w = _projW, h = _projH, cx = _projCx, cy = _projCy;
    const azRad = az * Math.PI / 180;
    const E = Math.sin(azRad);
    const N = Math.cos(azRad);

    // Same camera basis as projectENU(), but we intentionally keep the horizon
    // direction as U=0 so the marker represents the true horizon direction.
    const yaw = viewYawDeg * Math.PI / 180;
    const pitch = viewPitchDeg * Math.PI / 180;
    const roll = rotateOffset * Math.PI / 180;
    const cyaw = Math.cos(yaw), syaw = Math.sin(yaw);

    let rx = -cyaw, ry = -syaw, rz = 0;
    let ux = syaw,  uy = -cyaw, uz = 0;
    let fx = 0, fy = 0, fz = 1;

    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const nux = ux * cp + fx * sp;
    const nuy = uy * cp + fy * sp;
    const nuz = uz * cp + fz * sp;
    const nfx = fx * cp - ux * sp;
    const nfy = fy * cp - uy * sp;
    const nfz = fz * cp - uz * sp;
    ux = nux; uy = nuy; uz = nuz;
    fx = nfx; fy = nfy; fz = nfz;

    const cr = Math.cos(roll), sr = Math.sin(roll);
    const nrx = rx * cr + ux * sr;
    const nry = ry * cr + uy * sr;
    const nrz = rz * cr + uz * sr;
    const nurx = ux * cr - rx * sr;
    const nury = uy * cr - ry * sr;
    const nurz = uz * cr - rz * sr;
    rx = nrx; ry = nry; rz = nrz;
    ux = nurx; uy = nury; uz = nurz;

    const camX = E * rx + N * ry;
    const camY = E * ux + N * uy;
    const camZ = E * fx + N * fy;

    const focal = Math.max(w, h) * 0.425 * Math.max(visualZoomLevel, MIN_SKY_ZOOM);

    if (camZ > 0.0005) {
        const denom = 1 + camZ;
        const x = cx + (camX / denom) * 2 * focal;
        const y = cy - (camY / denom) * 2 * focal;
        const margin = 18;
        if (x >= margin && x <= w - margin && y >= margin && y <= h - margin) {
            return { x, y, edge: false };
        }
    }

    // Edge indicators are ONLY a minimum-zoom feature. This prevents a
    // direction that has genuinely left the field of view from lingering on
    // screen while zoomed in. Use zoomLevel (the user's actual target zoom),
    // not visualZoomLevel, so the marker does not animate/fall during the
    // eased zoom transition.
    if (zoomLevel > MIN_SKY_ZOOM + 0.0001) return null;

    const len = Math.hypot(camX, camY) || 1;
    const sx = camX / len;
    const sy = -camY / len;
    const margin = Math.max(22, Math.min(w, h) * 0.055);
    const halfW = Math.max(1, w / 2 - margin);
    const halfH = Math.max(1, h / 2 - margin);
    const scale = Math.min(halfW / Math.max(Math.abs(sx), 0.0001), halfH / Math.max(Math.abs(sy), 0.0001));

    return {
        x: cx + sx * scale,
        y: cy + sy * scale,
        edge: true
    };
}

function drawCardinalMarkers(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 12px "Space Grotesk", sans-serif';
    ctx.lineJoin = 'round';

    CARDINAL_DIRS.forEach(d => {
        const p = getDirectionMarkerProjection(d.az);
        if (!p) return;

        ctx.globalAlpha = p.edge ? 0.72 : 1.0;
        ctx.shadowColor = CARDINAL_COLOR;
        ctx.shadowBlur = p.edge ? 6 : 9;
        ctx.fillStyle = CARDINAL_COLOR;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.edge ? 2.2 : 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(3, 6, 14, 0.82)';
        ctx.lineWidth = 3;
        ctx.strokeText(d.label, p.x, p.y - (p.edge ? 10 : 13));
        ctx.shadowColor = 'rgba(0, 240, 255, 0.65)';
        ctx.shadowBlur = p.edge ? 5 : 7;
        ctx.fillText(d.label, p.x, p.y - (p.edge ? 10 : 13));
    });

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();
}

// --- DOME GRID ---
// Replaces the old flat-disk horizon ring. Every line is sampled at several
// points and pushed through the same yaw/pitch/roll-aware projectAz() used for
// stars, rather than being drawn as a straight chord or a circle fixed to the
// screen centre — so the meridians and altitude rings genuinely curve to match
// whichever part of the dome you're currently looking at, including off-zenith
// views, instead of only looking right when facing straight up.
function drawDomeGrid(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.16)';
    ctx.lineWidth = 1;

    // Azimuth meridians: zenith down to the horizon, one every 30°.
    for (let az = 0; az < 360; az += 30) {
        ctx.beginPath();
        let first = true;
        for (let alt = 0; alt <= 90; alt += 4) {
            const p = projectAz(alt, az);
            if (p.z3d > 0.02 && p.onScreen) {
                if (first) { ctx.moveTo(p.x, p.y); first = false; }
                else ctx.lineTo(p.x, p.y);
            } else {
                first = true;
            }
        }
        ctx.stroke();
    }

    // Altitude rings, including the horizon itself (alt 0) as the dome's base.
    for (let alt = 0; alt <= 80; alt += 20) {
        ctx.beginPath();
        let first = true;
        for (let az = 0; az <= 360; az += 4) {
            const p = projectAz(alt, az);
            if (p.z3d > 0.02 && p.onScreen) {
                if (first) { ctx.moveTo(p.x, p.y); first = false; }
                else ctx.lineTo(p.x, p.y);
            } else {
                first = true;
            }
        }
        ctx.stroke();
    }
    ctx.restore();
}

let lastStarPositions = [];
const dsoRenderPositions = DSO_OBJECTS.map(obj => ({ ...obj }));
let lastPlanetPositions = [];

function getStarColor(temp) {
    if (!temp) return {r:226,g:226,b:230};
    if (temp > 30000) return {r:155,g:176,b:255};
    if (temp > 10000) return {r:170,g:191,b:255};
    if (temp > 7500) return {r:200,g:220,b:255};
    if (temp > 6000) return {r:255,g:255,b:255};
    if (temp > 5200) return {r:255,g:255,b:200};
    if (temp > 3700) return {r:255,g:230,b:150};
    return {r:255,g:180,b:120};
}

// Nudges an "r,g,b" string's warm/cool balance slightly, so a nebula's blobs vary in
// tint rather than all being one flat, uniform color — cheap, no full HSL conversion needed.
function shiftHue(rgbStr, degrees) {
    if (!degrees) return rgbStr;
    const [r, g, b] = rgbStr.split(',').map(Number);
    const amt = degrees * 0.8;
    const nr = Math.min(255, Math.max(0, r + amt));
    const nb = Math.min(255, Math.max(0, b - amt));
    return `${Math.round(nr)},${Math.round(g)},${Math.round(nb)}`;
}


// --- Photorealistic rendering helpers ---
// These functions are visual-only. They never alter astronomical coordinates.
function atmosphericExtinction(alt) {
    if (!Number.isFinite(alt) || alt <= 0) return 0.02;
    // Simple airmass approximation: extinction increases rapidly toward horizon.
    const sinAlt = Math.max(0.05, Math.sin(alt * Math.PI / 180));
    const airmass = Math.min(8, 1 / (sinAlt + 0.025 * Math.exp(-11 * sinAlt)));
    const k = 0.12 + Math.max(0, currentBortle - 3) * 0.018;
    return Math.max(0.05, Math.min(1, Math.pow(10, -0.4 * k * (airmass - 1))));
}

function getPhotorealSkyPalette(sunAlt) {
    const a = Number.isFinite(sunAlt) ? sunAlt : -20;
    if (a >= 10) return {top:[20,65,145], horizon:[120,170,215]};
    if (a >= -6) {
        const t = (a + 6) / 16;
        return {top:[Math.round(5 + 15*t), Math.round(10 + 50*t), Math.round(28 + 100*t)],
                horizon:[Math.round(28 + 95*t), Math.round(42 + 125*t), Math.round(72 + 135*t)]};
    }
    const night = Math.max(0, Math.min(1, (-a - 6) / 18));
    return {top:[Math.round(3 + 2*(1-night)), Math.round(6 + 4*(1-night)), Math.round(18 + 8*(1-night))],
            horizon:[Math.round(7 + 20*(1-night)), Math.round(12 + 22*(1-night)), Math.round(28 + 35*(1-night))]};
}

// --- PERSISTENT VISUAL RESOURCE CACHE (v27.3) ---
// Expensive radial gradients are created once as reusable sprites instead of being
// recreated for thousands of stars on every idle frame. The sprite is scaled at
// draw time, so the visual hierarchy remains unchanged while JS/GPU resource churn
// is dramatically reduced during long sessions.
const STAR_PSF_SPRITES = new Map();
const STAR_HALO_SPRITES = new Map();

function makeStarSprite(kind, colorKey, rgb, strength = 1) {
    const key = `${kind}:${colorKey}:${strength}`;
    const cache = kind === 'psf' ? STAR_PSF_SPRITES : STAR_HALO_SPRITES;
    if (cache.has(key)) return cache.get(key);
    const c = document.createElement('canvas');
    c.width = 96; c.height = 96;
    const x = 48, y = 48;
    const gctx = c.getContext('2d');
    gctx.clearRect(0,0,96,96);
    const grad = gctx.createRadialGradient(x,y,0,x,y,46);
    if (kind === 'psf') {
        grad.addColorStop(0, `rgba(255,255,255,${1.0 * strength})`);
        grad.addColorStop(0.08, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.78 * strength})`);
        grad.addColorStop(0.28, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.20 * strength})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
        grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.055 * strength})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
    }
    gctx.fillStyle = grad;
    gctx.beginPath(); gctx.arc(x,y,46,0,Math.PI*2); gctx.fill();
    cache.set(key, c);
    return c;
}

function drawCachedStarSprite(ctx, sprite, x, y, radius, alpha, composite='screen') {
    if (!sprite || alpha <= 0 || radius <= 0) return;
    const size = radius * 2;
    ctx.save();
    ctx.globalCompositeOperation = composite;
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, x - radius, y - radius, size, size);
    ctx.restore();
}

function starColorKey(col) { return `${col.r},${col.g},${col.b}`; }


function drawPhotorealStarPSF(ctx, star, alpha, size, col) {
    if (!Number.isFinite(star.x) || !Number.isFinite(star.y) || alpha <= 0) return;
    const magBoost = Math.max(0, -star.mag);
    const halo = size * (4.5 + magBoost * 2.5);
    const sprite = makeStarSprite('psf', starColorKey(col), col, 1);
    drawCachedStarSprite(ctx, sprite, star.x, star.y, halo, alpha, 'screen');
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1,alpha*1.15)})`;
    ctx.beginPath(); ctx.arc(star.x, star.y, Math.max(0.65,size*0.55), 0, Math.PI*2); ctx.fill();
    if (star.mag < 0.8 && size > 2) {
        const spike = size * (3.5 + Math.max(0,-star.mag));
        ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${Math.min(.35,alpha*.45)})`;
        ctx.lineWidth = .65;
        ctx.beginPath();
        ctx.moveTo(star.x-spike,star.y); ctx.lineTo(star.x+spike,star.y);
        ctx.moveTo(star.x,star.y-spike); ctx.lineTo(star.x,star.y+spike);
        ctx.stroke();
    }
}


// Shared caching helper for "sky-fixed" decorative points (Milky Way texture,
// deep-sky objects...). Same idea as the star loop: recompute alt/az only on
// refresh frames (see ASTRO_UPDATE_INTERVAL_MS / astroPositionsFresh above),
// otherwise reuse the value cached on the point object from the last refresh.
function getCachedHorizon(pt, raDeg, decDeg, astroTime, observer) {
    if (astroPositionsFresh || pt._cValid === undefined) {
        const pre = precessStarToDate(raDeg, decDeg, astroTime);
        let alt, az;
        if (timelapseActive) {
            // Fixed Milky-Way/DSO points do not have meaningful proper motion. In
            // Timelapse we therefore use their catalog equatorial coordinates
            // directly and avoid a full precession calculation for every texture
            // point on every frame. Precession is far below visible resolution over
            // the short real-time interval of a timelapse frame.
            const fast = timelapseHorizonFromEquatorial(raDeg, decDeg);
            alt = fast.altitude;
            az = fast.azimuth;
        } else {
            const hor = Astronomy.Horizon(astroTime, observer, pre.ra, pre.dec, dynamicRefraction);
            alt = hor.altitude;
            az = hor.azimuth;
        }
        pt._cAlt = alt;
        pt._cAz = az;
        cacheENUFromAltAz(pt, alt, az);
        pt._cValid = true;
    }
    return { altitude: pt._cAlt, azimuth: pt._cAz };
}

function drawPhotorealSkyEffects(ctx,w,h,cx,cy,r,sunAlt,astroTime,observer) {
    if (!photorealisticMode || arMode) return;
    const night = Math.max(0, Math.min(1, (-sunAlt + 4) / 18));
    if (night <= 0) return;

    // Airglow: extremely faint, broad horizon illumination.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const air = ctx.createRadialGradient(cx, h*0.92, 0, cx, h*0.92, Math.max(w,h)*0.8);
    air.addColorStop(0, `rgba(85,125,150,${0.045*night})`);
    air.addColorStop(0.55, `rgba(30,70,100,${0.018*night})`);
    air.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle=air; ctx.fillRect(0,0,w,h);

    // Light-pollution dome. Bortle is used only as an intensity control.
    const pollution = Math.max(0, Math.min(1, (currentBortle-1)/8));
    if (pollution > 0.02) {
        const lp = ctx.createRadialGradient(cx,h,r*.05,cx,h,r*1.15);
        lp.addColorStop(0,`rgba(255,205,125,${0.11*pollution*night})`);
        lp.addColorStop(.35,`rgba(205,165,115,${0.045*pollution*night})`);
        lp.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=lp; ctx.fillRect(0,0,w,h);
    }

    // Zodiacal light remains enabled on mobile when the sky is idle. It is only
    // suppressed during active gestures, where the user benefits far more from
    // immediate frame response than from a subtle per-point gradient layer.
    if (isActivelyGesturing()) {
        ctx.restore();
        return;
    }

    // Zodiacal light, centered on the true ecliptic: sample ecliptic latitude and
    // longitude and convert the band to equatorial coordinates before projection.
    for(let i=0;i<TIMELAPSE_ZODIACAL_POINTS.length;i++){
        const zp = TIMELAPSE_ZODIACAL_POINTS[i];
        let hor;
        if (timelapseActive) hor = timelapseHorizonFromEquatorial(zp.raDeg, zp.decDeg);
        else {
            const pre=precessStarToDate(zp.raDeg,zp.decDeg,astroTime);
            hor=Astronomy.Horizon(astroTime,observer,pre.ra,pre.dec,dynamicRefraction);
        }
        if(hor.altitude<=0) continue;
        const p=projectAz(hor.altitude,hor.azimuth); if(!p.onScreen) continue;
        const width=(10+8*night)*(r/90);
        const z=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,width);
        z.addColorStop(0,`rgba(225,205,160,${0.018*night})`);
        z.addColorStop(.35,`rgba(210,195,160,${0.008*night})`);
        z.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=z; ctx.beginPath(); ctx.arc(p.x,p.y,width,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
}

function drawMilkyWayFilaments(ctx, astroTime, observer, mwFader, pixelPerDeg) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    MW_FILAMENTS.forEach((filament, fi) => {
        let started = false;
        ctx.beginPath();
        filament.forEach((pt, qi) => {
            const hor = getCachedHorizon(pt, pt.raHrs * 15, pt.dec, astroTime, observer);
            if (hor.altitude < 1) { started = false; return; }
            const proj = projectAz(hor.altitude, hor.azimuth);
            if (!proj.onScreen) { started = false; return; }
            if (!started) { ctx.moveTo(proj.x, proj.y); started = true; }
            else ctx.lineTo(proj.x, proj.y);
        });
        ctx.strokeStyle = `rgba(215,225,240,${(0.014 + (fi % 4) * 0.002) * mwFader})`;
        ctx.lineWidth = Math.max(0.7, pixelPerDeg * (0.22 + (fi % 3) * 0.06));
        ctx.stroke();
    });
    ctx.restore();
}

function drawMilkyWayDustRifts(ctx, astroTime, observer, mwFader, pixelPerDeg) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    MW_DUST.forEach((d, i) => {
        const pre = precessStarToDate(d.raHrs * 15, d.dec, astroTime);
        const hor = Astronomy.Horizon(astroTime, observer, pre.ra, pre.dec, dynamicRefraction);
        if (hor.altitude < 2) return;
        const p = projectAz(hor.altitude, hor.azimuth);
        if (!p.onScreen) return;
        const rr = d.sizeDeg * pixelPerDeg;
        const g = ctx.createRadialGradient(p.x, p.y, rr * .08, p.x, p.y, rr);
        const alpha = d.alpha * mwFader * 0.72;
        g.addColorStop(0, `rgba(1,3,10,${alpha})`);
        g.addColorStop(.42, `rgba(1,3,10,${alpha*.55})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI*2); ctx.fill();
    });
    ctx.restore();
}

function drawPhotorealMilkyWay(ctx,astroTime,observer,mwFader,r) {
    // Add deterministic multi-scale density variation on top of the existing
    // Galactic-coordinate Milky Way. The actual sky position is still derived
    // from the same galactic coordinates used by MW_BLOBS.
    const w=canvas.width/Math.min(window.devicePixelRatio,2);
    const h=canvas.height/Math.min(window.devicePixelRatio,2);
    const pixelPerDeg=r/90;
    ctx.save(); ctx.globalCompositeOperation='screen';
    for(let i=0;i<MW_BLOBS.length;i+=2){
        const blob=MW_BLOBS[i];
        const hor=getCachedHorizon(blob, blob.raHrs*15, blob.dec, astroTime, observer);
        if(hor.altitude<=1) continue;
        const p=projectAz(hor.altitude,hor.azimuth); if(!p.onScreen) continue;
        const seed=Math.sin((i+1)*12.9898)*43758.5453;
        const noise=0.55+0.45*(seed-Math.floor(seed));
        const rr=blob.sizeDeg*pixelPerDeg*(1.3+noise*.9);
        const alpha=Math.min(.075,blob.alpha*1.7*noise*mwFader);
        if(alpha<.001) continue;
        const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,rr);
        g.addColorStop(0,`rgba(${blob.color},${alpha})`);
        g.addColorStop(.3,`rgba(${blob.color},${alpha*.38})`);
        g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,rr,0,Math.PI*2); ctx.fill();
    }

    // Photographic fine structure: thin luminous filaments over the broad band.
    ctx.globalCompositeOperation='screen';
    for (let i=0; i<MW_FINE.length; i++) {
        const s=MW_FINE[i];
        const hor=getCachedHorizon(s, s.raHrs*15, s.dec, astroTime, observer);
        if(hor.altitude<2) continue;
        const p=projectAz(hor.altitude,hor.azimuth); if(!p.onScreen) continue;
        const rr=s.sizeDeg*pixelPerDeg*(0.8 + 0.5*Math.sin(i*1.37)**2);
        const a=s.alpha*mwFader;
        const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,rr);
        g.addColorStop(0,`rgba(210,220,235,${a})`);
        g.addColorStop(.28,`rgba(180,195,215,${a*.42})`);
        g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,rr,0,Math.PI*2); ctx.fill();
    }

    // Connected filaments give the Milky Way a photographic, non-blobby structure.
    drawMilkyWayFilaments(ctx, astroTime, observer, mwFader, pixelPerDeg);

    // Dust lanes are rendered as subtle translucent voids over the luminous band.
    ctx.globalCompositeOperation='source-over';
    for (let i=0; i<MW_DUST.length; i++) {
        const d=MW_DUST[i];
        const hor=getCachedHorizon(d, d.raHrs*15, d.dec, astroTime, observer);
        if(hor.altitude<2) continue;
        const p=projectAz(hor.altitude,hor.azimuth); if(!p.onScreen) continue;
        const rr=d.sizeDeg*pixelPerDeg;
        const a=d.alpha*mwFader;
        const g=ctx.createRadialGradient(p.x,p.y,rr*.12,p.x,p.y,rr);
        g.addColorStop(0,`rgba(0,2,8,${a})`);
        g.addColorStop(.55,`rgba(0,2,8,${a*.45})`);
        g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,rr,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
}

function getSkyGradient(ctx,w,h,sunAlt) {
    if(!photorealisticMode){
        let t=Math.max(0,Math.min(1,(sunAlt+15)/30));
        const rT=Math.round(6+(26-6)*t),gT=Math.round(10+(75-10)*t),bT=Math.round(18+(140-18)*t);
        let rB,gB,bB;
        if(t<.5){const t2=t*2;rB=Math.round(6+(217-6)*t2);gB=Math.round(10+(118-10)*t2);bB=Math.round(18+(67-18)*t2);}
        else{const t2=(t-.5)*2;rB=Math.round(217+(96-217)*t2);gB=Math.round(118+(157-118)*t2);bB=Math.round(67+(214-67)*t2);}
        const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,`rgb(${rT},${gT},${bT})`);grad.addColorStop(1,`rgb(${rB},${gB},${bB})`);return grad;
    }
    const p=getPhotorealSkyPalette(sunAlt), grad=ctx.createLinearGradient(0,0,0,h);
    grad.addColorStop(0,`rgb(${p.top[0]},${p.top[1]},${p.top[2]})`);
    grad.addColorStop(.55,`rgb(${Math.round(p.top[0]*.85+p.horizon[0]*.15)},${Math.round(p.top[1]*.85+p.horizon[1]*.15)},${Math.round(p.top[2]*.85+p.horizon[2]*.15)})`);
    grad.addColorStop(1,`rgb(${p.horizon[0]},${p.horizon[1]},${p.horizon[2]})`); return grad;
}

function drawSmartLabel(ctx, text, baseX, baseY, color, font, drawnLabels, forceDraw = false) {
    ctx.font = font;
    const w = ctx.measureText(text).width;
    const h = 14; 
    const offsets = [
        {x: 6, y: 4},
        {x: -w - 6, y: 4},
        {x: -w/2, y: -12},
        {x: -w/2, y: 16}
    ];
    for (let off of offsets) {
        const px = baseX + off.x;
        const py = baseY + off.y;
        const box = {x: px - 2, y: py - 12, w: w + 4, h: h + 4};
        
        let overlap = false;
        if (!forceDraw) {
            for (let b of drawnLabels) {
                if (!(box.x > b.x + b.w || box.x + box.w < b.x || box.y > b.y + b.h || box.y + box.h < b.y)) {
                    overlap = true; break;
                }
            }
        }
        if (!overlap || forceDraw) {
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.9)';
            ctx.shadowBlur = 3;
            ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 1;
            ctx.fillStyle = color;
            ctx.fillText(text, px, py);
            ctx.restore();
            drawnLabels.push(box);
            return;
        }
    }
}
// Calculates true atmospheric bending based on live local temperature and pressure
function dynamicRefraction(alt) {
    if (alt < -1.0) return 0; // Skip below horizon
    const altDeg = alt;
    const rArcMin = 1.02 / Math.tan((altDeg + 10.3 / (altDeg + 5.11)) * Math.PI / 180);
    const rAdj = rArcMin * (livePressure / 1010) * (283 / (273 + liveTemp));
    return rAdj / 60; // Return in degrees
}

// Intercept Astronomy.Horizon to safely inject our custom math
const _origHorizon = Astronomy.Horizon;
Astronomy.Horizon = function(time, observer, ra, dec, ref_opt) {
    // Get the raw, unrefracted position from the library
    const hor = _origHorizon(time, observer, ra, dec, null);
    
    // If our custom function was passed, safely apply our calculation
    if (ref_opt === dynamicRefraction) {
        hor.altitude += dynamicRefraction(hor.altitude);
    } else if (ref_opt === 'normal') {
        const stdRef = _origHorizon(time, observer, ra, dec, 'normal');
        hor.altitude = stdRef.altitude;
    }
    return hor;
};

// Add the data loader and buckets right before drawMap()
let ALL_STARS = typeof BRIGHT_STARS !== 'undefined' ? [...BRIGHT_STARS] : [];
let starWebGLRenderer = null;
let starWebGLEnabled = false;

function loadExpandedStarCatalog() {
    // If the file loaded properly via the script tag, EXPANDED_STARS will exist
    if (typeof EXPANDED_STARS === 'undefined') {
        console.warn('Expanded catalog could not be loaded; running on primary bright stars.');
        return;
    }
    
    // Safely map existing names (ignoring any without a name)
    const existingNames = new Set(ALL_STARS.filter(s => s.name).map(s => s.name.toLowerCase()));
    
    // Only exclude if the star HAS a name and it already exists in the set
    const newStars = EXPANDED_STARS.filter(s => !s.name || !existingNames.has(s.name.toLowerCase()));
    
    ALL_STARS = [...ALL_STARS, ...newStars];
    console.log(`✨ Star catalog updated: ${ALL_STARS.length} total stars loaded.`);
}

// Execute immediately since the data is already loaded via <script> tags
loadExpandedStarCatalog();

// Name -> star lookup for constellation lines. Previously each of the ~157 constellation
// segments did two ALL_STARS.find() calls (a linear scan) every single frame; with a
// catalog this size that's tens of thousands of string comparisons/sec for no reason,
// since the star list itself never changes shape after load. Built once here instead.
const STAR_NAME_INDEX = new Map();
for (let i = 0; i < ALL_STARS.length; i++) {
    const s = ALL_STARS[i];
    if (s.name && !STAR_NAME_INDEX.has(s.name)) STAR_NAME_INDEX.set(s.name, s);
    const decRad = s.dec * Math.PI / 180;
    s._sinDec = Math.sin(decRad);
    s._cosDec = Math.cos(decRad);
}
// Labels are always selected by magnitude. Keep the catalogue sorted once instead
// of filtering and sorting the whole catalogue on every AR frame.
const NAMED_STARS_BY_MAG = ALL_STARS.filter(s => s.name).sort((a, b) => a.mag - b.mag);

const FAINT_COLOR_BUCKETS = {
    blue:   { fill: 'rgba(170, 191, 255, 0.75)', stars: [] },
    white:  { fill: 'rgba(235, 240, 255, 0.80)', stars: [] },
    yellow: { fill: 'rgba(255, 245, 180, 0.80)', stars: [] },
    orange: { fill: 'rgba(255, 190, 130, 0.75)', stars: [] },
    red:    { fill: 'rgba(255, 130, 110, 0.70)', stars: [] }
};

function getBucketKey(temp) {
    if (temp >= 10000) return 'blue';
    if (temp >= 7000)  return 'white';
    if (temp >= 5200)  return 'yellow';
    if (temp >= 3800)  return 'orange';
    return 'red';
}

// --- ADAPTIVE STAR LOD ---
// The catalogue remains complete, but we do not need to paint every faint star
// when the map is zoomed out or physically moving. The eye cannot resolve those
// tiny points during motion anyway. Keeping the Milky Way + the brighter stars
// visible preserves the hypnotic density without paying for ~5,000 projections
// and draw calls on every phone frame.
const STAR_LOD_MAG = {
    mobileDrag: [3.8, 4.5, 5.0, 5.5, 5.7],
    mobileIdle: [4.0, 4.5, 5.0, 5.5, 5.7],
    desktopDrag: [4.0, 4.5, 5.0, 5.5, 6.0],
    desktopIdle: [4.5, 5.0, 5.5, 5.7, 6.0]
};

let STAR_LOD_LISTS = null;
function buildStarLodLists() {
    // Named constellation stars are always retained so the constellation layer
    // never loses an important anchor merely because it is on a lower LOD tier.
    const constellationNames = new Set();
    if (typeof CONSTELLATION_LINES !== 'undefined') {
        CONSTELLATION_LINES.forEach(pair => {
            constellationNames.add(pair[0]);
            constellationNames.add(pair[1]);
        });
    }

    const make = maxMag => ALL_STARS.filter(star =>
        star.mag <= maxMag || (star.name && constellationNames.has(star.name))
    );

    STAR_LOD_LISTS = {
        mDrag: STAR_LOD_MAG.mobileDrag.map(make),
        mIdle: STAR_LOD_MAG.mobileIdle.map(make),
        dDrag: STAR_LOD_MAG.desktopDrag.map(make),
        dIdle: STAR_LOD_MAG.desktopIdle.map(make)
    };
    console.log(`✨ Adaptive star LOD ready: mobile ${STAR_LOD_LISTS.mIdle.map(a => a.length).join('/')} | desktop ${STAR_LOD_LISTS.dIdle.map(a => a.length).join('/')}`);
}
buildStarLodLists();

// GPU star renderer: the existing Canvas 2D renderer remains the automatic fallback.
try {
    if (typeof createStarSightWebGLRenderer === 'function' && starWebGLCanvas) {
        starWebGLRenderer = createStarSightWebGLRenderer(starWebGLCanvas);
        if (starWebGLRenderer) {
            starWebGLRenderer.uploadStars(ALL_STARS);
            starWebGLEnabled = true;
            starWebGLCanvas.classList.add('webgl-ready');
            console.log('✨ StarSight WebGL2 star renderer enabled.');
        }
    }
} catch (e) {
    console.warn('StarSight WebGL2 renderer failed; using Canvas 2D fallback.', e);
    starWebGLRenderer = null;
    starWebGLEnabled = false;
    if (starWebGLCanvas) starWebGLCanvas.classList.remove('webgl-ready');
    if (canvas) canvas.classList.add('sky-ready');
}

function getWebGLStarLodMag(mobile, moving, zoom) {
    const tiers = moving
        ? (mobile ? STAR_LOD_MAG.mobileDrag : STAR_LOD_MAG.desktopDrag)
        : (mobile ? STAR_LOD_MAG.mobileIdle : STAR_LOD_MAG.desktopIdle);
    if (zoom < 0.55) return tiers[0];
    if (zoom < 0.80) return tiers[1];
    if (zoom < 1.05) return tiers[2];
    if (zoom < 1.35) return tiers[3];
    return tiers[4];
}

function getStarRenderList() {
    if (!STAR_LOD_LISTS) return ALL_STARS;
    const mobile = isMobileDeviceCheck();
    const moving = isActivelyGesturing();
    const zoom = visualZoomLevel;
    const tiers = moving
        ? (mobile ? STAR_LOD_LISTS.mDrag : STAR_LOD_LISTS.dDrag)
        : (mobile ? STAR_LOD_LISTS.mIdle : STAR_LOD_LISTS.dIdle);

    // LOD is intentionally gradual. Mobile idle keeps a dense, beautiful sky,
    // while active gestures use a lighter tier; zooming in progressively reveals more.
    if (zoom < 0.55) return tiers[0];
    if (zoom < 0.80) return tiers[1];
    if (zoom < 1.05) return tiers[2];
    if (zoom < 1.35) return tiers[3];
    return tiers[4];
}

function updateWebGLConstellationStarPositions(astroTime, observer) {
    // WebGL owns the visible star pixels, but the existing Canvas 2D constellation
    // and tooltip layers still need current screen coordinates. Update only named
    // stars here instead of walking the full catalogue. This keeps the CPU side
    // dramatically lighter while preserving existing interaction/constellation UI.
    const gmst = Astronomy.SiderealTime(astroTime);
    let lstDeg = (gmst * 15 + observer.longitude) % 360;
    if (lstDeg < 0) lstDeg += 360;
    const latRad = observer.latitude * Math.PI / 180;
    const sinLat = Math.sin(latRad), cosLat = Math.cos(latRad);
    const rad2deg = 180 / Math.PI;
    for (let i = 0; i < NAMED_STARS_BY_MAG.length; i++) {
        const star = NAMED_STARS_BY_MAG[i];
        const ha = (lstDeg - star.ra) * Math.PI / 180;
        const sinH = Math.sin(ha), cosH = Math.cos(ha);
        const sinDec = star._sinDec, cosDec = star._cosDec;
        const E = -cosDec * sinH;
        const N = cosLat * sinDec - sinLat * cosDec * cosH;
        const U = sinLat * sinDec + cosLat * cosDec * cosH;
        const alt = Math.asin(Math.max(-1, Math.min(1, U))) * rad2deg;
        star.alt = alt;
        star.onScreen = false;
        if (alt < 0) continue;
        const az = ((Math.atan2(E, N) * rad2deg) + 360) % 360;
        star.az = az;
        const proj = projectAz(alt, az);
        if (!proj.onScreen) continue;
        star.x = proj.x; star.y = proj.y; star.onScreen = true;
    }
}

function renderOptimizedStars(ctx, astroTime, observer, starDimFactor, w, h) {
    if (starWebGLEnabled) {
        updateWebGLConstellationStarPositions(astroTime, observer);
        return;
    }
    for (let key in FAINT_COLOR_BUCKETS) { FAINT_COLOR_BUCKETS[key].stars.length = 0; }
    const brightStarsToGlow = [];
    const t = Date.now() * 0.001;

    // --- FAST MATH PRE-CALCULATION ---
    // Extract local sidereal time once per frame to bypass heavy Astronomy.Horizon calls for faint stars
    const gmst = Astronomy.SiderealTime(astroTime);
    let lstDeg = (gmst * 15 + observer.longitude) % 360;
    if (lstDeg < 0) lstDeg += 360;
    
    const latRad = lat * Math.PI / 180;
    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);
    const rad2deg = 180 / Math.PI;

    const renderStars = getStarRenderList();
    for (let i = 0; i < renderStars.length; i++) {
        const star = renderStars[i];

        // Clear previous-frame projection state before calculating this frame.
        // Without this, hidden/off-screen stars can retain stale x/y coordinates
        // and constellation lines may connect to those old positions.
        star.onScreen = false;
        star.x = NaN;
        star.y = NaN;

        let alt, az;

        // Sky position (alt/az) only needs recomputing on refresh frames — see
        // ASTRO_UPDATE_INTERVAL_MS. On in-between frames (including every frame of an
        // active drag/pinch) we reuse the last computed value; only the screen
        // projection below (which depends on pan/zoom/rotate) still runs every frame.
        if (astroPositionsFresh || star._cValid === undefined) {
            if (star.mag < 3.0) {
                if (timelapseActive) {
                    // Bright stars are the only catalog stars that normally use the
                    // high-precision Astronomy Engine path. During Timelapse, the
                    // visual difference from precession over a single frame is
                    // effectively sub-pixel, while the saved engine calls are large.
                    const fast = timelapseHorizonFromEquatorial(star.ra, star.dec);
                    alt = fast.altitude;
                    az = fast.azimuth;
                    if (alt >= 0.0) cacheENUFromAltAz(star, alt, az);
                    else star._enuValid = false;
                } else {
                    const precessed = precessStarToDate(star.ra, star.dec, astroTime, star.pmRa || 0, star.pmDec || 0);
                    const hor = Astronomy.Horizon(astroTime, observer, precessed.ra, precessed.dec, dynamicRefraction);
                    alt = hor.altitude;
                    az = hor.azimuth;
                    cacheENUFromAltAz(star, alt, az);
                }
            } else {
                // Direct E/N/U calculation avoids the old acos()+extra trig path.
                // Timelapse can therefore update the catalogue every frame much more cheaply.
                const haRad = (lstDeg - star.ra) * Math.PI / 180;
                const sinH = Math.sin(haRad), cosH = Math.cos(haRad);
                const sinDec = star._sinDec, cosDec = star._cosDec;
                const E = -cosDec * sinH;
                const N = cosLat * sinDec - sinLat * cosDec * cosH;
                const U = sinLat * sinDec + cosLat * cosDec * cosH;
                alt = Math.asin(Math.max(-1, Math.min(1, U))) * rad2deg;
                az = ((Math.atan2(E, N) * rad2deg) + 360) % 360;
                if (alt >= 0.0) {
                    cacheENUFromAltAz(star, alt, az);
                } else {
                    star._enuValid = false;
                }
            }
            star._cAlt = alt;
            star._cAz = az;
            star._cValid = alt >= 0.0;
        } else {
            alt = star._cAlt;
            az = star._cAz;
        }

        if (!(alt >= 0.0)) continue;

        const proj = arMode ? projectCachedSkyPoint(star) : projectAz(alt, az);
        if (!proj.onScreen) continue;

        star.alt = alt; star.az = az; star.x = proj.x; star.y = proj.y; star.onScreen = true;

        if (star.mag < 3.0) brightStarsToGlow.push(star);
        else FAINT_COLOR_BUCKETS[getBucketKey(star.temp)].stars.push(star);
    }

    // --- PASS A: Batch-Render Faint Stars ---
    for (let key in FAINT_COLOR_BUCKETS) {
        const bucket = FAINT_COLOR_BUCKETS[key];
        if (bucket.stars.length === 0) continue;
        ctx.fillStyle = photorealisticMode
            ? bucket.fill.replace(/0\.7[0-9]*|0\.8[0-9]*/, '0.92')
            : bucket.fill;
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        for (let j = 0; j < bucket.stars.length; j++) {
            const s = bucket.stars[j];
            // Keep the full faint catalogue visible at every zoom. Zoom changes
            // apparent scale/detail rather than revealing stars that were previously hidden.
            const visibilityBoost = photorealisticMode ? 1.10 : 1.0;
            const radius = Math.max(0.42, (6.4 - s.mag) * 0.34) * visibilityBoost *
                (arMode ? 1.2 : (visualZoomLevel * 0.32 + 0.68));
            ctx.moveTo(s.x + radius, s.y); ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        }
        ctx.fill();
    }

    // Subtle photographic micro-halos for medium/faint stars. These are deliberately
    // restrained so the sky stays dense and alive without turning into a blur.
    // Keep the photographic micro-halos on mobile when idle. They are disabled
    // only during an active gesture, when their visual contribution is hard to
    // perceive but their per-star gradients still consume frame time.
    if (photorealisticMode && !arMode && !isActivelyGesturing()) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (const key in FAINT_COLOR_BUCKETS) {
            for (const s of FAINT_COLOR_BUCKETS[key].stars) {
                if (s.mag < 3.0 || s.mag > 5.7) continue;
                const c = getStarColor(s.temp);
                const a = Math.max(0.015, Math.min(0.055, (5.8 - s.mag) * 0.012));
                const rr = 1.6 + Math.max(0, 5.2 - s.mag) * 0.35;
                const sprite = makeStarSprite('halo', starColorKey(c), c, 1);
                drawCachedStarSprite(ctx, sprite, s.x, s.y, rr, a / 0.055, 'screen');
            }
        }
        ctx.restore();
    }

    // --- PASS B: Hero Star Cinematic Glow ---
    for (let k = 0; k < brightStarsToGlow.length; k++) {
        const star = brightStarsToGlow[k];
        const col = getStarColor(star.temp);
        const noise = Math.sin(t * 2.5 + star.ra) * Math.cos(t * 3.1 + star.dec);
        const twinkle = 1.0 + (noise * 0.08 * Math.max(1, 20 / Math.max(2, star.alt)));
        let baseSize = Math.max(1.8, (3.5 - star.mag) * 1.5);
        if (arMode) baseSize *= 1.3 * arZoomLevel;
        const alpha = Math.min(1.0, (4.5 - star.mag) / 3.5) * starDimFactor * atmosphericExtinction(star.alt);
        if (photorealisticMode) {
            drawPhotorealStarPSF(ctx, star, alpha * twinkle, baseSize, col);
            continue;
        }

        const glowRadius = baseSize * (star.mag < 0 ? 14.0 : 8.0);
        const g = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowRadius);
        g.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1.0, alpha * 1.5)})`); 
        g.addColorStop(0.1, `rgba(${col.r}, ${col.g}, ${col.b}, ${alpha * 0.85})`);
        g.addColorStop(0.4, `rgba(${col.r}, ${col.g}, ${col.b}, ${alpha * 0.25})`);
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(star.x, star.y, glowRadius, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1.0, alpha * twinkle)})`;
        ctx.beginPath(); ctx.arc(star.x, star.y, baseSize * 0.7, 0, Math.PI * 2); ctx.fill();

        if (star.mag < 1.2 && (visualZoomLevel > 1.15 || arMode)) {
            const spikeLen = baseSize * 5.0;
            ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${alpha * 0.35})`;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(star.x - spikeLen, star.y); ctx.lineTo(star.x + spikeLen, star.y);
            ctx.moveTo(star.x, star.y - spikeLen); ctx.lineTo(star.x, star.y + spikeLen);
            ctx.stroke();
        }
    }
}

// Cached full-quality Milky Way layer. The photographic MW is visually static for
// long stretches but expensive to regenerate because it contains many gradients.
// Rebuild on viewport changes or at a slow cadence while idle; gestures continue to
// use the lightweight path so panning remains responsive.
let idleMWCacheCanvas = null;
let idleMWCacheCtx = null;
let idleMWCacheW = 0, idleMWCacheH = 0;
let idleMWCacheSignature = '';
let idleMWCacheBuiltMs = -Infinity;

function getMWCacheCanvas(w, h) {
    if (!idleMWCacheCanvas || idleMWCacheW !== Math.round(w) || idleMWCacheH !== Math.round(h)) {
        idleMWCacheCanvas = document.createElement('canvas');
        idleMWCacheCanvas.width = Math.max(1, Math.round(w));
        idleMWCacheCanvas.height = Math.max(1, Math.round(h));
        idleMWCacheCtx = idleMWCacheCanvas.getContext('2d');
        idleMWCacheW = idleMWCacheCanvas.width;
        idleMWCacheH = idleMWCacheCanvas.height;
        idleMWCacheSignature = '';
    }
    return idleMWCacheCtx;
}

function renderIdleMWCache(astroTime, observer, mwFader, r, w, h) {
    const mctx = getMWCacheCanvas(w, h);
    mctx.setTransform(1,0,0,1,0,0);
    mctx.clearRect(0,0,w,h);
    mctx.globalAlpha = 1;
    mctx.globalCompositeOperation = 'source-over';

    const pixelPerDeg = r / 90;
    mctx.save();
    mctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < MW_BLOBS.length; i++) {
        const blob = MW_BLOBS[i];
        const hor = getCachedHorizon(blob, blob.raHrs*15, blob.dec, astroTime, observer);
        if (hor.altitude < 0) continue;
        const proj = projectAz(hor.altitude, hor.azimuth); if (!proj.onScreen) continue;
        const horizonFade = Math.min(1, Math.max(0, hor.altitude / 15)); if (horizonFade <= 0) continue;
        const radius = blob.sizeDeg * pixelPerDeg * visualZoomLevel;
        mctx.globalAlpha = blob.alpha * horizonFade * mwFader;
        mctx.drawImage(mwBrush, proj.x-radius, proj.y-radius, radius*2, radius*2);
    }
    if (photorealisticMode) drawPhotorealMilkyWay(mctx, astroTime, observer, mwFader, r);
    const mwTime = Date.now() * 0.001;
    mctx.globalCompositeOperation = 'screen';
    mctx.fillStyle = 'white';
    for (let i = 0; i < MW_STARS.length; i++) {
        const star = MW_STARS[i];
        const hor = getCachedHorizon(star, star.raHrs*15, star.dec, astroTime, observer);
        if (hor.altitude < 0) continue;
        const proj = projectAz(hor.altitude, hor.azimuth); if (!proj.onScreen) continue;
        const horizonFade = Math.min(1, Math.max(0, hor.altitude/10));
        const shimmer = .6 + .4*Math.sin(mwTime*star.blinkSpd + star.blinkOff);
        const alpha = star.baseAlpha*horizonFade*mwFader*shimmer;
        if (alpha <= 0) continue;
        mctx.globalAlpha = alpha;
        const sr = star.sizeDeg * visualZoomLevel;
        mctx.beginPath(); mctx.arc(proj.x, proj.y, sr, 0, Math.PI*2); mctx.fill();
    }
    mctx.restore();
    idleMWCacheBuiltMs = performance.now();
}

function drawCachedIdleMilkyWay(ctx, astroTime, observer, mwFader, r, w, h) {
    const viewportSig = `${Math.round(panX*10)/10}|${Math.round(panY*10)/10}|${Math.round(zoomLevel*1000)/1000}|${Math.round(rotateOffset*10)/10}|${Math.round(viewYawDeg*10)/10}|${Math.round(viewPitchDeg*10)/10}|${Math.round(w)}x${Math.round(h)}|${Math.round(mwFader*1000)/1000}|${photorealisticMode?1:0}`;
    const now = performance.now();
    // Refresh the photographic layer at most every 2 seconds when idle. This is
    // far below the perceptual threshold for sky motion but prevents continuous
    // recreation of hundreds of canvas gradients during long sessions.
    if (viewportSig !== idleMWCacheSignature || now - idleMWCacheBuiltMs > 2000 || !idleMWCacheCanvas) {
        idleMWCacheSignature = viewportSig;
        renderIdleMWCache(astroTime, observer, mwFader, r, w, h);
    }
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(idleMWCacheCanvas, 0, 0, w, h);
    ctx.restore();
}

function drawLightweightMilkyWay(ctx, astroTime, observer, mwFader, r, w, h) {
    // Mobile/gesture mode: preserve the broad, soft Galactic band but remove the
    // expensive photographic fine structure, dust gradients and per-frame shimmer.
    // The pre-rendered brush is intentionally retained because it is cheap and keeps
    // the sky visually rich rather than turning the map into a sparse star field.
    const pixelPerDeg = r / 90;
    const moving = isActivelyGesturing();
    const blobStep = moving ? 3 : 2;
    const starStep = moving ? 4 : 3;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 1;

    for (let i = 0; i < MW_BLOBS.length; i += blobStep) {
        const blob = MW_BLOBS[i];
        const hor = getCachedHorizon(blob, blob.raHrs * 15, blob.dec, astroTime, observer);
        if (hor.altitude < 0) continue;
        const proj = projectAz(hor.altitude, hor.azimuth);
        if (!proj.onScreen) continue;
        const horizonFade = Math.min(1, Math.max(0, hor.altitude / 15));
        if (horizonFade <= 0) continue;
        const radius = blob.sizeDeg * pixelPerDeg * visualZoomLevel;
        ctx.globalAlpha = blob.alpha * horizonFade * mwFader * (moving ? 1.0 : 1.08);
        ctx.drawImage(mwBrush, proj.x - radius, proj.y - radius, radius * 2, radius * 2);
    }

    // A sparse layer of static-looking stars gives the band photographic texture
    // without the 1,800-star animated shimmer used by the full desktop renderer.
    if (!moving) {
        ctx.fillStyle = 'white';
        for (let i = 0; i < MW_STARS.length; i += starStep) {
            const star = MW_STARS[i];
            const hor = getCachedHorizon(star, star.raHrs * 15, star.dec, astroTime, observer);
            if (hor.altitude < 0) continue;
            const proj = projectAz(hor.altitude, hor.azimuth);
            if (!proj.onScreen) continue;
            const horizonFade = Math.min(1, Math.max(0, hor.altitude / 10));
            const alpha = star.baseAlpha * horizonFade * mwFader * 0.65;
            if (alpha <= 0) continue;
            ctx.globalAlpha = alpha;
            const radius = star.sizeDeg * visualZoomLevel;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

function drawMap() {
    updateCompassDialVisual();
    // Skip the entire render pipeline while the sky view isn't actually what's
    // on screen — another in-app page is active, or the app is backgrounded.
    // (`pageAttr === undefined` covers the very first call during startup,
    // before the page controller has run yet, so the initial paint is
    // unaffected.) The page controller in index.html already calls drawMap()
    // again the moment the sky page becomes visible/foregrounded, so this
    // fully pauses the loop instead of spending battery/GPU drawing frames
    // nobody can see.
    // Guarded separately from the main render try/catch below: this runs before
    // any of the state some of these checks reference (e.g. touchStartDist) is
    // guaranteed to be initialized, which is only true on the very first call
    // made at file load. If that ever throws, just fall through to a normal
    // full render for that one frame — the loop self-corrects from then on.
    try {
        const pageAttr = document.body.dataset.page;
        if ((pageAttr !== undefined && pageAttr !== 'sky') || document.hidden) return;

        // Timelapse uses a split renderer: the WebGL star field can animate at a
        // high cadence while the CPU-heavy 2D atmospheric/planet/UI layer is
        // intentionally composed at 30 FPS. This prevents the Canvas 2D layer
        // from becoming the bottleneck on 90/120 Hz phones.
        if (timelapseActive) {
            const tlGateNow = performance.now();
            if (timelapseLastCanvasRenderMs >= 0 &&
                (tlGateNow - timelapseLastCanvasRenderMs) < TIMELAPSE_CANVAS_INTERVAL_MS) {
                requestAnimationFrame(drawMap);
                return;
            }
            timelapseLastCanvasRenderMs = tlGateNow;
        }

        // Idle render-rate governor — see IDLE_TARGET_FPS above.
        if (!isActivelyGesturing()) {
            const gateNowMs = performance.now();
            if (lastDrawMapRenderMs >= 0 && (gateNowMs - lastDrawMapRenderMs) < getIdleFrameIntervalMs()) {
                requestAnimationFrame(drawMap);
                return;
            }
            lastDrawMapRenderMs = gateNowMs;
        } else {
            lastDrawMapRenderMs = performance.now();
        }
    } catch (e) { /* first-call TDZ edge case — proceed to render this frame */ }

    try {
    updateProjectionBasis();
    const nowMs = performance.now();

    // Single-source Timelapse clock. The simulation advances at the exact
    // requested rate from a monotonic wall-clock origin, but is sampled only
    // once per rendered frame. This keeps the astronomical motion phase-locked
    // to the actual displayed frames instead of maintaining a second RAF loop.
    if (timelapseActive) {
        updateTimelapseSimulationClock(nowMs);
        timelapseUiAccumulator = nowMs - timelapseStartWallMs;
        if (nowMs - (timelapseLastFrame || timelapseStartWallMs) >= 1000) {
            timelapseLastFrame = nowMs;
            refreshTimeTravelUI();
        }
    }

    astroPositionsFresh = shouldRefreshAstroPositions(nowMs);
    if (astroPositionsFresh) lastAstroUpdateTime = nowMs;
    const w = _projW;
    const h = _projH;
    const cx = w/2;
    const cy = h/2;
    visualZoomLevel += (zoomLevel - visualZoomLevel) * 0.22;
    if (Math.abs(visualZoomLevel - zoomLevel) < 0.001) visualZoomLevel = zoomLevel;
    const r = Math.max(w, h) * 0.85 * zoomLevel;
    const now = getSimTime();
    const renderedLocation = getRenderedObserverLocation();
    const observer = new Astronomy.Observer(renderedLocation.lat, renderedLocation.lon, 0);
    const astroTime = Astronomy.MakeTime(now);

    // WebGL2 handles the star field as a single GPU point draw. The 2D canvas remains
    // responsible for the sky background, Milky Way, DSOs, planets, labels and UI.
    // Follow Device intentionally stays on the normal sky renderer. Only the
    // camera pose changes; the photorealistic/WebGL star treatment is identical
    // to ordinary Sky Map mode, unlike the dedicated Camera AR renderer.
    if (starWebGLEnabled && starWebGLRenderer && !arMode && !timelapseActive) {
        try {
            const gmstForGL = Astronomy.SiderealTime(astroTime);
            const lstForGL = ((gmstForGL * 15 + observer.longitude) % 360 + 360) % 360;
            starWebGLRenderer.draw({
                lstDeg: lstForGL,
                latRad: renderedLocation.lat * Math.PI / 180,
                rotateDeg: rotateOffset,
                panX: 0, panY: 0,
                viewYawDeg: viewYawDeg, viewPitchDeg: viewPitchDeg,
                zoom: zoomLevel,
                visualZoom: visualZoomLevel,
                cssW: w, cssH: h,
                moving: isActivelyGesturing(),
                lodMag: getWebGLStarLodMag(isMobileDeviceCheck(), isActivelyGesturing(), visualZoomLevel),
                starDim: starDimFactor,
                time: nowMs * 0.001,
                photoreal: photorealisticMode
            });
        } catch (e) {
            console.warn('WebGL star draw failed; reverting to Canvas 2D stars.', e);
            starWebGLEnabled = false;
            if (starWebGLCanvas) starWebGLCanvas.classList.remove('webgl-ready');
        }
    }

    if (timelapseActive) {
        const gmstFast = Astronomy.SiderealTime(astroTime);
        _fastHorizonLSTDeg = ((gmstFast * 15 + observer.longitude) % 360 + 360) % 360;
        _fastHorizonLatRad = renderedLocation.lat * Math.PI / 180;
        _fastHorizonSinLat = Math.sin(_fastHorizonLatRad);
        _fastHorizonCosLat = Math.cos(_fastHorizonLatRad);
    }
    
    if (currentSunAnim !== targetSunAnim) {
        const diff = targetSunAnim - currentSunAnim;
        currentSunAnim += diff * 0.06; 
        if (Math.abs(currentSunAnim - targetSunAnim) < 0.001) currentSunAnim = targetSunAnim;
    }

    const actualSunEqu = Astronomy.Equator(Astronomy.Body.Sun, astroTime, observer, true, true);
    const actualSunHor = Astronomy.Horizon(astroTime, observer, actualSunEqu.ra, actualSunEqu.dec, dynamicRefraction);
    const simulatedSunAlt = (actualSunHor.altitude + 20) * currentSunAnim - 20; 

    ctx.clearRect(0, 0, w, h);
    
    if (arMode) {
        if (!cameraActive) {
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, '#020514'); 
            grad.addColorStop(1, '#102542'); 
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
            
            ctx.fillStyle = '#fff';
            const t = Date.now() * 0.001;
            FAINT_STARS_AR.forEach(fs => {
                if (!fs._enuValid) cacheENUFromAltAz(fs, fs.alt, fs.az);
                const p = projectCachedSkyPoint(fs);
                if (p.onScreen && p.z3d > 0.01) {
                    const twinkle = Math.sin(t * 2 + fs.blinkOff) * 0.4 + 0.6;
                    ctx.globalAlpha = fs.br * twinkle;
                    ctx.beginPath(); ctx.arc(p.x, p.y, 0.7, 0, Math.PI * 2); ctx.fill();
                }
            });
            ctx.globalAlpha = 1.0;
        }
    } else {
        ctx.fillStyle = getSkyGradient(ctx, w, h, simulatedSunAlt);
        ctx.fillRect(0, 0, w, h);

        const vig = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.3);
        const nightFactor = Math.max(0.2, Math.min(1, (-simulatedSunAlt + 5) / 15)); 
        vig.addColorStop(0, 'rgba(6,10,18,0)');
        vig.addColorStop(1, `rgba(6,10,18,${0.85 * nightFactor})`);
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);
    }

    drawPhotorealSkyEffects(ctx,w,h,cx,cy,r,simulatedSunAlt,astroTime,observer);

    let starDimFactor;
    if (simulatedSunAlt > 0) {
        starDimFactor = 0.45 - (simulatedSunAlt / 90) * 0.3;
    } else {
        starDimFactor = Math.min(1.0, 0.45 + (-simulatedSunAlt / 15) * 0.55);
    }

    const drawnLabels = [];

    // Ground occlusion (AR only) and the cardinal N/E/S/W markers are always on —
    // they're baseline orientation aids, not an optional overlay, so they're no
    // longer tied to a toggle. The old flat-disk horizon ring is gone; on the real
    // dome the horizon boundary itself is now available as part of the Dome Grid
    // below, drawn accurately instead of as a screen-centred circle.
    if (arMode) {
        const camSinAlt = R_matrix[8]; 
        
        if (camSinAlt > -0.7) {
            if (camSinAlt > 0.9) {
                ctx.fillStyle = cameraActive ? 'rgba(0,0,0,0.7)' : '#010205';
                ctx.fillRect(-w, -h, w*3, h*3);
            } else {
                let centerAz = syntheticAzimuth;
                if (arTrackingActive && smoothAlpha !== null) {
                    centerAz = ((360 - smoothAlpha + 180) % 360 + 360) % 360;
                }

                const horizonPoints = [];
                for(let a = centerAz - 85; a <= centerAz + 85; a += 2) {
                    let az = (a % 360 + 360) % 360;
                    const p = projectAz(0, az);
                    if (p.z3d > 0.01) {
                        horizonPoints.push(p);
                    }
                }

                if (horizonPoints.length > 0) {
                    const focalLength = Math.max(w, h) * 0.85 * arZoomLevel;
                    const gx = -R_matrix[6];
                    const gy = -R_matrix[7];
                    const O = screenOrientation * Math.PI / 180;
                    const downX = gx * Math.cos(O) + gy * Math.sin(O);
                    const downY = -(-gx * Math.sin(O) + gy * Math.cos(O));
                    
                    const mag = Math.sqrt(downX*downX + downY*downY) || 1;
                    const ndx = (downX / mag) * 10000; 
                    const ndy = (downY / mag) * 10000;

                    ctx.fillStyle = cameraActive ? 'rgba(0,0,0,0.7)' : '#010205';
                    ctx.beginPath();
                    ctx.moveTo(horizonPoints[0].x, horizonPoints[0].y);
                    for (let i = 1; i < horizonPoints.length; i++) {
                        ctx.lineTo(horizonPoints[i].x, horizonPoints[i].y);
                    }
                    ctx.lineTo(horizonPoints[horizonPoints.length-1].x + ndx, horizonPoints[horizonPoints.length-1].y + ndy);
                    ctx.lineTo(horizonPoints[0].x + ndx, horizonPoints[0].y + ndy);
                    ctx.fill();
                    
                    ctx.lineWidth = 2.5;
                    ctx.strokeStyle = cameraActive ? 'rgba(201,169,110,0.6)' : 'rgba(100, 150, 255, 0.9)';
                    ctx.beginPath();
                    ctx.moveTo(horizonPoints[0].x, horizonPoints[0].y);
                    for (let i = 1; i < horizonPoints.length; i++) {
                        ctx.lineTo(horizonPoints[i].x, horizonPoints[i].y);
                    }
                    ctx.stroke();
                }
            }
        }

        drawCardinalMarkers(ctx);
    } else {
        drawCardinalMarkers(ctx);
        if (showDomeGrid) drawDomeGrid(ctx);
    }

    if (showGrid) {
        if (arMode) {
            ctx.strokeStyle = `rgba(255,255,255,0.08)`;
            ctx.lineWidth = 0.5;
            for (let az = 0; az < 360; az += 30) {
                ctx.beginPath();
                let first = true;
                for (let alt = 0; alt <= 90; alt += 5) {
                    const p = projectAz(alt, az);
                    if (p.z3d > 0.1) {
                        if (first) { ctx.moveTo(p.x, p.y); first = false; }
                        else { ctx.lineTo(p.x, p.y); }
                    } else { first = true; }
                }
                ctx.stroke();
            }
            for (let alt = 0; alt <= 80; alt += 20) {
                ctx.beginPath();
                let first = true;
                for (let az = 0; az <= 360; az += 5) {
                    const p = projectAz(alt, az);
                    if (p.z3d > 0.1) {
                        if (first) { ctx.moveTo(p.x, p.y); first = false; }
                        else { ctx.lineTo(p.x, p.y); }
                    } else { first = true; }
                }
                ctx.stroke();
            }
        } else {
            ctx.strokeStyle = `rgba(255,255,255,${0.03 * Math.max(0.2, Math.min(1, (-simulatedSunAlt + 5) / 15))})`;
            ctx.lineWidth = 0.5;
            for (let az = 0; az < 360; az += 30) {
                const p0 = projectAz(90, az);
                const p90 = projectAz(0, az);
                ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p90.x, p90.y); ctx.stroke();
            }
            for (let alt = 0; alt <= 80; alt += 20) {
                const f = Math.max(w, h) * 0.425 * visualZoomLevel;
                const theta = (90 - alt) * Math.PI / 180;
                const rr = 2 * f * Math.tan(theta * 0.5);
                ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
            }
        }
    }

    let mwFader = 1.0;
    if (currentBortle <= 3) mwFader = 0.5;       
    else if (currentBortle <= 6) mwFader = 0.2;  
    else mwFader = 0.03;                         
    mwFader *= starDimFactor; 

    if (mwFader > 0.01) {
        if (arMode) {
            // AR keeps its existing path for alignment stability.
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            const pixelPerDeg = Math.max(w, h) * 0.85 * arZoomLevel / 57.3;
            MW_BLOBS.forEach(blob => {
                const hor=getCachedHorizon(blob,blob.raHrs*15,blob.dec,astroTime,observer);
                if(hor.altitude<0)return; const proj=projectCachedSkyPoint(blob); if(!proj.onScreen)return;
                const hf=Math.min(1,Math.max(0,hor.altitude/15)); if(hf<=0)return;
                const br=blob.sizeDeg*pixelPerDeg; ctx.globalAlpha=blob.alpha*hf*mwFader*3.5;
                ctx.drawImage(mwBrush,proj.x-br,proj.y-br,br*2,br*2);
            });
            if (photorealisticMode) drawPhotorealMilkyWay(ctx,astroTime,observer,mwFader,r);
            ctx.restore();
        } else if (isActivelyGesturing()) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            const pixelPerDeg = r / 90;
            for (let i=0;i<MW_BLOBS.length;i+=3) {
                const blob=MW_BLOBS[i]; const hor=getCachedHorizon(blob,blob.raHrs*15,blob.dec,astroTime,observer);
                if(hor.altitude<0)continue; const proj=projectAz(hor.altitude,hor.azimuth); if(!proj.onScreen)continue;
                const hf=Math.min(1,Math.max(0,hor.altitude/15)); const br=blob.sizeDeg*pixelPerDeg*visualZoomLevel;
                ctx.globalAlpha=blob.alpha*hf*mwFader; ctx.drawImage(mwBrush,proj.x-br,proj.y-br,br*2,br*2);
            }
            drawLightweightMilkyWay(ctx,astroTime,observer,mwFader,r,w,h);
            ctx.restore();
        } else {
            // Idle: reuse a cached full-quality photographic MW instead of rebuilding
            // its gradients every frame. The cache refreshes only when the viewport
            // changes or every ~2 seconds for the slow motion of the sky.
            drawCachedIdleMilkyWay(ctx,astroTime,observer,mwFader,r,w,h);
        }
    }

    const planetPositions = [];

    // Real angular-size range for each body (arcseconds, near..far / perigee..apogee),
    // used to let the drawn size actually grow a bit when a body is genuinely closer —
    // sizeFactor is 0 at its most-distant/smallest and 1 at its closest/largest.
    // The drawn size only ever grows FROM the existing baseline size, never shrinks
    // below it, so nothing gets harder to see on a small screen.
    const PLANET_PHYSICAL = {
        Mercury: { radiusKm: 2439.7, minArcsec: 4.5,  maxArcsec: 13.0 },
        Venus:   { radiusKm: 6051.8, minArcsec: 9.7,  maxArcsec: 66.0 },
        Mars:    { radiusKm: 3389.5, minArcsec: 3.5,  maxArcsec: 25.1 },
        Jupiter: { radiusKm: 69911,  minArcsec: 29.8, maxArcsec: 50.1 },
        Saturn:  { radiusKm: 58232,  minArcsec: 14.5, maxArcsec: 20.1 },
        Uranus:  { radiusKm: 25362,  minArcsec: 3.3,  maxArcsec: 4.1 },
        Neptune: { radiusKm: 24622,  minArcsec: 2.2,  maxArcsec: 2.4 }
    };
    const MOON_ANGULAR_RANGE = { minArcsec: 1758, maxArcsec: 2046 }; // apogee..perigee, full disk

    function angularSizeFactor(radiusKm, distAU, minArcsec, maxArcsec) {
        if (!distAU) return 0.5;
        const angDiamArcsec = (2 * radiusKm / (distAU * 149597870.7)) * 206265;
        return Math.max(0, Math.min(1, (angDiamArcsec - minArcsec) / (maxArcsec - minArcsec)));
    }

    if (simulatedSunAlt > -15) { 
        const realSunProj = projectAz(simulatedSunAlt, actualSunHor.azimuth);
        planetPositions.push({
            name: 'Sun', c: '#ffda6b', desc: 'Our Local Star', type: 'star',
            isPlanet: false, isMoon: false, isSun: true,
            alt: actualSunHor.altitude, az: actualSunHor.azimuth, 
            ...realSunProj
        });
    }

    const planetNamesToDraw = [
        {n:'Mercury',s:'☿',c:'#a0a0a0', type:'planet', desc:'Small, fast rocky planet'},
        {n:'Venus',s:'♀',c:'#c9a96e', type:'planet', desc:'Bright morning/evening star'},
        {n:'Mars',s:'♂',c:'#b87070', type:'planet', desc:'The Red Planet'},
        {n:'Jupiter',s:'♃',c:'#b8a070', type:'planet', desc:'Largest gas giant'},
        {n:'Saturn',s:'♄',c:'#a89878', type:'planet', desc:'Ringed gas giant'},
        {n:'Uranus',s:'⛢',c:'#70a8a8', type:'planet', desc:'Ice giant'},
        {n:'Neptune',s:'♆',c:'#7088b8', type:'planet', desc:'Distant ice giant'},
    ];
    
    // Real Galilean moon positions relative to Jupiter — converts Jupiter's own already-precessed
    // RA/Dec into an East/North sky basis, then adds each moon's tiny offset in that basis, so the
    // moons line up correctly along Jupiter's real orbital plane rather than a fixed static row.
    function computeJupiterMoons(astroTime, observer, jupEqu, refraction) {
        const jVec = Astronomy.GeoVector(Astronomy.Body.Jupiter, astroTime, true);
        const jDist = Math.sqrt(jVec.x * jVec.x + jVec.y * jVec.y + jVec.z * jVec.z);
        const jRA = Math.atan2(jVec.y, jVec.x);
        const jDec = Math.asin(jVec.z / jDist);
        const eastX = -Math.sin(jRA), eastY = Math.cos(jRA);
        const northX = -Math.sin(jDec) * Math.cos(jRA), northY = -Math.sin(jDec) * Math.sin(jRA), northZ = Math.cos(jDec);

        const moonData = Astronomy.JupiterMoons(astroTime);
        const defs = [
            { key: 'io', name: 'Io', color: '255,235,180' },
            { key: 'europa', name: 'Europa', color: '235,235,230' },
            { key: 'ganymede', name: 'Ganymede', color: '205,190,165' },
            { key: 'callisto', name: 'Callisto', color: '155,145,135' }
        ];
        const out = [];
        defs.forEach(d => {
            const m = moonData[d.key];
            if (!m) return;
            const deltaEast = m.x * eastX + m.y * eastY;
            const deltaNorth = m.x * northX + m.y * northY + m.z * northZ;
            const angEast = deltaEast / jDist;
            const angNorth = deltaNorth / jDist;
            const deltaRAdeg = (angEast / Math.cos(jDec)) * 180 / Math.PI;
            const deltaDecDeg = angNorth * 180 / Math.PI;
            const moonRAhrs = jupEqu.ra + (deltaRAdeg / 15);
            const moonDec = jupEqu.dec + deltaDecDeg;
            const mHor = Astronomy.Horizon(astroTime, observer, moonRAhrs, moonDec, refraction);
            const mProj = projectAz(mHor.altitude, mHor.azimuth);
            out.push({ name: d.name, color: d.color, alt: mHor.altitude, az: mHor.azimuth, ...mProj });
        });
        return out;
    }

    planetNamesToDraw.forEach(p => {
        try {
            const body = Astronomy.Body[p.n];
            if (!body) return;
            const equ = Astronomy.Equator(body, astroTime, observer, true, true);
            const hor = Astronomy.Horizon(astroTime, observer, equ.ra, equ.dec, dynamicRefraction);
            const proj = projectAz(hor.altitude, hor.azimuth);
            const phys = PLANET_PHYSICAL[p.n];
            const sizeFactor = phys ? angularSizeFactor(phys.radiusKm, equ.dist, phys.minArcsec, phys.maxArcsec) : 0.5;

            let phaseAngle = null, elongVis = null, moons = null;
            if (p.n === 'Mercury' || p.n === 'Venus') {
                try {
                    const illum = Astronomy.Illumination(body, astroTime);
                    if (illum && typeof illum.phase_angle === 'number') phaseAngle = illum.phase_angle;
                    const elong = Astronomy.Elongation(body, astroTime);
                    if (elong && elong.visibility) elongVis = elong.visibility.toLowerCase();
                } catch (e) {}
            } else if (p.n === 'Jupiter') {
                try { moons = computeJupiterMoons(astroTime, observer, equ, dynamicRefraction); } catch (e) {}
            }

            planetPositions.push({ ...p, name: p.n, alt: hor.altitude, az: hor.azimuth, ...proj, isPlanet: true, isMoon: false, sizeFactor, phaseAngle, elongVis, moons, _distanceLy: equ.dist / 63241.077 });
        } catch(e) {}
    });

    try {
        const moonEqu = Astronomy.Equator('Moon', astroTime, observer, true, true);
        const moonHor = Astronomy.Horizon(astroTime, observer, moonEqu.ra, moonEqu.dec, dynamicRefraction);
        const moonProj = projectAz(moonHor.altitude, moonHor.azimuth);
        
        if (moonProj.onScreen && moonHor.altitude >= -5) {
            const moonIllum = Astronomy.Illumination('Moon', astroTime);
            const moonPhaseAngle = ((Astronomy.MoonPhase(astroTime) % 360) + 360) % 360;
            const moonSizeFactor = angularSizeFactor(1737.4, moonEqu.dist, MOON_ANGULAR_RANGE.minArcsec, MOON_ANGULAR_RANGE.maxArcsec);
            
            planetPositions.push({
                name: 'Moon', c: '#f4f4ec', desc: `Phase: ${Math.round(moonIllum.phase_fraction * 100)}% illuminated`, type:'moon',
                isPlanet: false, isMoon: true,
                alt: moonHor.altitude, az: moonHor.azimuth, ...moonProj,
                mp: moonPhaseAngle, phase_frac: moonIllum.phase_fraction, sizeFactor: moonSizeFactor, _distanceLy: moonEqu.dist / 63241.077
            });
        }
    } catch(e) {}

    lastPlanetPositions = planetPositions;

    const dsoPositions = dsoRenderPositions;
    for (let i = 0; i < DSO_OBJECTS.length; i++) {
        const src = DSO_OBJECTS[i];
        const dst = dsoPositions[i];
        const hor = getCachedHorizon(src, src.ra, src.dec, astroTime, observer);
        const proj = arMode ? projectCachedSkyPoint(src) : projectAz(hor.altitude, hor.azimuth);
        dst.alt = hor.altitude; dst.az = hor.azimuth;
        dst.x = proj.x; dst.y = proj.y; dst.onScreen = proj.onScreen; dst.z3d = proj.z3d;
        dst.isDso = true;
    }

    // Run the fast math FIRST so the coordinates are ready in memory

    if (!isActivelyGesturing()) {
        // Hit-testing is disabled while dragging/pinching, so allocating a fresh
        // catalogue-sized array every gesture frame only creates GC pressure.
        lastStarPositions.length = 0;
        for (let i = 0; i < ALL_STARS.length; i++) lastStarPositions.push(ALL_STARS[i]);
        for (let i = 0; i < dsoPositions.length; i++) lastStarPositions.push(dsoPositions[i]);
    }

    dsoPositions.forEach(obj => {
        if (!obj.onScreen || obj.alt < 0.0) return;
        const horizonFade = obj.alt < 10 ? Math.max(0, obj.alt / 10) : 1;
        if (horizonFade <= 0) return;
        const zoomVal = arMode ? arZoomLevel : visualZoomLevel;
        const size = Math.max(4, obj.sizeDeg * zoomVal * 3);

        let dsoAlpha = Math.min(0.6, Math.max(0.15, (8 - obj.mag) / 8));
        if (arMode) dsoAlpha = Math.min(1.0, dsoAlpha * 2.5);
        const alpha = dsoAlpha * horizonFade * (arMode ? 1.0 : starDimFactor) * atmosphericExtinction(obj.alt);
        const vis = obj._vis;

        // Only render fine eyepiece-style detail once the object is big enough on
        // screen for it to read as structure rather than noise — cheap at low zoom
        // (falls back to a simple soft glow, same cost as before), detailed once zoomed in.
        const detailed = vis && size > 7;

        if (obj.type === 'galaxy') {
            const coreColor = vis ? vis.coreHue : '255,220,180';
            const armColor = vis ? vis.armHue : '150,180,255';
            if (detailed) {
                ctx.save();
                ctx.translate(obj.x, obj.y);
                ctx.rotate(vis.posAngle * Math.PI / 180);
                ctx.scale(1, Math.max(0.18, vis.axisRatio));
                const g = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
                g.addColorStop(0, `rgba(${coreColor},${Math.min(1, alpha * 1.5)})`);
                g.addColorStop(0.22, `rgba(${coreColor},${alpha * 0.85})`);
                g.addColorStop(0.5, `rgba(${armColor},${alpha * 0.5})`);
                g.addColorStop(1, `rgba(${armColor},0)`);
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();
                // bright white-hot nucleus
                ctx.fillStyle = `rgba(255,255,250,${Math.min(0.95, alpha * 1.3)})`;
                ctx.beginPath(); ctx.arc(0, 0, Math.max(1, size * 0.1), 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            } else {
                const g = ctx.createRadialGradient(obj.x, obj.y, 0, obj.x, obj.y, size);
                g.addColorStop(0, `rgba(${coreColor},${alpha * 0.85})`);
                g.addColorStop(0.5, `rgba(${armColor},${alpha * 0.4})`);
                g.addColorStop(1, `rgba(${armColor},0)`);
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(obj.x, obj.y, size, 0, Math.PI * 2); ctx.fill();
            }
        } else if (obj.type === 'nebula') {
            const color = vis ? vis.hue : '255,110,120';
            if (detailed) {
                vis.blobs.forEach(b => {
                    const bx = obj.x + b.dx * size;
                    const by = obj.y + b.dy * size;
                    const br = size * b.rScale;
                    const ba = Math.min(1, alpha * b.aScale * 1.6);
                    const bc = shiftHue(color, b.hueShift || 0);
                    const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
                    g.addColorStop(0, `rgba(${bc},${Math.min(1, ba * 1.1)})`);
                    g.addColorStop(0.5, `rgba(${bc},${ba * 0.55})`);
                    g.addColorStop(1, `rgba(${bc},0)`);
                    ctx.fillStyle = g;
                    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
                });
                if (vis.planetary) {
                    // small glowing ring shell, the classic look of a planetary nebula in astrophotos
                    ctx.strokeStyle = `rgba(${color},${Math.min(1, alpha * 1.6)})`;
                    ctx.lineWidth = Math.max(1, size * 0.18);
                    ctx.beginPath(); ctx.arc(obj.x, obj.y, size * 0.55, 0, Math.PI * 2); ctx.stroke();
                }
            } else {
                const g = ctx.createRadialGradient(obj.x, obj.y, 0, obj.x, obj.y, size);
                g.addColorStop(0, `rgba(${color},${Math.min(1, alpha * 1.1)})`);
                g.addColorStop(0.5, `rgba(${color},${alpha * 0.45})`);
                g.addColorStop(1, `rgba(${color},0)`);
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(obj.x, obj.y, size, 0, Math.PI * 2); ctx.fill();
            }
        } else {
            // clusters — individual member stars keep their real colors (white/blue/gold)
            const color = '220,220,225';
            if (detailed) {
                if (vis.globular) {
                    const g = ctx.createRadialGradient(obj.x, obj.y, 0, obj.x, obj.y, size);
                    g.addColorStop(0, `rgba(255,250,235,${Math.min(1, alpha * 1.3)})`);
                    g.addColorStop(0.35, `rgba(${color},${alpha * 0.6})`);
                    g.addColorStop(1, `rgba(${color},0)`);
                    ctx.fillStyle = g;
                    ctx.beginPath(); ctx.arc(obj.x, obj.y, size, 0, Math.PI * 2); ctx.fill();
                }
                vis.dots.forEach(d => {
                    const dxp = obj.x + d.dx * size;
                    const dyp = obj.y + d.dy * size;
                    const dr = Math.max(0.5, size * 0.09 * d.sizeRel);
                    ctx.fillStyle = `rgba(${d.hue},${Math.min(1, alpha * 1.4 * d.briRel)})`;
                    ctx.beginPath(); ctx.arc(dxp, dyp, dr, 0, Math.PI * 2); ctx.fill();
                });
                ctx.globalAlpha = 1;
            } else {
                const g = ctx.createRadialGradient(obj.x, obj.y, 0, obj.x, obj.y, size);
                g.addColorStop(0, `rgba(${color},${alpha * 0.7})`);
                g.addColorStop(0.5, `rgba(${color},${alpha * 0.3})`);
                g.addColorStop(1, `rgba(${color},0)`);
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(obj.x, obj.y, size, 0, Math.PI * 2); ctx.fill();
            }
        }
    });

    // --- HIGH PRECISION: STAR GLOW OVERHAUL ---
    // Rendering layers above (Milky Way / DSO / grid) may use additive blending
    // or a reduced globalAlpha. Reset the 2D context before drawing astronomical
    // point sources so the catalog objects can never become invisible because of
    // leaked canvas state.
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    renderOptimizedStars(ctx, astroTime, observer, starDimFactor, w, h);

    // Draw constellation lines only after the current frame's star positions have
    // been calculated. Drawing them before renderOptimizedStars() can reuse stale
    // x/y coordinates from a previous frame and create long, spurious lines.
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (showConstellations) {
        let constAlpha = arMode ? 0.45 : (0.12 * starDimFactor);
        ctx.strokeStyle = `rgba(201,169,110,${constAlpha})`;
        ctx.lineWidth = arMode ? 1.5 : 0.8;
        CONSTELLATION_LINES.forEach(([n1, n2]) => {
            const s1 = STAR_NAME_INDEX.get(n1);
            const s2 = STAR_NAME_INDEX.get(n2);
            if (!s1 || !s2) return;
            if (
                s1.alt >= 0.0 && s2.alt >= 0.0 &&
                s1.onScreen && s2.onScreen &&
                Number.isFinite(s1.x) && Number.isFinite(s1.y) &&
                Number.isFinite(s2.x) && Number.isFinite(s2.y) &&
                (!arMode || (s1.z3d > 0.01 && s2.z3d > 0.01))
            ) {
                ctx.beginPath();
                ctx.moveTo(s1.x, s1.y);
                ctx.lineTo(s2.x, s2.y);
                ctx.stroke();
            }
        });
    }

    planetPositions.forEach(p => {
        if (!p.onScreen || p.alt < 0.0 || p.isSun) return; 
        const horizonFade = p.alt < 10 ? Math.max(0, p.alt / 10) : 1;
        if (horizonFade <= 0) return;

        ctx.save();
        ctx.translate(p.x, p.y);

        if (p.isMoon) {
            const baseSize = 9 * (arMode ? arZoomLevel : visualZoomLevel) * (1 + (p.sizeFactor || 0) * 0.13); 
            const glowFactor = Math.max(0.2, 1 - (currentBortle / 9)); 
            let glowRadius = baseSize * 4.5;
            let glowAlpha = 0.45 * glowFactor * horizonFade * p.phase_frac * starDimFactor;
            
            if (arMode) {
                glowRadius *= 1.5;
                glowAlpha = Math.min(1.0, glowAlpha * 2.0);
            }
            
            if (glowAlpha > 0.01) {
                const g = ctx.createRadialGradient(0,0, baseSize, 0,0, glowRadius);
                g.addColorStop(0, `rgba(255,255,245,${glowAlpha})`);
                g.addColorStop(1, 'rgba(255,255,245,0)');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(0,0, glowRadius, 0, Math.PI*2); ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(0, 0, baseSize, 0, Math.PI*2);
            ctx.clip(); 

            ctx.fillStyle = `rgba(244,244,236,${Math.max(0.7, starDimFactor)})`; 
            ctx.fillRect(-baseSize, -baseSize, baseSize*2, baseSize*2);

            // Maria — the dark "seas" visible on the near side, roughly placed to match the real Moon
            ctx.fillStyle = `rgba(120,128,140,${0.28 * Math.max(0.7, starDimFactor)})`;
            [
                { x: -0.32, y: -0.38, rx: 0.30, ry: 0.24 }, // Mare Imbrium
                { x: 0.05,  y: -0.15, rx: 0.20, ry: 0.24 }, // Mare Serenitatis
                { x: 0.12,  y: 0.10,  rx: 0.22, ry: 0.16 }, // Mare Tranquillitatis
                { x: -0.45, y: 0.12,  rx: 0.32, ry: 0.34 }, // Oceanus Procellarum
                { x: 0.45,  y: -0.30, rx: 0.12, ry: 0.12 }, // Mare Crisium
                { x: -0.05, y: 0.42,  rx: 0.18, ry: 0.14 }  // Mare Nubium
            ].forEach(m => {
                ctx.beginPath();
                ctx.ellipse(m.x * baseSize, m.y * baseSize, m.rx * baseSize, m.ry * baseSize, 0, 0, Math.PI * 2);
                ctx.fill();
            });

            // Subtle crater texture: deterministic and restrained, so the Moon reads as
            // a real surface rather than a flat icon while retaining phase accuracy.
            ctx.save();
            for (let ci = 0; ci < 26; ci++) {
                const seed = Math.sin((ci + 1) * 91.731 + p.mp * 0.013) * 43758.5453;
                const u = seed - Math.floor(seed);
                const seed2 = Math.sin((ci + 1) * 47.219 + p.mp * 0.021) * 43758.5453;
                const v = seed2 - Math.floor(seed2);
                const cxr = (u * 1.7 - 0.85) * baseSize;
                const cyr = (v * 1.7 - 0.85) * baseSize;
                const rr = (0.018 + (ci % 5) * 0.009) * baseSize;
                ctx.fillStyle = `rgba(70,78,92,${0.05 + (ci%4)*0.012})`;
                ctx.beginPath(); ctx.arc(cxr,cyr,rr,0,Math.PI*2); ctx.fill();
                ctx.strokeStyle = `rgba(255,255,255,${0.025 + (ci%3)*0.008})`;
                ctx.lineWidth = Math.max(0.25, rr*0.12);
                ctx.stroke();
            }
            ctx.restore();

            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0,0,0,1)';
            
            ctx.beginPath();
            if (p.mp < 180) {
                ctx.rect(-baseSize, -baseSize, baseSize, baseSize*2);
                ctx.fill();
                const w = Math.cos(p.mp * Math.PI / 180) * baseSize;
                ctx.beginPath();
                ctx.ellipse(0, 0, Math.abs(w), baseSize, 0, 0, Math.PI*2);
                if (p.mp < 90) ctx.fill(); else { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(244,244,236,${Math.max(0.7, starDimFactor)})`; ctx.fill(); }
            } else {
                ctx.rect(0, -baseSize, baseSize, baseSize*2);
                ctx.fill();
                const w = Math.cos(p.mp * Math.PI / 180) * baseSize;
                ctx.beginPath();
                ctx.ellipse(0, 0, Math.abs(w), baseSize, 0, 0, Math.PI*2);
                if (p.mp >= 270) ctx.fill(); else { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(244,244,236,${Math.max(0.7, starDimFactor)})`; ctx.fill(); }
            }

            ctx.restore();
            const fontStr = arMode ? '500 15px "Space Grotesk", sans-serif' : '500 10px "Space Grotesk", sans-serif';
            drawSmartLabel(ctx, p.name, p.x, p.y, `rgba(255, 255, 255, ${arMode ? 1.0 : 0.85 * horizonFade})`, fontStr, drawnLabels, true);
            return;
        }

        const t = Date.now() * 0.001;
        const pNoise = Math.sin(t * 1.5 + p.az) * Math.cos(t * 2.3 + p.alt);
        const shimmer = 1.0 + (pNoise * 0.015);
        
        let baseSize = 3.5; let glowMult = 4; let glowAlpha = 0.15; let brightness = 0.9; 
        if (p.name === 'Venus') { baseSize = 7.0; glowMult = 6.0; glowAlpha = 0.25; brightness = 1.0; } 
        else if (p.name === 'Jupiter') { baseSize = 6.0; glowMult = 4.0; glowAlpha = 0.20; brightness = 1.0; } 
        else if (p.name === 'Mars' || p.name === 'Saturn') { baseSize = 4.5; glowMult = 3.0; glowAlpha = 0.12; brightness = 0.95; }

        // Grow (never shrink) from that floor size based on how close the planet truly is right now —
        // e.g. Mars near opposition or Venus near inferior conjunction visibly swells on screen.
        baseSize *= (1 + (p.sizeFactor || 0) * 0.6);

        if (arMode) {
            baseSize *= 1.3 * arZoomLevel;
            glowMult *= 1.5; 
            glowAlpha = Math.min(0.25, glowAlpha * 1.5); 
        }

        const alphaFade = brightness * horizonFade * (arMode ? 1.0 : starDimFactor);

        // Saturn's real ring tilt (from ephemeris), used both behind and in front of the globe.
        let saturnTilt = 26, ringOuter = 0, ringInner = 0, ringSquash = 1;
        if (p.name === 'Saturn') {
            try {
                const sIllum = Astronomy.Illumination(Astronomy.Body.Saturn, astroTime);
                if (sIllum && typeof sIllum.ring_tilt === 'number') saturnTilt = sIllum.ring_tilt;
            } catch (e) {}
            ringOuter = baseSize * 2.3;
            ringInner = baseSize * 1.55;
            ringSquash = Math.max(0.08, Math.sin(Math.abs(saturnTilt) * Math.PI / 180) * 0.9 + 0.08);
        }

        if (alphaFade > 0.01) {
            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, baseSize * glowMult);
            g.addColorStop(0, `rgba(255,255,255,${glowAlpha * alphaFade})`);
            g.addColorStop(0.3, `rgba(255,255,255,${glowAlpha * alphaFade * 0.5})`);
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(0, 0, baseSize * glowMult, 0, Math.PI * 2); ctx.fill();
        }

        if (p.name === 'Saturn') {
            // Back half of the ring plane, drawn before the globe so it appears to pass behind it.
            ctx.save();
            ctx.rotate(-8 * Math.PI / 180);
            ctx.strokeStyle = `rgba(210, 195, 160, ${0.5 * alphaFade})`;
            ctx.lineWidth = Math.max(0.6, (ringOuter - ringInner) * 0.5);
            ctx.beginPath();
            ctx.ellipse(0, 0, ringOuter, ringOuter * ringSquash, 0, Math.PI * 1.02, Math.PI * 1.98);
            ctx.stroke();
            ctx.restore();
        }

        ctx.fillStyle = p.c;
        ctx.globalAlpha = alphaFade * shimmer;
        ctx.beginPath(); ctx.arc(0, 0, baseSize, 0, Math.PI * 2); ctx.fill();

        ctx.globalAlpha = alphaFade; 
        if (p.name === 'Saturn') {
            ctx.save();
            ctx.rotate(-8 * Math.PI / 180);
            ctx.strokeStyle = `rgba(225, 212, 178, ${0.85 * alphaFade})`;
            ctx.lineWidth = Math.max(0.7, (ringOuter - ringInner) * 0.55);
            ctx.beginPath();
            ctx.ellipse(0, 0, ringOuter, ringOuter * ringSquash, 0, -Math.PI * 0.02, Math.PI * 1.02);
            ctx.stroke();
            // Cassini division — the faint dark gap that splits the rings visually
            ctx.strokeStyle = `rgba(20, 18, 14, ${0.35 * alphaFade})`;
            ctx.lineWidth = Math.max(0.5, ringOuter * 0.06);
            ctx.beginPath();
            ctx.ellipse(0, 0, ringOuter * 0.85, ringOuter * 0.85 * ringSquash, 0, -Math.PI * 0.02, Math.PI * 1.02);
            ctx.stroke();
            ctx.restore();
        } else if (p.name === 'Jupiter') {
            ctx.save();
            ctx.beginPath(); ctx.arc(0, 0, baseSize, 0, Math.PI * 2); ctx.clip();
            const bands = [
                { cy: -0.75, h: 0.30, c: `rgba(210,190,150,${0.30 * alphaFade})` },
                { cy: -0.38, h: 0.24, c: `rgba(160,120,85,${0.42 * alphaFade})` },
                { cy: -0.02, h: 0.32, c: `rgba(225,205,170,${0.26 * alphaFade})` },
                { cy: 0.36,  h: 0.26, c: `rgba(150,110,80,${0.40 * alphaFade})` },
                { cy: 0.76,  h: 0.28, c: `rgba(200,180,145,${0.28 * alphaFade})` }
            ];
            bands.forEach(b => {
                ctx.fillStyle = b.c;
                ctx.fillRect(-baseSize, b.cy * baseSize - (b.h * baseSize) / 2, baseSize * 2, b.h * baseSize);
            });
            if (baseSize > 5) {
                // Great Red Spot — only resolves once the disc is big enough to matter
                ctx.fillStyle = `rgba(190,110,80,${0.5 * alphaFade})`;
                ctx.beginPath(); ctx.ellipse(baseSize * 0.35, baseSize * 0.28, baseSize * 0.22, baseSize * 0.13, 0, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
            // The four Galilean moons — tiny, real, individually-positioned points once zoomed in enough to matter
            if (p.moons && baseSize > 5) {
                p.moons.forEach(m => {
                    if (!m.onScreen) return;
                    const lx = m.x - p.x, ly = m.y - p.y;
                    ctx.fillStyle = `rgba(${m.color},${Math.min(1, alphaFade * 1.3)})`;
                    ctx.beginPath(); ctx.arc(lx, ly, Math.max(1, baseSize * 0.11), 0, Math.PI * 2); ctx.fill();
                });
            }
        } else if (p.name === 'Mars') {
            ctx.save();
            ctx.beginPath(); ctx.arc(0, 0, baseSize, 0, Math.PI * 2); ctx.clip();
            ctx.fillStyle = `rgba(120, 60, 40, ${0.3 * alphaFade})`;
            ctx.beginPath(); ctx.ellipse(-baseSize * 0.2, baseSize * 0.15, baseSize * 0.55, baseSize * 0.4, 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = `rgba(255, 255, 255, ${0.55 * alphaFade})`;
            ctx.beginPath(); ctx.arc(0, -baseSize * 0.72, baseSize * 0.42, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else if (p.name === 'Venus' || p.name === 'Mercury') {
            // Real phase crescent: phase_angle 0° = fully lit (far side of the Sun), 180° = new (unlit side facing us).
            // Reuses the same terminator-ellipse technique as the Moon, oriented by which side of the
            // Sun the planet currently sits on (morning apparition = lit limb one way, evening = the other).
            const litFraction = p.phaseAngle !== null && p.phaseAngle !== undefined
                ? Math.max(0.03, Math.min(1, (1 + Math.cos(p.phaseAngle * Math.PI / 180)) / 2))
                : 1;
            const shadowW = Math.cos((1 - litFraction) * Math.PI) * baseSize;
            const litOnRight = p.elongVis === 'morning';
            ctx.save();
            ctx.beginPath(); ctx.arc(0, 0, baseSize, 0, Math.PI * 2); ctx.clip();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0,0,0,1)';
            ctx.beginPath();
            if (litOnRight) ctx.rect(-baseSize, -baseSize, baseSize, baseSize * 2);
            else ctx.rect(0, -baseSize, baseSize, baseSize * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(0, 0, Math.abs(shadowW), baseSize, 0, 0, Math.PI * 2);
            if (shadowW > 0) {
                ctx.fill(); // crescent: erode further into the lit half
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = p.c;
                ctx.fill(); // gibbous: repaint part of the erased half back
            }
            ctx.restore();
        } else if (p.name === 'Uranus' || p.name === 'Neptune') {
            ctx.save();
            ctx.beginPath(); ctx.arc(0, 0, baseSize, 0, Math.PI * 2); ctx.clip();
            const g2 = ctx.createRadialGradient(-baseSize * 0.3, -baseSize * 0.3, 0, 0, 0, baseSize);
            g2.addColorStop(0, `rgba(255,255,255,${0.35 * alphaFade})`);
            g2.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g2;
            ctx.fillRect(-baseSize, -baseSize, baseSize * 2, baseSize * 2);
            ctx.restore();
        }

        ctx.restore();
        
        const fontStr = arMode ? '500 15px "Space Grotesk", sans-serif' : '500 9px "Space Grotesk", sans-serif';
        if (alphaFade > 0.05) {
            drawSmartLabel(ctx, p.name, p.x, p.y, `rgba(255, 255, 255, ${arMode ? 1.0 : 0.7 * horizonFade})`, fontStr, drawnLabels, true);
        }
    });

    if (simulatedSunAlt > -15) {
        const sunProj = projectAz(simulatedSunAlt, actualSunHor.azimuth);
        if (sunProj.onScreen || simulatedSunAlt > -5) { 
            const glowFade = Math.max(0, Math.min(1, (simulatedSunAlt + 15) / 20)) * currentSunAnim;
            const sr = 12 * (arMode ? arZoomLevel : visualZoomLevel); 
            
            function getSunColor(alt) {
                if (alt > 20) return { r:255, g:250, b:240 }; 
                if (alt > 5) return { r:255, g:230, b:180 };  
                if (alt > -5) return { r:255, g:160, b:80 };  
                return { r:220, g:90, b:50 };                 
            }
            const sCol = getSunColor(simulatedSunAlt);
            
            ctx.save();
            ctx.translate(sunProj.x, sunProj.y);
            ctx.rotate(Date.now() * 0.0001); 
            ctx.fillStyle = `rgba(${sCol.r}, ${sCol.g}, ${sCol.b}, ${0.08 * glowFade})`;
            for(let i=0; i<8; i++) {
                ctx.beginPath();
                ctx.moveTo(-sr*0.4, 0); ctx.lineTo(sr*0.4, 0); ctx.lineTo(0, sr * 6); ctx.fill();
                ctx.rotate(Math.PI / 4);
            }
            ctx.restore();

            const radGrad = ctx.createRadialGradient(sunProj.x, sunProj.y, sr, sunProj.x, sunProj.y, sr * 10);
            radGrad.addColorStop(0, `rgba(${sCol.r}, ${sCol.g}, ${sCol.b}, ${1 * glowFade})`);
            radGrad.addColorStop(0.3, `rgba(${sCol.r}, ${sCol.g}, ${sCol.b}, ${0.4 * glowFade})`);
            radGrad.addColorStop(1, `rgba(${sCol.r}, ${sCol.g}, ${sCol.b}, 0)`);
            ctx.fillStyle = radGrad;
            ctx.beginPath(); ctx.arc(sunProj.x, sunProj.y, sr * 10, 0, Math.PI*2); ctx.fill();
            
            if (simulatedSunAlt > -2) {
                ctx.fillStyle = `rgba(255, 255, 255, ${glowFade})`;
                ctx.beginPath(); ctx.arc(sunProj.x, sunProj.y, sr, 0, Math.PI*2); ctx.fill();
            }
        }
    }

    // --- UPDATED LABELING LOGIC: STAR PRIORITY + IMPROVED READABILITY ---
    // --- UPDATED LABELING LOGIC: STAR PRIORITY + IMPROVED READABILITY ---
    if (starDimFactor > 0.1) {
        // 1. Stars get first dibs on screen space
        const starLimit = arMode ? 60 : 12; 
        const labeledStars = [];
        for (let i = 0; i < NAMED_STARS_BY_MAG.length && labeledStars.length < starLimit; i++) {
            const s = NAMED_STARS_BY_MAG[i];
            if (s.onScreen && s.alt >= 0.0) labeledStars.push(s);
        }
        
        labeledStars.forEach((star) => {
            const horizonFade = star.alt < 10 ? Math.max(0, star.alt / 10) : 1;
            const fontStr = arMode ? '700 13px "Space Grotesk", sans-serif' : '700 10px "Space Grotesk", sans-serif';
            drawSmartLabel(ctx, star.name, star.x, star.y, `rgba(255,255,255,${arMode ? 1.0 : 0.8 * horizonFade * starDimFactor})`, fontStr, drawnLabels, false); 
        });

        // 2. DSOs get second priority, respecting the space stars already claimed
        const currentZoom = arMode ? arZoomLevel : zoomLevel;
        // DSOs reveal based on zoom; smaller/fainter ones wait for higher zoom
        const dynamicMagLimit = 3.5 + (currentZoom - 1.0) * 2.5; 

        dsoPositions
            .filter(d => d.onScreen && d.alt > 10 && d.mag <= dynamicMagLimit)
            .sort((a, b) => a.mag - b.mag)
            .forEach(d => {
                const horizonFade = d.alt < 10 ? Math.max(0, d.alt / 10) : 1;
                // INCREASED font size and added 'italic' for distinction
                const fontStr = arMode ? 'italic 700 13px "Space Grotesk", sans-serif' : 'italic 700 10px "Space Grotesk", sans-serif';
                drawSmartLabel(ctx, d.name, d.x, d.y, `rgba(201,169,110,${arMode ? 1.0 : 0.8 * horizonFade * starDimFactor})`, fontStr, drawnLabels, false);
            });
    }

    // --- HIGH PRECISION: LIVE TELESCOPE CROSSHAIR RENDERING ---
    if (telescopeRA !== null && telescopeDec !== null) {
        const telHor = Astronomy.Horizon(astroTime, observer, telescopeRA / 15, telescopeDec, dynamicRefraction);
        const telProj = projectAz(telHor.altitude, telHor.azimuth);
        
        if (telProj.onScreen && telProj.z3d > 0) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 0, 122, 0.9)'; 
            ctx.lineWidth = 2 * (arMode ? 1.5 : 1);
            ctx.translate(telProj.x, telProj.y);
            
            const rOuter = 20 * (arMode ? 1.5 : visualZoomLevel);
            const rInner = 8 * (arMode ? 1.5 : visualZoomLevel);
            const lineLen = 12 * (arMode ? 1.5 : visualZoomLevel);

            ctx.beginPath();
            ctx.arc(0, 0, rOuter, 0, Math.PI * 2);
            ctx.moveTo(-rOuter - lineLen, 0); ctx.lineTo(-rInner, 0);
            ctx.moveTo(rOuter + lineLen, 0); ctx.lineTo(rInner, 0);
            ctx.moveTo(0, -rOuter - lineLen); ctx.lineTo(0, -rInner);
            ctx.moveTo(0, rOuter + lineLen); ctx.lineTo(0, rInner);
            ctx.stroke();
            
            ctx.fillStyle = '#ff007a';
            ctx.font = arMode ? '600 16px "Space Grotesk", sans-serif' : '600 11px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('TELESCOPE', 0, -rOuter - lineLen - 6);
            ctx.restore();
        }
    }

    if (actualSunHor.altitude > 0 && currentSunAnim > 0.5 && !sunForcedOff && !arMode) {
        ctx.fillStyle = `rgba(255, 255, 255, ${currentSunAnim * 0.85})`;
        ctx.font = '500 13px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("Turn off the Sun to see heavenly bodies", w/2, 35);
        ctx.textAlign = 'left';
    }

    } catch (e) {
        console.error('Star map error:', e);
        ctx.fillStyle = '#05060a';
        ctx.fillRect(0, 0, canvas.width / Math.min(window.devicePixelRatio, 2), canvas.height / Math.min(window.devicePixelRatio, 2));
        ctx.fillStyle = '#ff4b4b';
        ctx.font = '500 14px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Star map unavailable', canvas.width / Math.min(window.devicePixelRatio, 2) / 2, canvas.height / Math.min(window.devicePixelRatio, 2) / 2);
    }
    // --- 3D COMPASS ---
    // The compass is a miniature of the same celestial camera. It follows manual
    // hemisphere interaction and device-follow orientation without changing the
    // sky renderer itself.
    updateCompassDialVisual();
    requestAnimationFrame(drawMap);
}
// Size the canvas synchronously before the first paint so its intrinsic backing
// resolution is correct from frame one.
resizeCanvas();
const skyCompassButton = document.getElementById('skyCompass');
if (skyCompassButton) {
    skyCompassButton.addEventListener('click', toggleCompassAlignment);
    setTimeout(() => { syncSkyToolStates(); showCompassHintOnce(); }, 500);
}
drawMap();

function checkTooltip(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    let closest = null;
    let closestDist = 15; 

    let allObjs = [...lastStarPositions];
    if (typeof lastPlanetPositions !== 'undefined') allObjs = allObjs.concat(lastPlanetPositions);

    for (const obj of allObjs) {
        if (!obj.onScreen || obj.alt < 0) continue;
        const dx = mx - obj.x;
        const dy = my - obj.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < closestDist) { closestDist = dist; closest = obj; }
    }

    if (closest) {
        hoveredStar = closest;
        lastInspectedObject = closest;
        updateLogLastViewedPreview();
        
        // Provide a fallback for unnamed catalog stars
        ttName.textContent = closest.name || 'Unnamed Star';

        // Provide a fallback for descriptions
        let info = closest.desc || 'Faint star';
        if (closest.mag !== undefined) info += ' · Mag ' + closest.mag.toFixed(2);

        const visCat = getVisibilityCategory(closest.alt);
        let badgeText;
        let textColor;

        if (closest.isSun) {
            badgeText = 'star';
            textColor = closest.c;
        } else if (closest.isMoon) {
            badgeText = 'moon';
            textColor = closest.c;
        } else if (closest.isPlanet) {
            info += ' · Planet';
            badgeText = 'planet';
            textColor = closest.c; 
        } else if (closest.isDso) {
            const distStr = formatDistance(closest.dist);
            if (distStr) info += ' · ' + distStr;
            badgeText = closest.type || 'DSO';
            textColor = '#00f0ff'; 
        } else {
            const distStr = formatDistance(closest.dist);
            if (distStr) info += ' · ' + distStr;
            if (closest.const) info += ' · ' + getConstellationFull(closest.const);
            badgeText = getDescriptiveStellarType(closest.name, closest.temp) || 'star';
            textColor = getStarColorHex(closest.temp);
        }

        info += ' · ' + closest.alt.toFixed(2) + '° alt';
        info += ' · ' + visCat.label;
        info += ' · Press and hold for Voyager Mode';
        ttInfo.textContent = info;

        ttType.textContent = badgeText;
        ttType.style.display = 'inline-block';
        ttType.style.background = visCat.color + '20';  
        ttType.style.color = textColor;  
        ttType.style.border = '1px solid ' + visCat.color + '40';  

        const ttRect = tooltip.getBoundingClientRect();
        let left = clientX + 14;
        let top = clientY - 14;
        if (left + ttRect.width > window.innerWidth - 8) left = clientX - ttRect.width - 14;
        if (top + ttRect.height > window.innerHeight - 8) top = clientY - ttRect.height - 14;
        if (left < 8) left = 8;
        if (top < 8) top = 8;
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        tooltip.classList.add('visible');
        
        if (!isInteracting) {
            canvas.classList.add('hovering-star');
        }
    } else {
        hoveredStar = null;
        tooltip.classList.remove('visible');
        if (!isInteracting) {
            canvas.classList.remove('hovering-star');
        }
    }
}

window.addEventListener('mousemove', e => {
    if (desktopLongPressTimer && Math.hypot(e.clientX - desktopLongPressStartX, e.clientY - desktopLongPressStartY) > 8) {
        cancelDesktopLongPress();
    }
    if (!isInteracting) return;
    if (arMode) {
        if (arTrackingActive) {
            freezeARTrackingForManualGesture();
            interactStartX = e.clientX;
            interactStartY = e.clientY;
        }
        const dx = e.clientX - interactStartX;
        const dy = e.clientY - interactStartY;
        interactStartX = e.clientX;
        interactStartY = e.clientY;
        
        syntheticAzimuth = (syntheticAzimuth - dx * 0.15 + 360) % 360;
        syntheticAltitude = Math.max(-90, Math.min(90, syntheticAltitude + dy * 0.20));
        updateRMatrixFromSynthetic();
    } else if (rotateMode) {
        const dx = e.clientX - interactStartX;
        rotateOffset = interactStartRotate + dx * 0.5 * getDragZoomScale();
    } else {
        const dx = e.clientX - interactStartX;
        const dy = e.clientY - interactStartY;
        if (CELESTIAL_3D_MODE) {
            const dragScale = getDragZoomScale();
            viewYawDeg = (interactStartViewYaw - dx * 0.32 * dragScale + 540) % 360 - 180;
            viewPitchDeg = Math.max(-80, Math.min(80, interactStartViewPitch + dy * 0.24 * dragScale));
            panX = 0; panY = 0;
            updateCompassDialVisual();
        } else {
            panX = interactStartPanX + dx; panY = interactStartPanY + dy;
            constrainPan();
        }
    }
});

canvas.addEventListener('mousemove', e => {
    if (!isInteracting) checkTooltip(e.clientX, e.clientY);
});

canvas.addEventListener('mouseleave', () => { 
    tooltip.classList.remove('visible'); 
    hoveredStar = null; 
    canvas.classList.remove('hovering-star'); 
});

let desktopLongPressTimer = null;
let desktopLongPressTarget = null;
let desktopLongPressStartX = 0;
let desktopLongPressStartY = 0;
const LONG_PRESS_MS = 720;

function cancelDesktopLongPress() {
    clearTimeout(desktopLongPressTimer);
    desktopLongPressTimer = null;
    desktopLongPressTarget = null;
    canvas.classList.remove('cosmic-hold');
}

canvas.addEventListener('mousedown', e => {
    if (timelapseActive) { showTimelapseBlockMessage(); return; }
    isInteracting = true;
    interactStartX = e.clientX; interactStartY = e.clientY;

    if (!arMode && e.button === 0) {
        desktopLongPressTarget = getJourneyObjectAt(e.clientX, e.clientY);
        desktopLongPressStartX = e.clientX;
        desktopLongPressStartY = e.clientY;
        if (desktopLongPressTarget) {
            canvas.classList.add('cosmic-hold');
            desktopLongPressTimer = setTimeout(() => {
                const dx = e.clientX - desktopLongPressStartX;
                const dy = e.clientY - desktopLongPressStartY;
                if (Math.hypot(dx, dy) <= 8 && desktopLongPressTarget) {
                    const target = desktopLongPressTarget;
                    cancelDesktopLongPress();
                    isInteracting = false;
                    beginCosmicJourney(target);
                }
            }, LONG_PRESS_MS);
        }
    }
    
    if (!arMode) {
        interactStartPanX = panX; interactStartPanY = panY; interactStartRotate = rotateOffset; interactStartViewYaw = viewYawDeg; interactStartViewPitch = viewPitchDeg;
    }
});

window.addEventListener('mouseup', () => { 
    cancelDesktopLongPress();
    isInteracting = false; 
    constrainPan(); 
});

canvas.addEventListener('wheel', e => {
    e.preventDefault();
    if (timelapseActive) { showTimelapseBlockMessage(); return; }
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left; 
    const my = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.92 : 1.08;

    if (arMode) {
        // If zooming inside AR mode, drop tracking control and scale field of view manually
        if (arTrackingActive) {
            arTrackingActive = false;
            document.getElementById('btnRecenter').style.display = 'block';
            syntheticAzimuth = ((360 - smoothAlpha + 180) % 360 + 360) % 360;
            syntheticAltitude = smoothBeta - 90;
        }
        arZoomLevel = Math.max(1.0, Math.min(8.0, arZoomLevel * delta));
    } else {
        // Deep resolution limits unlocked for traditional 2D sky chart views
        const oldZoom = zoomLevel;
        zoomLevel = Math.max(0.4, Math.min(12.0, zoomLevel * delta));

        const zoomRatio = zoomLevel / oldZoom;
        const w = canvas.width / Math.min(window.devicePixelRatio, 2);
        const h = canvas.height / Math.min(window.devicePixelRatio, 2);
        const cx = w / 2; const cy = h / 2;
        
        panX = mx - (mx - panX - cx) * zoomRatio - cx;
        panY = my - (my - panY - cy) * zoomRatio - cy;
        constrainPan();
    }
}, { passive: false });

let touchStartDist = 0, touchStartZoom = 1, touchStartPanX = 0, touchStartPanY = 0, touchStartRotate = 0, touchStartMidX = 0, touchStartMidY = 0;
let touchStartTime = 0;
let touchMoved = false;
let touchLongPressTimer = null;
let touchLongPressTarget = null;
let touchLongPressStartX = 0;
let touchLongPressStartY = 0;

function cancelTouchLongPress() {
    clearTimeout(touchLongPressTimer);
    touchLongPressTimer = null;
    touchLongPressTarget = null;
    canvas.classList.remove('cosmic-hold');
}

canvas.addEventListener('touchstart', e => {
    if (timelapseActive) { showTimelapseBlockMessage(); return; }

    // Touch gestures should never trigger hover-style tooltips. Clear any existing
    // tooltip immediately so panning and pinch-zooming remain unobstructed.
    tooltip.classList.remove('visible');
    hoveredStar = null;
    canvas.classList.remove('hovering-star');
    touchStartTime = Date.now();
    touchMoved = e.touches.length > 1;

    if (e.touches.length === 1) {
        isInteracting = true;
        interactStartX = e.touches[0].clientX; interactStartY = e.touches[0].clientY;

        if (!arMode) {
            touchLongPressStartX = e.touches[0].clientX;
            touchLongPressStartY = e.touches[0].clientY;
            touchLongPressTarget = getJourneyObjectAt(touchLongPressStartX, touchLongPressStartY);
            if (touchLongPressTarget) {
                canvas.classList.add('cosmic-hold');
                touchLongPressTimer = setTimeout(() => {
                    if (!touchMoved && touchLongPressTarget && isInteracting) {
                        const target = touchLongPressTarget;
                        cancelTouchLongPress();
                        touchMoved = true;
                        isInteracting = false;
                        beginCosmicJourney(target);
                    }
                }, LONG_PRESS_MS);
            }
        }
        
        if (!arMode) {
                    interactStartPanX = panX; interactStartPanY = panY; interactStartRotate = rotateOffset; interactStartViewYaw = viewYawDeg; interactStartViewPitch = viewPitchDeg;
                }
    } else if (e.touches.length === 2) {
        isInteracting = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX; const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDist = Math.sqrt(dx*dx + dy*dy);
        touchStartZoom = zoomLevel; touchStartPanX = panX; touchStartPanY = panY; touchStartRotate = rotateOffset;
        touchStartMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2; touchStartMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 1 && isInteracting) {
        // Any meaningful movement means this is a gesture, not an object-selection tap.
        if (Math.abs(e.touches[0].clientX - interactStartX) > 7 || Math.abs(e.touches[0].clientY - interactStartY) > 7) {
            touchMoved = true;
            cancelTouchLongPress();
            tooltip.classList.remove('visible');
            hoveredStar = null;
            
            if (arMode && arTrackingActive) {
                freezeARTrackingForManualGesture();
                interactStartX = e.touches[0].clientX;
                interactStartY = e.touches[0].clientY;
            }
        }
        
        // Handles standard panning or directional look-around mechanics
        if (arMode) {
            if (!arTrackingActive && !cameraActive) {
                const dx = e.touches[0].clientX - interactStartX;
                const dy = e.touches[0].clientY - interactStartY;
                interactStartX = e.touches[0].clientX;
                interactStartY = e.touches[0].clientY;
                
                syntheticAzimuth = (syntheticAzimuth - dx * 0.15 + 360) % 360;
                syntheticAltitude = Math.max(-90, Math.min(90, syntheticAltitude + dy * 0.20));
                updateRMatrixFromSynthetic();
            }
        } else if (rotateMode) {
            const dx = e.touches[0].clientX - interactStartX;
            rotateOffset = interactStartRotate + dx * 0.5 * getDragZoomScale();
        } else {
            const dx = e.touches[0].clientX - interactStartX;
            const dy = e.touches[0].clientY - interactStartY;
            if (CELESTIAL_3D_MODE) {
                const dragScale = getDragZoomScale();
                viewYawDeg = (interactStartViewYaw - dx * 0.32 * dragScale + 540) % 360 - 180;
                viewPitchDeg = Math.max(-80, Math.min(80, interactStartViewPitch + dy * 0.24 * dragScale));
                panX = 0; panY = 0;
            } else {
                panX = interactStartPanX + dx; panY = interactStartPanY + dy;
                constrainPan();
            }
        }
    } else if (e.touches.length === 2) {
        // Multi-finger gesture pinch transformations
        const dx = e.touches[0].clientX - e.touches[1].clientX; 
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (touchStartDist > 0) {
            const scale = dist / touchStartDist;
            if (arMode) {
                freezeARTrackingForManualGesture();
                arZoomLevel = Math.max(1.0, Math.min(8.0, touchStartZoom * scale));
            } else {
                const oldZoom = touchStartZoom;
                zoomLevel = Math.max(0.4, Math.min(12.0, touchStartZoom * scale));
                
                const rect = canvas.getBoundingClientRect();
                const mx = touchStartMidX - rect.left; 
                const my = touchStartMidY - rect.top;
                const w = canvas.width / Math.min(window.devicePixelRatio, 2); 
                const h = canvas.height / Math.min(window.devicePixelRatio, 2);
                const cx = w / 2; const cy = h / 2;
                const zoomRatio = zoomLevel / oldZoom;
                
                panX = mx - (mx - touchStartPanX - cx) * zoomRatio - cx; 
                panY = my - (my - touchStartPanY - cy) * zoomRatio - cy;
            }
        }
        if (!arMode) {
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2; 
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            if (!CELESTIAL_3D_MODE) { panX = touchStartPanX + (midX - touchStartMidX); panY = touchStartPanY + (midY - touchStartMidY); constrainPan(); }
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', e => {
    if (e.touches.length === 0) cancelTouchLongPress();
    if (e.touches.length === 0) {
        const tapDuration = Date.now() - touchStartTime;
        const wasTap = !touchMoved && touchStartDist === 0 && tapDuration < 450;
        isInteracting = false;
        touchStartDist = 0;
        constrainPan();

        // Only a deliberate short tap can open object information on mobile.
        if (wasTap && !arMode && e.changedTouches.length) {
            checkTooltip(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            if (hoveredStar) {
                clearTimeout(window.__starTooltipTimer);
                window.__starTooltipTimer = setTimeout(() => {
                    tooltip.classList.remove('visible');
                    hoveredStar = null;
                    canvas.classList.remove('hovering-star');
                }, 4500);
            }
        } else {
            tooltip.classList.remove('visible');
            hoveredStar = null;
        }
    }
    else if (e.touches.length === 1) {
        isInteracting = true;
        interactStartX = e.touches[0].clientX; interactStartY = e.touches[0].clientY;
        if (!arMode) {
            interactStartPanX = panX; interactStartPanY = panY; interactStartRotate = rotateOffset; interactStartViewYaw = viewYawDeg; interactStartViewPitch = viewPitchDeg; touchStartDist = 0;
        }
    }
});

function setSkyToolActive(tool, active) {
    const btn = document.querySelector(`.sky-tool-icon[data-tool=\"${tool}\"]`);
    if (btn) btn.classList.toggle('active', !!active);
}

let skyToolStatusTimer = null;
function showSkyToolStatus(message) {
    const el = document.getElementById('skyToolStatus');
    if (!el) return;
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(skyToolStatusTimer);
    skyToolStatusTimer = setTimeout(() => el.classList.remove('visible'), 1100);
}

function syncSkyToolStates() {
    setSkyToolActive('constellations', showConstellations);
    setSkyToolActive('grid', showGrid);
    setSkyToolActive('dome', showDomeGrid);
    setSkyToolActive('sun', !sunForcedOff);
    setSkyToolActive('night', !!document.documentElement.classList.contains('night-mode'));
}

function toggleConstellations() {
    showConstellations = !showConstellations;
    setSkyToolActive('constellations', showConstellations);
    showSkyToolStatus(`CONSTELLATIONS ${showConstellations ? 'ON' : 'OFF'}`);
    drawMap();
}
function toggleGrid() {
    showGrid = !showGrid;
    setSkyToolActive('grid', showGrid);
    showSkyToolStatus(`GRID ${showGrid ? 'ON' : 'OFF'}`);
    drawMap();
}
function toggleDomeGrid() {
    showDomeGrid = !showDomeGrid;
    setSkyToolActive('dome', showDomeGrid);
    showSkyToolStatus(`DOME GRID ${showDomeGrid ? 'ON' : 'OFF'}`);
    drawMap();
}
function toggleRotateMode() {
    rotateMode = !rotateMode;
    showSkyToolStatus(`ROTATE MODE ${rotateMode ? 'ON' : 'OFF'}`);
    updateMapHint();
}

function drawMoon() {
    try {
    const c = document.getElementById('moonCanvas');
    const x = c.getContext('2d');
    const w = c.width, h = c.height;
    const cx = w/2, cy = h/2, r = 42;
    const now = getSimTime();

    const observer = new Astronomy.Observer(lat, lon, 0);
    const astroTime = Astronomy.MakeTime(now);
    const moonPhase = Astronomy.MoonPhase(astroTime);
    const moonIllum = Astronomy.Illumination('Moon', astroTime);
    const phaseFraction = moonIllum.phase_fraction;

    let name;
    const mp = ((moonPhase % 360) + 360) % 360;
    if (mp < 1 || mp > 359) name = 'New Moon';
    else if (mp < 45) name = 'Waxing Crescent';
    else if (mp < 90) name = 'Waxing Crescent';
    else if (mp < 91) name = 'First Quarter';
    else if (mp < 135) name = 'Waxing Gibbous';
    else if (mp < 180) name = 'Waxing Gibbous';
    else if (mp < 181) name = 'Full Moon';
    else if (mp < 225) name = 'Waning Gibbous';
    else if (mp < 270) name = 'Waning Gibbous';
    else if (mp < 271) name = 'Last Quarter';
    else if (mp < 315) name = 'Waning Crescent';
    else name = 'Waning Crescent';

    document.getElementById('moonPhaseName').textContent = name;
    document.getElementById('moonIllum').textContent = Math.round(phaseFraction * 100) + '% illuminated';

    try {
        const moonRise = Astronomy.SearchRiseSet('Moon', observer, 1, astroTime, 1.0);
        const moonSet = Astronomy.SearchRiseSet('Moon', observer, -1, astroTime, 1.0);
        const riseStr = moonRise ? formatTime(moonRise.date).replace('UTC ', '') : '--:--';
        const setStr = moonSet ? formatTime(moonSet.date).replace('UTC ', '') : '--:--';
        document.getElementById('moonTimes').textContent = `↑ UTC ${riseStr} · ↓ UTC ${setStr}`;
    } catch (e) {
        document.getElementById('moonTimes').textContent = '↑ UTC --:-- · ↓ UTC --:--';
    }

    x.clearRect(0, 0, w, h);
    x.fillStyle = 'rgba(20, 27, 42, 0.4)';
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ffffff';
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();

    x.fillStyle = 'rgba(120,128,140,0.28)';
    [
        { dx: -0.32, dy: -0.38, rx: 0.30, ry: 0.24 },
        { dx: 0.05,  dy: -0.15, rx: 0.20, ry: 0.24 },
        { dx: 0.12,  dy: 0.10,  rx: 0.22, ry: 0.16 },
        { dx: -0.45, dy: 0.12,  rx: 0.32, ry: 0.34 },
        { dx: 0.45,  dy: -0.30, rx: 0.12, ry: 0.12 },
        { dx: -0.05, dy: 0.42,  rx: 0.18, ry: 0.14 }
    ].forEach(m => {
        x.beginPath();
        x.ellipse(cx + m.dx * r, cy + m.dy * r, m.rx * r, m.ry * r, 0, 0, Math.PI * 2);
        x.fill();
    });

    x.fillStyle = 'rgba(20, 27, 42, 0.8)';
    x.beginPath();

    if (mp < 180) {
        const shadowWidth = r * 2 * (1 - mp / 180);
        x.ellipse(cx - r + shadowWidth/2, cy, shadowWidth/2, r, 0, 0, Math.PI * 2);
    } else {
        const shadowWidth = r * 2 * ((mp - 180) / 180);
        x.ellipse(cx + r - shadowWidth/2, cy, shadowWidth/2, r, 0, 0, Math.PI * 2);
    }
    x.fill();

    x.fillStyle = 'rgba(0,0,0,0.15)';
    x.beginPath(); x.arc(cx - 12, cy - 8, 5, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(cx + 8, cy + 12, 3, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(cx - 4, cy + 16, 2.5, 0, Math.PI * 2); x.fill();
    const g = x.createRadialGradient(cx, cy, r, cx, cy, r + 12);
    g.addColorStop(0, 'rgba(255,255,255,0.2)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(cx, cy, r + 12, 0, Math.PI * 2); x.fill();
    } catch (e) { document.getElementById('moonPhaseName').textContent = 'Unavailable'; }
}

function updatePlanets() {
    const list = document.getElementById('planetsList');
    list.innerHTML = '';
    const now = getSimTime();
    const observer = new Astronomy.Observer(lat, lon, 0);
    const astroTime = Astronomy.MakeTime(now);

    const planetNames = [
        {n:'Mercury',s:'☿',c:'#a0a0a0'}, {n:'Venus',s:'♀',c:'#c9a96e'},
        {n:'Mars',s:'♂',c:'#b87070'}, {n:'Jupiter',s:'♃',c:'#b8a070'},
        {n:'Saturn',s:'♄',c:'#a89878'}, {n:'Uranus',s:'⛢',c:'#70a8a8'},
        {n:'Neptune',s:'♆',c:'#7088b8'},
    ];

    planetNames.forEach(p => {
        try {
            const body = Astronomy.Body[p.n];
            if (!body) return;
            const equ = Astronomy.Equator(body, astroTime, observer, true, true);
            const hor = Astronomy.Horizon(astroTime, observer, equ.ra, equ.dec, dynamicRefraction);
            const up = hor.altitude > 0;
            const d = document.createElement('div');
            d.className = 'planet-row';
            d.innerHTML = `<span class="planet-sym" style="color:${up ? p.c : 'var(--text-faint)'}">${p.s}</span><div class="planet-info"><div class="planet-name" style="color:${up ? 'white' : 'var(--text-faint)'}">${p.n}</div><div class="planet-pos">${up ? hor.altitude.toFixed(2) + '° alt · ' + hor.azimuth.toFixed(2) + '° az' : 'Below horizon'}</div></div><span class="planet-badge ${up ? 'badge-up' : 'badge-down'}">${up ? 'Up' : 'Down'}</span>`;
            list.appendChild(d);
        } catch (e) {}
    });
}


function updateClock() { 
    const now = new Date();
    const timeStr = 'UTC ' + now.toLocaleTimeString([], {timeZone: 'UTC', hour:'2-digit', minute:'2-digit', hour12: false});
    document.getElementById('skyTime').textContent = timeStr; 
    
    const arTimeEl = document.getElementById('arUiTime');
    if (arTimeEl) {
        arTimeEl.textContent = timeStr;
        const opts = { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
        document.getElementById('arUiDate').textContent = now.toLocaleDateString('en-US', opts);
    }
}
setInterval(updateClock, 1000);
updateClock();

function updateAll() { 
    updatePlanets(); 
    drawMoon(); 
    updateISSLive();
}

// --- HOME SKY TIME DRAWER ---
function toggleHomeTimeDrawer(force) {
    const drawer = document.getElementById('skyTimeDrawer');
    const button = document.getElementById('skyTimelapseOpen');
    if (!drawer) return;
    const shouldOpen = typeof force === 'boolean' ? force : !drawer.classList.contains('open');
    drawer.classList.toggle('open', shouldOpen);
    drawer.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
    if (button) {
        button.classList.toggle('active', shouldOpen || timelapseActive);
        button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    }
    if (shouldOpen) refreshTimeTravelUI();
}

// --- TIME TRAVEL CONTROLS ---
function refreshTimeTravelUI() {
    const badge = document.getElementById('ttBadge');
    const display = document.getElementById('ttDisplay');
    const slider = document.getElementById('timeSlider');
    const picker = document.getElementById('ttPicker');
    const homeDisplay = document.getElementById('homeTtDisplay');
    const homeSlider = document.getElementById('homeTimeSlider');
    const homePicker = document.getElementById('homeTtPicker');

    const isSim = timeOffsetMinutes !== 0;
    if (badge) badge.style.display = isSim ? 'inline-block' : 'none';
    const wrap = document.getElementById('timeTravelWrap');
    if (wrap) wrap.classList.toggle('active', isSim);

    const t = getSimTime();
    const dateStr = t.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const displayText = isSim ? `${dateStr} · ${timeStr}` : `Now — ${dateStr} · ${timeStr}`;

    if (display) display.textContent = displayText;
    if (homeDisplay) homeDisplay.textContent = displayText;

    [slider, homeSlider].forEach(sl => {
        if (!sl) return;
        if (timeOffsetMinutes < parseInt(sl.min, 10)) sl.min = timeOffsetMinutes;
        if (timeOffsetMinutes > parseInt(sl.max, 10)) sl.max = timeOffsetMinutes;
        sl.value = timeOffsetMinutes;
    });

    const pad = n => String(n).padStart(2, '0');
    const pickerValue = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}`;
    if (picker) picker.value = pickerValue;
    if (homePicker) homePicker.value = pickerValue;

    const label = document.getElementById('timelapseLabel');
    if (label) {
        label.textContent = `⏩ TIMELAPSE — ${dateStr} · ${timeStr}`;
        label.classList.toggle('visible', timelapseActive);
    }
    updateTimelapseButtons();
}

function applyTimeChange() {
    lastAstroUpdateTime = -1; // force an immediate full sky-position refresh on the next frame
    refreshTimeTravelUI();
    updatePlanets();
    drawMoon();
}

function nudgeTime(minutes) {
    if (timelapseActive) return;
    timeOffsetMinutes += minutes;
    applyTimeChange();
}

function onTimeSliderChange(val) {
    if (timelapseActive) return;
    timeOffsetMinutes = parseInt(val, 10);
    applyTimeChange();
}

function resetTime() {
    if (timelapseActive) stopTimelapse();
    timeOffsetMinutes = 0;
    const slider = document.getElementById('timeSlider');
    if (slider) { slider.min = -720; slider.max = 720; }
    applyTimeChange();
}

function jumpToDateTime(value) {
    if (timelapseActive || !value) return;
    const picked = new Date(value);
    if (isNaN(picked.getTime())) return;
    timeOffsetMinutes = Math.round((picked.getTime() - Date.now()) / 60000);
    applyTimeChange();
}

// --- TIMELAPSE PLAYBACK ---
function setTimeControlsDisabled(disabled) {
    ['btnNudgeBack1h', 'btnNudgeBack15m', 'timeSlider', 'btnNudgeFwd15m', 'btnNudgeFwd1h', 'ttPicker'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
    });
}

function toggleTimelapse() {
    if (timelapseActive) stopTimelapse(); else startTimelapse();
}

function updateTimelapseButtons() {
    ['btnTimelapse','homeBtnTimelapse'].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.textContent = timelapseActive ? '⏸ Stop' : '▶ Timelapse';
        btn.classList.toggle('active', timelapseActive);
    });
    const timeBtn = document.getElementById('skyTimelapseOpen');
    if (timeBtn) timeBtn.classList.toggle('active', timelapseActive || document.getElementById('skyTimeDrawer')?.classList.contains('open'));
}

function startTimelapseWebGLLoop() {
    if (timelapseWebGLRafId !== null) cancelAnimationFrame(timelapseWebGLRafId);
    const frame = () => {
        if (!timelapseActive) { timelapseWebGLRafId = null; return; }
        try {
            if (starWebGLEnabled && starWebGLRenderer && !arMode) {
                const nowMs = performance.now();
                updateTimelapseSimulationClock(nowMs);
                const simNow = getSimTime();
                const renderedLocation = getRenderedObserverLocation();
                const observer = new Astronomy.Observer(renderedLocation.lat, renderedLocation.lon, 0);
                const astroTime = Astronomy.MakeTime(simNow);
                const gmst = Astronomy.SiderealTime(astroTime);
                const lstDeg = ((gmst * 15 + observer.longitude) % 360 + 360) % 360;
                starWebGLRenderer.draw({
                    lstDeg,
                    latRad: renderedLocation.lat * Math.PI / 180,
                    rotateDeg: rotateOffset,
                    panX: 0, panY: 0,
                    viewYawDeg: viewYawDeg, viewPitchDeg: viewPitchDeg,
                    zoom: zoomLevel,
                    visualZoom: visualZoomLevel,
                    cssW: _projW, cssH: _projH,
                    moving: true,
                    lodMag: getWebGLStarLodMag(isMobileDeviceCheck(), true, visualZoomLevel),
                    starDim: 1,
                    time: nowMs * 0.001,
                    photoreal: photorealisticMode
                });
            }
        } catch (e) {
            console.warn('Timelapse WebGL frame failed:', e);
        }
        timelapseWebGLRafId = requestAnimationFrame(frame);
    };
    timelapseWebGLRafId = requestAnimationFrame(frame);
}

function startTimelapse() {
    if (timelapseActive) return;
    timelapseActive = true;
    setTimeControlsDisabled(true);
    updateTimelapseButtons();

    // Cinematic clock: derive simulation time from one monotonic wall-clock
    // origin and sample it exactly once from drawMap(). This removes the
    // second competing requestAnimationFrame loop that could make the
    // displayed sky alternate by a frame when callbacks landed differently.
    timelapseStartWallMs = performance.now();
    timelapseStartOffsetMinutes = timeOffsetMinutes;
    timelapseLastFrame = timelapseStartWallMs;
    timelapseLastCanvasRenderMs = -1;
    timelapseUiAccumulator = 0;

    applyTimeChange();

    // The clock display gets its own lightweight 4 Hz ticker so it continues
    // updating even when the expensive Canvas layer is intentionally throttled.
    if (timelapseUiTimerId !== null) clearInterval(timelapseUiTimerId);
    timelapseUiTimerId = setInterval(() => {
        if (!timelapseActive) return;
        updateTimelapseSimulationClock(performance.now());
        refreshTimeTravelUI();
    }, 250);

    // Keep the device display awake for the duration of Timelapse. Wake Lock is
    // supported on modern Chromium/Safari browsers; unsupported browsers simply
    // continue without this enhancement.
    requestTimelapseWakeLock();
    startTimelapseWebGLLoop();
}

function stopTimelapse() {
    if (!timelapseActive) return;
    timelapseActive = false;
    timelapseRafId = null;
    if (timelapseWebGLRafId !== null) {
        cancelAnimationFrame(timelapseWebGLRafId);
        timelapseWebGLRafId = null;
    }
    timelapseLastCanvasRenderMs = -1;
    clearInterval(timelapseIntervalId);
    if (timelapseUiTimerId !== null) {
        clearInterval(timelapseUiTimerId);
        timelapseUiTimerId = null;
    }
    releaseTimelapseWakeLock();
    timelapseStartWallMs = 0;
    timelapseStartOffsetMinutes = timeOffsetMinutes;
    timelapseIntervalId = null;
    setTimeControlsDisabled(false);
    updateTimelapseButtons();
    refreshTimeTravelUI();
}

let timelapseBlockMsgTimeout = null;
function showTimelapseBlockMessage() {
    const msg = document.getElementById('timelapseBlockMsg');
    if (!msg) return;
    msg.classList.add('visible');
    clearTimeout(timelapseBlockMsgTimeout);
    timelapseBlockMsgTimeout = setTimeout(() => msg.classList.remove('visible'), 1400);
}

// --- NIGHT VISION (RED) MODE ---
function toggleNightMode() {
    // Keep the home sky-tool dock in sync with the existing night-vision state.
    setSkyToolActive('night', !document.documentElement.classList.contains('night-mode'));
    showSkyToolStatus(`NIGHT VISION ${document.documentElement.classList.contains('night-mode') ? 'OFF' : 'ON'}`);
    const isNight = document.documentElement.classList.toggle('night-mode');
    [document.getElementById('btnNightMode'), document.getElementById('btnNightModeHome')].forEach(btn => {
        if (btn) btn.classList.toggle('active', isNight);
    });
}

setInterval(updateISSLive, 5000); 

populateShowers();
fetchWeather();
fetchAPOD();
updateAll();
refreshTimeTravelUI();
renderObservingLog();
document.getElementById('locName').textContent = cityName;

const status = document.getElementById('searchStatus');
status.textContent = `Location: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
status.className = 'search-status success';

autoDetectLocation();

canvas.addEventListener('dblclick', (e) => {
    if (timelapseActive) { showTimelapseBlockMessage(); return; }
    if (hoveredStar && telescopeConnected) {
        slewToTarget(hoveredStar);
    } else if (hoveredStar && !telescopeConnected) {
        alert("Telescope not connected. Click 'Connect LX200' first.");
    }
});

let lastTapTime = 0;
canvas.addEventListener('touchend', (e) => {
    if (timelapseActive) { showTimelapseBlockMessage(); return; }
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;
    if (tapLength < 500 && tapLength > 0) {
        if (hoveredStar && telescopeConnected) {
            slewToTarget(hoveredStar);
        }
    }
    lastTapTime = currentTime;
});
// Prevent edge-swipe from closing the PWA
window.history.pushState(null, null, window.location.href);
window.addEventListener('popstate', function (event) {
    window.history.pushState(null, null, window.location.href);
});
// Photorealistic rendering is now the permanent default visual mode.
// The old user-facing toggle was removed from the Sky UI.
function toggleRenderMode() {
    photorealisticMode = true;
    drawMap();
}

