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
            obj._vis = {
                posAngle: rand() * 180,
                axisRatio,
                coreHue: elliptical ? '255,225,175' : '255,214,168',
                armHue: elliptical ? '255,214,175' : '120,160,255'
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
const TIMELAPSE_STEP_MINUTES = 1.5;   // sim-minutes advanced per tick
const TIMELAPSE_TICK_MS = 30;      // real ms between ticks
let showConstellations = true, showGrid = false, showHorizon = true;
let zoomLevel = 1;
let currentBortle = 5;            

let panX = 0, panY = 0;           
let rotateOffset = 0;             
let rotateMode = false;           
let isInteracting = false;        
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
let R_matrix = [1,0,0, 0,1,0, 0,0,1];
let screenOrientation = 0;
let absoluteModeActive = false;

let smoothAlpha = null;
let smoothBeta = null;
let smoothGamma = null;
const SMOOTH_K = 0.12; 
let syntheticAzimuth = 180;
let syntheticAltitude = 0; 

let sunForcedOff = false;
let targetSunAnim = 1.0; 
let currentSunAnim = 1.0;

function updateMapHint() {
    const hint = document.getElementById('mapHint');
    if (hint) {
        if (arMode) hint.textContent = 'AR Active · point phone at sky to locate objects';
        else if (rotateMode) hint.textContent = 'drag to rotate · scroll/pinch to zoom · hover for info';
        else hint.textContent = 'drag to pan · scroll/pinch to zoom · hover for info · double-click to slew';
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

function processOrientation(event) {
    if (!arMode || !arTrackingActive) return;
    
    if (event.absolute) absoluteModeActive = true;
    if (absoluteModeActive && !event.absolute && event.webkitCompassHeading === undefined) return;

    let alpha = event.alpha || 0;
    let beta = event.beta || 0;
    let gamma = event.gamma || 0;

    if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
        alpha = 360 - event.webkitCompassHeading;
    }

    smoothAlpha = smoothAngle(smoothAlpha, alpha, SMOOTH_K);
    smoothBeta = smoothAngle(smoothBeta, beta, SMOOTH_K);
    smoothGamma = smoothAngle(smoothGamma, gamma, SMOOTH_K);

    updateRMatrixFromSmooth();
    screenOrientation = (window.screen.orientation || {}).angle || window.orientation || 0;

    const warningEl = document.getElementById('arWarning');
    if (R_matrix[8] > 0.1) { 
        warningEl.style.display = 'block';
    } else {
        warningEl.style.display = 'none';
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
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
            .then(stream => {
                const videoEl = document.getElementById('arVideo');
                videoEl.srcObject = stream;
                videoEl.play();
                videoEl.style.display = 'block';
                document.getElementById('bgStars').style.display = 'none';
                canvas.style.background = 'transparent';
                document.querySelector('.panel-map').style.setProperty('background', 'transparent', 'important');
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
    document.body.style.background = '';
    window.removeEventListener('deviceorientation', processOrientation, true);
    window.removeEventListener('deviceorientationabsolute', processOrientation, true);
    
    panX = 0; panY = 0; rotateOffset = 0; 
    smoothAlpha = null; smoothBeta = null; smoothGamma = null; 
    cameraActive = false;
    document.getElementById('arWarning').style.display = 'none';
}

function restoreMapUI() {
    document.querySelector('.panel-map .panel-header').style.display = 'flex';
    document.querySelector('.panel-map .map-footer').style.display = 'flex';
    document.getElementById('btnFullscreen').style.display = 'flex';
    document.getElementById('arUIOverlay').style.display = 'none';
    document.getElementById('btnARMap').style.display = 'flex'; 
    document.getElementById('btnSunMap').style.display = 'flex';
}

function exitAR() {
    if (arMode) {
        arMode = false;
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
    document.getElementById('btnRecenter').style.display = 'none';
    smoothAlpha = null; 
    smoothBeta = null; 
    smoothGamma = null;
    arZoomLevel = 1.0; // Resets manual override AR magnification instantly
}

function toggleSun() { 
    sunForcedOff = !sunForcedOff; 
    document.getElementById('btnSunMap').classList.toggle('active', !sunForcedOff); 
    targetSunAnim = sunForcedOff ? 0.0 : 1.0; 
}

function toggleAR() {
    const panel = document.querySelector('.panel-map');
    
    arMode = !arMode;
    
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
        document.getElementById('btnARMap').style.display = 'none';
        document.getElementById('btnSunMap').style.display = 'none';
        
        document.getElementById('arUIOverlay').style.display = 'block';
        
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
            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission().then(permissionState => {
                    if (permissionState === 'granted') {
                        window.addEventListener('deviceorientation', processOrientation, true);
                        window.addEventListener('deviceorientationabsolute', processOrientation, true);
                    } else {
                        showArMessage("Orientation permission denied.", 3000);
                        arTrackingActive = false;
                        document.getElementById('btnRecenter').style.display = 'block';
                    }
                }).catch(console.error);
            } else {
                window.addEventListener('deviceorientation', processOrientation, true);
                window.addEventListener('deviceorientationabsolute', processOrientation, true);
            }
        }
    } else {
        document.body.classList.remove('ar-active');
        stopARCameraAndSensors();
        restoreMapUI();
    }
}

const canvas = document.getElementById('starCanvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('starTooltip');
const ttName = document.getElementById('ttName');
const ttInfo = document.getElementById('ttInfo');
const ttType = document.getElementById('ttType');

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
// Robust ResizeObserver eliminates distortion/stretching when containers adapt layout
const resizeObserver = new ResizeObserver(() => resizeCanvas());
resizeObserver.observe(canvas);

function projectAz(alt, az) {
    const w = canvas.width / Math.min(window.devicePixelRatio, 2);
    const h = canvas.height / Math.min(window.devicePixelRatio, 2);
    const cx = w / 2;
    const cy = h / 2;
    
    if (arMode) {
        const focalLength = Math.max(w, h) * 0.85 * arZoomLevel; 
        
        const altRad = alt * Math.PI / 180;
        const azRad = az * Math.PI / 180;
        
        const E = Math.cos(altRad) * Math.sin(azRad);
        const N = Math.cos(altRad) * Math.cos(azRad);
        const U = Math.sin(altRad);
        
        const dx = R_matrix[0] * E + R_matrix[3] * N + R_matrix[6] * U;
        const dy = R_matrix[1] * E + R_matrix[4] * N + R_matrix[7] * U;
        const dz = R_matrix[2] * E + R_matrix[5] * N + R_matrix[8] * U;
        
        const z_depth = -dz;
        if (z_depth <= 0.01) return { x: -9999, y: -9999, dist: 0, onScreen: false, z3d: z_depth };
        
        const px = (dx / z_depth) * focalLength;
        const py = (dy / z_depth) * focalLength;
        
        const O = screenOrientation * Math.PI / 180;
        const sx = px * Math.cos(O) + py * Math.sin(O);
        const sy = -px * Math.sin(O) + py * Math.cos(O);
        
        const x = cx + sx;
        const y = cy - sy; 
        
        const onScreen = x > -w && x < w*2 && y > -h && y < h*2;
        return { x, y, dist: 1, onScreen, z3d: z_depth };
    } else {
        const cxp = cx + panX;
        const cyp = cy + panY;
        
        // Use Math.max instead of Math.min so the radius extends into the corners
        const r = Math.max(w, h) * 0.85 * zoomLevel; 
        const dist = (90 - alt) / 90 * r;
        const angleRad = (az - 180 + rotateOffset) * Math.PI / 180;
        
        const x = cxp + dist * Math.sin(angleRad);
        const y = cyp - dist * Math.cos(angleRad);
        
        // Remove the circular cutoff limit entirely
        const onScreen = x > -50 && x < w + 50 && y > -50 && y < h + 50;
        
        return { x, y, dist, onScreen, z3d: 1 };
    }
}

let lastStarPositions = [];
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

function drawPhotorealStarPSF(ctx, star, alpha, size, col) {
    if (!Number.isFinite(star.x) || !Number.isFinite(star.y) || alpha <= 0) return;
    const magBoost = Math.max(0, -star.mag);
    const halo = size * (4.5 + magBoost * 2.5);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, halo);
    g.addColorStop(0, `rgba(255,255,255,${Math.min(1,alpha*1.35)})`);
    g.addColorStop(0.08, `rgba(${col.r},${col.g},${col.b},${alpha*0.8})`);
    g.addColorStop(0.28, `rgba(${col.r},${col.g},${col.b},${alpha*0.20})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(star.x, star.y, halo, 0, Math.PI*2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
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
    ctx.restore();
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

    // Zodiacal light, centered on the true ecliptic: sample ecliptic latitude and
    // longitude and convert the band to equatorial coordinates before projection.
    const zSteps=72;
    for(let i=0;i<zSteps;i++){
        const eclLon=i*5;
        const eclLat=0;
        // Convert ecliptic coordinates to equatorial ourselves.
        // Astronomy Engine does not expose EquatorFromEcliptic in the browser
        // build used by StarSight, so calling it here would abort drawMap().
        const eps = 23.43929111 * Math.PI / 180;
        const lam = eclLon * Math.PI / 180;
        const bet = eclLat * Math.PI / 180;
        const sinDec = Math.sin(bet) * Math.cos(eps) + Math.cos(bet) * Math.sin(eps) * Math.sin(lam);
        const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
        const ra = Math.atan2(
            Math.sin(lam) * Math.cos(eps) - Math.tan(bet) * Math.sin(eps),
            Math.cos(lam)
        );
        const eqRaDeg = ((ra * 180 / Math.PI) + 360) % 360;
        const eqDecDeg = dec * 180 / Math.PI;
        const pre=precessStarToDate(eqRaDeg,eqDecDeg,astroTime);
        const hor=Astronomy.Horizon(astroTime,observer,pre.ra,pre.dec,dynamicRefraction);
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
        const pre=precessStarToDate(blob.raHrs*15,blob.dec,astroTime);
        const hor=Astronomy.Horizon(astroTime,observer,pre.ra,pre.dec,dynamicRefraction);
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
        const pre=precessStarToDate(s.raHrs*15,s.dec,astroTime);
        const hor=Astronomy.Horizon(astroTime,observer,pre.ra,pre.dec,dynamicRefraction);
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

    // Dust lanes are rendered as subtle translucent voids over the luminous band.
    ctx.globalCompositeOperation='source-over';
    for (let i=0; i<MW_DUST.length; i++) {
        const d=MW_DUST[i];
        const pre=precessStarToDate(d.raHrs*15,d.dec,astroTime);
        const hor=Astronomy.Horizon(astroTime,observer,pre.ra,pre.dec,dynamicRefraction);
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
            ctx.fillStyle = color;
            ctx.fillText(text, px, py);
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

function renderOptimizedStars(ctx, astroTime, observer, starDimFactor, w, h) {
    for (let key in FAINT_COLOR_BUCKETS) { FAINT_COLOR_BUCKETS[key].stars.length = 0; }
    const brightStarsToGlow = [];
    const t = Date.now() * 0.001;

    // --- FAST MATH PRE-CALCULATION ---
    // Extract local sidereal time once per frame to bypass heavy Astronomy.Horizon calls for faint stars
    const gmst = Astronomy.SiderealTime(astroTime);
    let lstDeg = (gmst * 15 + lon) % 360;
    if (lstDeg < 0) lstDeg += 360;
    
    const latRad = lat * Math.PI / 180;
    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);
    const rad2deg = 180 / Math.PI;

    for (let i = 0; i < ALL_STARS.length; i++) {
        const star = ALL_STARS[i];

        // Clear previous-frame projection state before calculating this frame.
        // Without this, hidden/off-screen stars can retain stale x/y coordinates
        // and constellation lines may connect to those old positions.
        star.onScreen = false;
        star.x = NaN;
        star.y = NaN;

        let alt, az;
        
        // Use high-precision refraction/precession engine for bright stars and planets
        if (star.mag < 3.0) {
            const precessed = precessStarToDate(star.ra, star.dec, astroTime, star.pmRa || 0, star.pmDec || 0);
            const hor = Astronomy.Horizon(astroTime, observer, precessed.ra, precessed.dec, dynamicRefraction);
            alt = hor.altitude;
            az = hor.azimuth;
        } else {
            // --- INLINE TRIGONOMETRY FOR FAINT STARS ---
            // Skips refraction/precession overhead (saves ~4,500 complex loops per frame)
            const haRad = (lstDeg - star.ra) * Math.PI / 180;
            const decRad = star.dec * Math.PI / 180;
            
            const sinDec = Math.sin(decRad);
            const cosDec = Math.cos(decRad);
            
            const sinAlt = sinDec * sinLat + cosDec * cosLat * Math.cos(haRad);
            alt = Math.asin(sinAlt) * rad2deg;
            
            if (alt < 0.0) continue; 
            
            const cosAz = (sinDec - sinAlt * sinLat) / (Math.cos(alt / rad2deg) * cosLat);
            az = Math.acos(Math.max(-1, Math.min(1, cosAz))) * rad2deg;
            if (Math.sin(haRad) > 0) az = 360 - az;
        }

        if (alt < 0.0) continue;

        const proj = projectAz(alt, az);
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
            const radius = Math.max(0.5, (6.0 - s.mag) * 0.35) * (arMode ? 1.2 : (zoomLevel * 0.4 + 0.6));
            ctx.moveTo(s.x + radius, s.y); ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        }
        ctx.fill();
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

        if (star.mag < 1.2 && (zoomLevel > 1.2 || arMode)) {
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

function drawMap() {
    try {
    const w = canvas.width / Math.min(window.devicePixelRatio, 2);
    const h = canvas.height / Math.min(window.devicePixelRatio, 2);
    const cx = w/2 + panX;
    const cy = h/2 + panY;
    const r = Math.max(w, h) * 0.85 * zoomLevel;
    const now = getSimTime();
    const observer = new Astronomy.Observer(lat, lon, 0);
    const astroTime = Astronomy.MakeTime(now);
    
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
                const p = projectAz(fs.alt, fs.az);
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

    if (showHorizon) {
        if (arMode) {
            const camSinAlt = R_matrix[8]; 
            
            if (camSinAlt > -0.7) {
                if (camSinAlt > 0.9) {
                    ctx.fillStyle = cameraActive ? 'rgba(0,0,0,0.7)' : '#010205';
                    ctx.fillRect(-w, -h, w*3, h*3);
                } else {
                    let centerAz = syntheticAzimuth;
                    if (arTrackingActive && smoothAlpha !== null) {
                        centerAz = (360 - smoothAlpha) % 360;
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

            ctx.fillStyle = cameraActive ? 'rgba(201,169,110,0.8)' : 'rgba(100, 150, 255, 0.9)';
            ctx.font = '500 12px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            const dirs = [ {label:'N', az:0}, {label:'E', az:90}, {label:'S', az:180}, {label:'W', az:270} ];
            dirs.forEach(d => {
                const p = projectAz(0, d.az);
                if (p.z3d > 0.1 && p.onScreen) {
                    ctx.fillText(d.label, p.x, p.y + 20);
                }
            });
            ctx.textAlign = 'left';
        } else {
            ctx.strokeStyle = 'rgba(201,169,110,0.08)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(201,169,110,0.25)';
            ctx.font = '500 10px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            const dirs = [ {label:'N', az:0}, {label:'E', az:90}, {label:'S', az:180}, {label:'W', az:270} ];
            dirs.forEach(d => {
                const angleRad = (d.az - 180 + rotateOffset) * Math.PI / 180;
                const dx = cx + (r + 14) * Math.sin(angleRad);
                const dy = cy - (r + 14) * Math.cos(angleRad);
                ctx.fillText(d.label, dx, dy + 3);
            });
            ctx.textAlign = 'left';
        }
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
                const rr = (90 - alt) / 90 * r;
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
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const pixelPerDeg = arMode ? (Math.max(w, h) * 0.85 * arZoomLevel / 57.3) : r / 90; 

        MW_BLOBS.forEach(blob => {
            const precessed=precessStarToDate(blob.raHrs*15,blob.dec,astroTime);
            const hor=Astronomy.Horizon(astroTime,observer,precessed.ra,precessed.dec,dynamicRefraction);
            if(hor.altitude<0)return;
            const proj=projectAz(hor.altitude,hor.azimuth); if(!proj.onScreen)return;
            const horizonFade=Math.min(1,Math.max(0,hor.altitude/15)); if(horizonFade<=0)return;
            const blobRadius=blob.sizeDeg*pixelPerDeg*(arMode?1:zoomLevel);
            let finalAlpha=blob.alpha*horizonFade*mwFader; if(arMode)finalAlpha=Math.min(1,finalAlpha*3.5);
            ctx.globalAlpha=finalAlpha; ctx.drawImage(mwBrush,proj.x-blobRadius,proj.y-blobRadius,blobRadius*2,blobRadius*2);
        });
        if(photorealisticMode && !arMode) drawPhotorealMilkyWay(ctx,astroTime,observer,mwFader,r);
        const mwTime=Date.now()*.001; ctx.save();
        MW_STARS.forEach(star=>{
            const precessed=precessStarToDate(star.raHrs*15,star.dec,astroTime);
            const hor=Astronomy.Horizon(astroTime,observer,precessed.ra,precessed.dec,dynamicRefraction);
            if(hor.altitude<0)return; const proj=projectAz(hor.altitude,hor.azimuth); if(!proj.onScreen)return;
            const horizonFade=Math.min(1,Math.max(0,hor.altitude/10));
            const shimmer=.6+.4*Math.sin(mwTime*star.blinkSpd+star.blinkOff);
            let finalAlpha=star.baseAlpha*horizonFade*mwFader*shimmer; if(arMode)finalAlpha=Math.min(1,finalAlpha*2);
            if(finalAlpha<=0)return; ctx.fillStyle='white'; ctx.globalAlpha=finalAlpha;
            const starRadius=star.sizeDeg*(arMode?1:zoomLevel); ctx.beginPath();ctx.arc(proj.x,proj.y,starRadius,0,Math.PI*2);ctx.fill();
        }); ctx.restore();
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

            planetPositions.push({ ...p, name: p.n, alt: hor.altitude, az: hor.azimuth, ...proj, isPlanet: true, isMoon: false, sizeFactor, phaseAngle, elongVis, moons });
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
                mp: moonPhaseAngle, phase_frac: moonIllum.phase_fraction, sizeFactor: moonSizeFactor
            });
        }
    } catch(e) {}

    lastPlanetPositions = planetPositions;

    const dsoPositions = DSO_OBJECTS.map(obj => {
        const precessed = precessStarToDate(obj.ra, obj.dec, astroTime);
        const hor = Astronomy.Horizon(astroTime, observer, precessed.ra, precessed.dec, dynamicRefraction);
        const proj = projectAz(hor.altitude, hor.azimuth);
        return { ...obj, alt: hor.altitude, az: hor.azimuth, ...proj, isDso: true };
    });

    // Run the fast math FIRST so the coordinates are ready in memory

    lastStarPositions = [...ALL_STARS, ...dsoPositions];

    dsoPositions.forEach(obj => {
        if (!obj.onScreen || obj.alt < 0.0) return;
        const horizonFade = obj.alt < 10 ? Math.max(0, obj.alt / 10) : 1;
        if (horizonFade <= 0) return;
        const zoomVal = arMode ? arZoomLevel : zoomLevel;
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
            const s1 = ALL_STARS.find(s => s.name === n1);
            const s2 = ALL_STARS.find(s => s.name === n2);
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
            const baseSize = 9 * (arMode ? arZoomLevel : zoomLevel) * (1 + (p.sizeFactor || 0) * 0.13); 
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
            const sr = 12 * (arMode ? arZoomLevel : zoomLevel); 
            
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
        const labeledStars = ALL_STARS
            // Filter out stars without names so they don't render "undefined" on the canvas
            .filter(s => s.onScreen && s.alt >= 0.0 && s.name) 
            .sort((a, b) => a.mag - b.mag)
            .slice(0, starLimit);
        
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
            
            const rOuter = 20 * (arMode ? 1.5 : zoomLevel);
            const rInner = 8 * (arMode ? 1.5 : zoomLevel);
            const lineLen = 12 * (arMode ? 1.5 : zoomLevel);

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
    // --- ROTATE COMPASS NEEDLE ---
    const compass = document.getElementById('skyCompass');
    const needle = document.getElementById('compassNeedle');
    if (compass) compass.classList.toggle('south-up', !arMode);
    if (needle) {
        if (arMode) {
            // AR view is camera/north-up: north stays at the top.
            needle.style.transform = `rotate(${-syntheticAzimuth}deg)`;
        } else {
            // The 2D sky map is intentionally south-up, so geographic north
            // is 180° from the normal compass-top position.
            needle.style.transform = `rotate(${rotateOffset + 180}deg)`;
        }
    }
    requestAnimationFrame(drawMap);
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
    if (!isInteracting) return;
    if (arMode) {
        const dx = e.clientX - interactStartX;
        const dy = e.clientY - interactStartY;
        interactStartX = e.clientX;
        interactStartY = e.clientY;
        
        syntheticAzimuth = (syntheticAzimuth - dx * 0.15 + 360) % 360;
        syntheticAltitude = Math.max(-90, Math.min(90, syntheticAltitude + dy * 0.20));
        updateRMatrixFromSynthetic();
    } else if (rotateMode) {
        const dx = e.clientX - interactStartX;
        rotateOffset = interactStartRotate + dx * 0.5;
    } else {
        const dx = e.clientX - interactStartX;
        const dy = e.clientY - interactStartY;
        panX = interactStartPanX + dx; panY = interactStartPanY + dy;
        constrainPan();
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

canvas.addEventListener('mousedown', e => {
    if (timelapseActive) { showTimelapseBlockMessage(); return; }
    isInteracting = true;
    interactStartX = e.clientX; interactStartY = e.clientY;
    if (arMode) {
        if (arTrackingActive) {
            arTrackingActive = false;
            document.getElementById('btnRecenter').style.display = 'block';
            syntheticAzimuth = (360 - smoothAlpha) % 360;
            syntheticAltitude = smoothBeta - 90;
        }
    } else {
        interactStartPanX = panX; interactStartPanY = panY; interactStartRotate = rotateOffset;
    }
});

window.addEventListener('mouseup', () => { 
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
            syntheticAzimuth = (360 - smoothAlpha) % 360;
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

canvas.addEventListener('touchstart', e => {
    if (timelapseActive) { showTimelapseBlockMessage(); return; }
    if (e.touches.length === 1) {
        isInteracting = true;
        interactStartX = e.touches[0].clientX; interactStartY = e.touches[0].clientY;
        
        checkTooltip(e.touches[0].clientX, e.touches[0].clientY);
        
        if (arMode) {
            if (arTrackingActive) {
                arTrackingActive = false;
                document.getElementById('btnRecenter').style.display = 'block';
                syntheticAzimuth = (360 - smoothAlpha) % 360;
                syntheticAltitude = smoothBeta - 90;
            }
        } else {
            interactStartPanX = panX; interactStartPanY = panY; interactStartRotate = rotateOffset;
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
        // Handles standard panning or directional look-around mechanics
        if (arMode) {
            const dx = e.touches[0].clientX - interactStartX;
            const dy = e.touches[0].clientY - interactStartY;
            interactStartX = e.touches[0].clientX;
            interactStartY = e.touches[0].clientY;
            
            syntheticAzimuth = (syntheticAzimuth - dx * 0.15 + 360) % 360;
            syntheticAltitude = Math.max(-90, Math.min(90, syntheticAltitude + dy * 0.20));
            updateRMatrixFromSynthetic();
        } else if (rotateMode) {
            const dx = e.touches[0].clientX - interactStartX;
            rotateOffset = interactStartRotate + dx * 0.5;
        } else {
            const dx = e.touches[0].clientX - interactStartX; 
            const dy = e.touches[0].clientY - interactStartY;
            panX = interactStartPanX + dx; panY = interactStartPanY + dy;
            constrainPan();
        }
    } else if (e.touches.length === 2) {
        // Multi-finger gesture pinch transformations
        const dx = e.touches[0].clientX - e.touches[1].clientX; 
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (touchStartDist > 0) {
            const scale = dist / touchStartDist;
            if (arMode) {
                if (arTrackingActive) {
                    arTrackingActive = false;
                    document.getElementById('btnRecenter').style.display = 'block';
                    syntheticAzimuth = (360 - smoothAlpha) % 360;
                    syntheticAltitude = smoothBeta - 90;
                }
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
            const dxPan = midX - touchStartMidX; 
            const dyPan = midY - touchStartMidY;
            panX = touchStartPanX + dxPan; 
            panY = touchStartPanY + dyPan;
            constrainPan();
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', e => {
    if (e.touches.length === 0) { isInteracting = false; touchStartDist = 0; constrainPan(); }
    else if (e.touches.length === 1) {
        isInteracting = true;
        interactStartX = e.touches[0].clientX; interactStartY = e.touches[0].clientY;
        if (!arMode) {
            interactStartPanX = panX; interactStartPanY = panY; interactStartRotate = rotateOffset; touchStartDist = 0;
        }
    }
});

function toggleConstellations() { showConstellations = !showConstellations; document.getElementById('btnConst').classList.toggle('active', showConstellations); }
function toggleGrid() { showGrid = !showGrid; document.getElementById('btnGrid').classList.toggle('active', showGrid); }
function toggleHorizon() { showHorizon = !showHorizon; document.getElementById('btnHorizon').classList.toggle('active', showHorizon); }
function toggleRotateMode() { rotateMode = !rotateMode; document.getElementById('btnRotate').classList.toggle('active', rotateMode); updateMapHint(); }

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

// --- TIME TRAVEL CONTROLS ---
function refreshTimeTravelUI() {
    const badge = document.getElementById('ttBadge');
    const display = document.getElementById('ttDisplay');
    const slider = document.getElementById('timeSlider');
    const picker = document.getElementById('ttPicker');
    if (!badge || !display || !slider || !picker) return;

    const isSim = timeOffsetMinutes !== 0;
    badge.style.display = isSim ? 'inline-block' : 'none';
    document.getElementById('timeTravelWrap').classList.toggle('active', isSim);

    // Keep the slider's range wide enough to track wherever nudging/timelapse has gone.
    if (timeOffsetMinutes < parseInt(slider.min, 10)) slider.min = timeOffsetMinutes;
    if (timeOffsetMinutes > parseInt(slider.max, 10)) slider.max = timeOffsetMinutes;
    slider.value = timeOffsetMinutes;

    const t = getSimTime();
    const dateStr = t.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    display.textContent = isSim ? `${dateStr} · ${timeStr}` : `Now — ${dateStr} · ${timeStr}`;

    const pad = n => String(n).padStart(2, '0');
    picker.value = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}`;

    const label = document.getElementById('timelapseLabel');
    if (label) {
        label.textContent = `⏩ TIMELAPSE — ${dateStr} · ${timeStr}`;
        label.classList.toggle('visible', timelapseActive);
    }
}

function applyTimeChange() {
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

function startTimelapse() {
    if (timelapseActive) return;
    timelapseActive = true;
    setTimeControlsDisabled(true);
    const btn = document.getElementById('btnTimelapse');
    if (btn) { btn.textContent = '⏸ Stop'; btn.classList.add('active'); }
    timelapseIntervalId = setInterval(() => {
        timeOffsetMinutes += TIMELAPSE_STEP_MINUTES;
        applyTimeChange();
    }, TIMELAPSE_TICK_MS);
    applyTimeChange();
}

function stopTimelapse() {
    if (!timelapseActive) return;
    timelapseActive = false;
    clearInterval(timelapseIntervalId);
    timelapseIntervalId = null;
    setTimeControlsDisabled(false);
    const btn = document.getElementById('btnTimelapse');
    if (btn) { btn.textContent = '▶ Timelapse'; btn.classList.remove('active'); }
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
    const isNight = document.documentElement.classList.toggle('night-mode');
    const btn = document.getElementById('btnNightMode');
    if (btn) btn.classList.toggle('active', isNight);
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
// ===== Photorealistic / Scientific rendering toggle =====
function toggleRenderMode() {
    photorealisticMode=!photorealisticMode;
    const btn=document.getElementById('btnRenderMode'), text=document.getElementById('renderModeText'), icon=document.getElementById('renderModeIcon');
    if(btn)btn.classList.toggle('active',photorealisticMode);
    if(text)text.textContent=photorealisticMode?'PHOTO':'SCI';
    if(icon)icon.textContent=photorealisticMode?'✦':'◎';
    drawMap();
}
