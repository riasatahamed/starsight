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
}
initMilkyWay();

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
            const elliptical = /elliptical/i.test(desc);
            const axisRatio = elliptical ? (0.65 + rand() * 0.35) : (0.2 + rand() * 0.5);
            obj._vis = { posAngle: rand() * 180, axisRatio, hue: elliptical ? '210,198,170' : '196,184,158' };
        } else if (obj.type === 'nebula') {
            const planetary = /planetary nebula/i.test(desc);
            const emission = /emission/i.test(desc);
            const reflection = /reflection/i.test(desc);
            let hue = '150,190,182'; // teal-green: the actual visual eyepiece response to nebular OIII light
            if (emission) hue = '182,148,148';
            if (reflection) hue = '150,165,205';
            const blobCount = planetary ? 1 : (3 + Math.floor(rand() * 3));
            const blobs = [];
            for (let i = 0; i < blobCount; i++) {
                blobs.push({
                    dx: (rand() - 0.5) * (planetary ? 0.08 : 1.05),
                    dy: (rand() - 0.5) * (planetary ? 0.08 : 1.05),
                    rScale: planetary ? 1.0 : (0.4 + rand() * 0.5),
                    aScale: 0.5 + rand() * 0.5
                });
            }
            obj._vis = { hue, blobs, planetary };
        } else if (obj.type === 'cluster') {
            const globular = /globular/i.test(desc);
            const dotCount = globular ? (11 + Math.floor(rand() * 7)) : (7 + Math.floor(rand() * 8));
            const dots = [];
            for (let i = 0; i < dotCount; i++) {
                let dx, dy;
                if (globular) {
                    const radius = Math.pow(rand(), 1.6);
                    const ang = rand() * Math.PI * 2;
                    dx = Math.cos(ang) * radius; dy = Math.sin(ang) * radius;
                } else {
                    dx = (rand() - 0.5) * 1.7; dy = (rand() - 0.5) * 1.7;
                }
                dots.push({ dx, dy, sizeRel: 0.35 + rand() * 0.65, briRel: 0.5 + rand() * 0.5 });
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
    const r = Math.min(w/2, h/2) * 0.85 * zoomLevel;
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
        document.getElementById('arUiLoc').textContent = isGpsLocation ? `${lat.toFixed(5)}, ${lon.toFixed(5)}` : cityName.split(',')[0].substring(0, 15);
        
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
        const r = Math.min(w/2, h/2) * 0.85 * zoomLevel;
        const dist = (90 - alt) / 90 * r;
        const angleRad = (az - 180 + rotateOffset) * Math.PI / 180;
        const x = cxp + dist * Math.sin(angleRad);
        const y = cyp - dist * Math.cos(angleRad);
        const onScreen = x > -30 && x < w + 30 && y > -30 && y < h + 30 && dist < r * 1.3;
        return { x, y, dist, onScreen, z3d: 1 };
    }
}

let lastStarPositions = [];
let lastPlanetPositions = [];

function getStarColor(temp) {
    if (temp > 30000) return {r:155,g:176,b:255};
    if (temp > 10000) return {r:170,g:191,b:255};
    if (temp > 7500) return {r:200,g:220,b:255};
    if (temp > 6000) return {r:255,g:255,b:255};
    if (temp > 5200) return {r:255,g:255,b:200};
    if (temp > 3700) return {r:255,g:230,b:150};
    return {r:255,g:180,b:120};
}

function getSkyGradient(ctx, w, h, sunAlt) {
    let t = (sunAlt + 15) / 30; 
    t = Math.max(0, Math.min(1, t)); 
    
    const rT = Math.round(6 + (26 - 6)*t);
    const gT = Math.round(10 + (75 - 10)*t);
    const bT = Math.round(18 + (140 - 18)*t);
    
    let rB, gB, bB;
    if (t < 0.5) {
        const t2 = t * 2; 
        rB = Math.round(6 + (217 - 6)*t2);
        gB = Math.round(10 + (118 - 10)*t2);
        bB = Math.round(18 + (67 - 18)*t2);
    } else {
        const t2 = (t - 0.5) * 2; 
        rB = Math.round(217 + (96 - 217)*t2);
        gB = Math.round(118 + (157 - 118)*t2);
        bB = Math.round(67 + (214 - 67)*t2);
    }
    
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `rgb(${rT}, ${gT}, ${bT})`);
    grad.addColorStop(1, `rgb(${rB}, ${gB}, ${bB})`);
    return grad;
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

function drawMap() {
    try {
    const w = canvas.width / Math.min(window.devicePixelRatio, 2);
    const h = canvas.height / Math.min(window.devicePixelRatio, 2);
    const cx = w/2 + panX;
    const cy = h/2 + panY;
    const r = Math.min(w/2, h/2) * 0.85 * zoomLevel;
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
            const precessed = precessStarToDate(blob.raHrs * 15, blob.dec, astroTime);
            const hor = Astronomy.Horizon(astroTime, observer, precessed.ra, precessed.dec, dynamicRefraction);
            if (hor.altitude < 0.0) return; 
            const proj = projectAz(hor.altitude, hor.azimuth);
            if (!proj.onScreen) return;
            const horizonFade = Math.min(1, Math.max(0, (hor.altitude) / 15));
            if (horizonFade <= 0) return;
            
            const blobRadius = blob.sizeDeg * pixelPerDeg * (arMode ? 1 : zoomLevel);
            let finalAlpha = blob.alpha * horizonFade * mwFader;
            if (arMode) finalAlpha = Math.min(1.0, finalAlpha * 3.5); 
            
            const g = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, blobRadius);
            g.addColorStop(0, `rgba(${blob.color}, ${finalAlpha})`);
            g.addColorStop(1, `rgba(${blob.color}, 0)`);
            
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, blobRadius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        const mwTime = Date.now() * 0.001;
        ctx.save();
        ctx.fillStyle = 'white';
        MW_STARS.forEach(star => {
            const precessed = precessStarToDate(star.raHrs * 15, star.dec, astroTime);
            const hor = Astronomy.Horizon(astroTime, observer, precessed.ra, precessed.dec, dynamicRefraction);
            if (hor.altitude < 0.0) return; 
            const proj = projectAz(hor.altitude, hor.azimuth);
            if (!proj.onScreen) return;

            const horizonFade = Math.min(1, Math.max(0, hor.altitude / 10));
            const shimmer = 0.6 + 0.4 * Math.sin(mwTime * star.blinkSpd + star.blinkOff);
            
            let finalAlpha = star.baseAlpha * horizonFade * mwFader * shimmer;
            if (arMode) finalAlpha = Math.min(1.0, finalAlpha * 2.0);
            if (finalAlpha <= 0) return;

            ctx.globalAlpha = finalAlpha;
            const starRadius = star.sizeDeg * (arMode ? 1.0 : zoomLevel);
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, starRadius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    const planetPositions = [];

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
    
    planetNamesToDraw.forEach(p => {
        try {
            const body = Astronomy.Body[p.n];
            if (!body) return;
            const equ = Astronomy.Equator(body, astroTime, observer, true, true);
            const hor = Astronomy.Horizon(astroTime, observer, equ.ra, equ.dec, dynamicRefraction);
            const proj = projectAz(hor.altitude, hor.azimuth);
            planetPositions.push({ ...p, name: p.n, alt: hor.altitude, az: hor.azimuth, ...proj, isPlanet: true, isMoon: false });
        } catch(e) {}
    });

    try {
        const moonEqu = Astronomy.Equator('Moon', astroTime, observer, true, true);
        const moonHor = Astronomy.Horizon(astroTime, observer, moonEqu.ra, moonEqu.dec, dynamicRefraction);
        const moonProj = projectAz(moonHor.altitude, moonHor.azimuth);
        
        if (moonProj.onScreen && moonHor.altitude >= -5) {
            const moonIllum = Astronomy.Illumination('Moon', astroTime);
            const moonPhaseAngle = ((Astronomy.MoonPhase(astroTime) % 360) + 360) % 360;
            
            planetPositions.push({
                name: 'Moon', c: '#f4f4ec', desc: `Phase: ${Math.round(moonIllum.phase_fraction * 100)}% illuminated`, type:'moon',
                isPlanet: false, isMoon: true,
                alt: moonHor.altitude, az: moonHor.azimuth, ...moonProj,
                mp: moonPhaseAngle, phase_frac: moonIllum.phase_fraction
            });
        }
    } catch(e) {}

    lastPlanetPositions = planetPositions;

    const starPositions = BRIGHT_STARS.map(star => {
        const precessed = precessStarToDate(star.ra, star.dec, astroTime);
        const hor = Astronomy.Horizon(astroTime, observer, precessed.ra, precessed.dec, dynamicRefraction);
        const proj = projectAz(hor.altitude, hor.azimuth);
        return { ...star, alt: hor.altitude, az: hor.azimuth, ...proj, isDso: false };
    });

    const dsoPositions = DSO_OBJECTS.map(obj => {
        const precessed = precessStarToDate(obj.ra, obj.dec, astroTime);
        const hor = Astronomy.Horizon(astroTime, observer, precessed.ra, precessed.dec, dynamicRefraction);
        const proj = projectAz(hor.altitude, hor.azimuth);
        return { ...obj, alt: hor.altitude, az: hor.azimuth, ...proj, isDso: true };
    });

    lastStarPositions = [...starPositions, ...dsoPositions];

    if (showConstellations) {
        let constAlpha = arMode ? 0.45 : (0.12 * starDimFactor);
        ctx.strokeStyle = `rgba(201,169,110,${constAlpha})`;
        ctx.lineWidth = arMode ? 1.5 : 0.8;
        CONSTELLATION_LINES.forEach(([n1, n2]) => {
            const s1 = starPositions.find(s => s.name === n1);
            const s2 = starPositions.find(s => s.name === n2);
            if (!s1 || !s2) return;
            if (s1.alt >= 0.0 && s2.alt >= 0.0 && s1.onScreen && s2.onScreen && (!arMode || (s1.z3d > 0.01 && s2.z3d > 0.01))) {
                ctx.beginPath(); ctx.moveTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y); ctx.stroke();
            }
        });
    }

    dsoPositions.forEach(obj => {
        if (!obj.onScreen || obj.alt < 0.0) return;
        const horizonFade = obj.alt < 10 ? Math.max(0, obj.alt / 10) : 1;
        if (horizonFade <= 0) return;
        const zoomVal = arMode ? arZoomLevel : zoomLevel;
        const size = Math.max(4, obj.sizeDeg * zoomVal * 3);

        let dsoAlpha = Math.min(0.6, Math.max(0.15, (8 - obj.mag) / 8));
        if (arMode) dsoAlpha = Math.min(1.0, dsoAlpha * 2.5);
        const alpha = dsoAlpha * horizonFade * (arMode ? 1.0 : starDimFactor);
        const vis = obj._vis;

        // Only render fine eyepiece-style detail once the object is big enough on
        // screen for it to read as structure rather than noise — cheap at low zoom
        // (falls back to a simple soft glow, same cost as before), detailed once zoomed in.
        const detailed = vis && size > 7;

        if (obj.type === 'galaxy') {
            const color = vis ? vis.hue : '201,169,110';
            if (detailed) {
                ctx.save();
                ctx.translate(obj.x, obj.y);
                ctx.rotate(vis.posAngle * Math.PI / 180);
                ctx.scale(1, Math.max(0.18, vis.axisRatio));
                const g = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
                g.addColorStop(0, `rgba(${color},${Math.min(1, alpha * 1.4)})`);
                g.addColorStop(0.25, `rgba(${color},${alpha * 0.75})`);
                g.addColorStop(0.6, `rgba(${color},${alpha * 0.28})`);
                g.addColorStop(1, `rgba(${color},0)`);
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();
                // brighter core/nucleus
                ctx.fillStyle = `rgba(255,250,235,${Math.min(0.9, alpha * 1.1)})`;
                ctx.beginPath(); ctx.arc(0, 0, Math.max(1, size * 0.12), 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            } else {
                const g = ctx.createRadialGradient(obj.x, obj.y, 0, obj.x, obj.y, size);
                g.addColorStop(0, `rgba(${color},${alpha * 0.7})`);
                g.addColorStop(0.5, `rgba(${color},${alpha * 0.3})`);
                g.addColorStop(1, `rgba(${color},0)`);
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(obj.x, obj.y, size, 0, Math.PI * 2); ctx.fill();
            }
        } else if (obj.type === 'nebula') {
            const color = vis ? vis.hue : '120,180,200';
            if (detailed) {
                vis.blobs.forEach(b => {
                    const bx = obj.x + b.dx * size;
                    const by = obj.y + b.dy * size;
                    const br = size * b.rScale;
                    const ba = alpha * b.aScale;
                    const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
                    g.addColorStop(0, `rgba(${color},${Math.min(1, ba * 0.9)})`);
                    g.addColorStop(0.5, `rgba(${color},${ba * 0.4})`);
                    g.addColorStop(1, `rgba(${color},0)`);
                    ctx.fillStyle = g;
                    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
                });
                if (vis.planetary) {
                    // small glowing ring shell, the way planetary nebulae actually show up at the eyepiece
                    ctx.strokeStyle = `rgba(${color},${Math.min(1, alpha * 1.3)})`;
                    ctx.lineWidth = Math.max(1, size * 0.18);
                    ctx.beginPath(); ctx.arc(obj.x, obj.y, size * 0.55, 0, Math.PI * 2); ctx.stroke();
                }
            } else {
                const g = ctx.createRadialGradient(obj.x, obj.y, 0, obj.x, obj.y, size);
                g.addColorStop(0, `rgba(${color},${alpha * 0.7})`);
                g.addColorStop(0.5, `rgba(${color},${alpha * 0.3})`);
                g.addColorStop(1, `rgba(${color},0)`);
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(obj.x, obj.y, size, 0, Math.PI * 2); ctx.fill();
            }
        } else {
            // clusters
            const color = '180,160,220';
            if (detailed) {
                if (vis.globular) {
                    const g = ctx.createRadialGradient(obj.x, obj.y, 0, obj.x, obj.y, size);
                    g.addColorStop(0, `rgba(255,248,230,${Math.min(1, alpha * 1.2)})`);
                    g.addColorStop(0.35, `rgba(${color},${alpha * 0.55})`);
                    g.addColorStop(1, `rgba(${color},0)`);
                    ctx.fillStyle = g;
                    ctx.beginPath(); ctx.arc(obj.x, obj.y, size, 0, Math.PI * 2); ctx.fill();
                }
                ctx.fillStyle = `rgba(255,255,255,${Math.min(1, alpha * 1.3)})`;
                vis.dots.forEach(d => {
                    const dxp = obj.x + d.dx * size;
                    const dyp = obj.y + d.dy * size;
                    const dr = Math.max(0.5, size * 0.09 * d.sizeRel);
                    ctx.globalAlpha = Math.min(1, alpha * 1.3 * d.briRel);
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
    starPositions.forEach(star => {
        if (!star.onScreen || star.alt < 0.0) return;
        const horizonFade = star.alt < 10 ? Math.max(0, star.alt / 10) : 1;
        if (horizonFade <= 0) return;

        const t = Date.now() * 0.001;
        const noise = Math.sin(t * 2.1 + star.ra) * Math.cos(t * 3.7 + star.dec) + Math.sin(t * 1.3 + (star.dist || 0));
        const magFactor = Math.max(0, 0.12 - (star.mag * 0.02));
        const altFactor = Math.max(1, Math.min(1.8, 40 / Math.max(2, star.alt)));
        const twinkle = 1.0 + ((noise * 0.5) * magFactor * altFactor);

        let size;
        if (star.mag < -0.5) size = 7.0; 
        else if (star.mag < 0) size = 6.0;
        else if (star.mag < 0.5) size = 5.0;
        else if (star.mag < 1) size = 4.0; 
        else if (star.mag < 1.5) size = 3.2;
        else if (star.mag < 2) size = 2.5; 
        else if (star.mag < 2.5) size = 2.0;
        else if (star.mag < 3) size = 1.6;
        else if (star.mag < 3.5) size = 1.3;
        else if (star.mag < 4) size = 1.1;
        else if (star.mag < 4.5) size = 0.9;
        else if (star.mag < 5) size = 0.8;
        else if (star.mag < 5.5) size = 0.7;
        else size = 0.6;

        if (arMode) size *= 1.6 * arZoomLevel;

        let baseAlpha = Math.min(1, Math.max(0.25, (5.5 - star.mag) / 5.5));
        if (arMode) baseAlpha = Math.min(1.0, baseAlpha * 1.5);
        const alpha = baseAlpha * horizonFade * twinkle * (arMode ? 1.0 : starDimFactor);
        const col = getStarColor(star.temp);

        if (star.alt >= 0) {
            let glowFactor, glowAlpha;
            // Enhanced true-to-life glow scaling based on magnitude
            if (star.mag < -1) { glowFactor = 6.0; glowAlpha = 0.40; }
            else if (star.mag < 0) { glowFactor = 4.0; glowAlpha = 0.30; }
            else if (star.mag < 1) { glowFactor = 2.0; glowAlpha = 0.20; } 
            else if (star.mag < 2) { glowFactor = 1.0; glowAlpha = 0.10; } 
            else if (star.mag < 3) { glowFactor = 0.5; glowAlpha = 0.05; } 
            else { glowFactor = 1.5; glowAlpha = 0.03; }

            if (arMode) {
                glowFactor *= 1.5; 
                glowAlpha = Math.min(0.8, glowAlpha * 1.5); 
            }

            const glowSize = size * glowFactor;
            const finalGlowAlpha = alpha * glowAlpha;
            
            if (finalGlowAlpha > 0.01) {
                const g = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowSize);
                g.addColorStop(0, `rgba(${col.r},${col.g},${col.b},${finalGlowAlpha})`);
                g.addColorStop(0.3, `rgba(${col.r},${col.g},${col.b},${finalGlowAlpha * 0.4})`);
                g.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(star.x, star.y, glowSize, 0, Math.PI * 2); ctx.fill();
            }
        }

        ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${alpha})`;
        ctx.beginPath(); ctx.arc(star.x, star.y, size, 0, Math.PI * 2); ctx.fill();

        // Diffraction spikes: the cross-shaped flare seen around the brightest stars
        // through a real telescope. Limited to bright stars, and only once zoomed in
        // enough to matter, so it costs nothing on the default wide view.
        const currentZoomForSpikes = arMode ? arZoomLevel : zoomLevel;
        if (star.mag < 0.8 && currentZoomForSpikes > 1.6) {
            const spikeLen = size * (5 + currentZoomForSpikes * 1.2);
            const spikeAlpha = alpha * 0.35;
            if (spikeAlpha > 0.02) {
                ctx.save();
                ctx.translate(star.x, star.y);
                ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${spikeAlpha})`;
                ctx.lineWidth = Math.max(0.5, size * 0.12);
                [0, Math.PI / 2].forEach(rot => {
                    const g2 = ctx.createLinearGradient(-spikeLen * Math.cos(rot), -spikeLen * Math.sin(rot), spikeLen * Math.cos(rot), spikeLen * Math.sin(rot));
                    g2.addColorStop(0, 'rgba(255,255,255,0)');
                    g2.addColorStop(0.5, `rgba(${col.r},${col.g},${col.b},${spikeAlpha})`);
                    g2.addColorStop(1, 'rgba(255,255,255,0)');
                    ctx.strokeStyle = g2;
                    ctx.beginPath();
                    ctx.moveTo(-spikeLen * Math.cos(rot), -spikeLen * Math.sin(rot));
                    ctx.lineTo(spikeLen * Math.cos(rot), spikeLen * Math.sin(rot));
                    ctx.stroke();
                });
                ctx.restore();
            }
        }
    });

    planetPositions.forEach(p => {
        if (!p.onScreen || p.alt < 0.0 || p.isSun) return; 
        const horizonFade = p.alt < 10 ? Math.max(0, p.alt / 10) : 1;
        if (horizonFade <= 0) return;

        ctx.save();
        ctx.translate(p.x, p.y);

        if (p.isMoon) {
            const baseSize = 9 * (arMode ? arZoomLevel : zoomLevel); 
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
        } else if (p.name === 'Mars') {
            ctx.save();
            ctx.beginPath(); ctx.arc(0, 0, baseSize, 0, Math.PI * 2); ctx.clip();
            ctx.fillStyle = `rgba(120, 60, 40, ${0.3 * alphaFade})`;
            ctx.beginPath(); ctx.ellipse(-baseSize * 0.2, baseSize * 0.15, baseSize * 0.55, baseSize * 0.4, 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = `rgba(255, 255, 255, ${0.55 * alphaFade})`;
            ctx.beginPath(); ctx.arc(0, -baseSize * 0.72, baseSize * 0.42, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else if (p.name === 'Venus') {
            ctx.fillStyle = `rgba(6, 10, 18, ${0.6 * alphaFade})`;
            ctx.beginPath(); ctx.arc(-baseSize * 0.3, 0, baseSize * 0.85, 0, Math.PI * 2); ctx.fill();
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
    if (starDimFactor > 0.1) {
        // 1. Stars get first dibs on screen space
        const starLimit = arMode ? 60 : 12; 
        const labeledStars = starPositions
            .filter(s => s.onScreen && s.alt >= 0.0)
            .sort((a, b) => a.mag - b.mag)
            .slice(0, starLimit);
        
        labeledStars.forEach((star) => {
            const horizonFade = star.alt < 10 ? Math.max(0, star.alt / 10) : 1;
            // INCREASED font size (16px map / 22px AR) and weight for clarity
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

    if (starDimFactor > 0.1 && !arMode) {
        const seed = 42;
        for (let i = 0; i < 350; i++) {
            const sx = (Math.sin(i * 127.1 + seed) * 0.5 + 0.5) * w;
            const sy = (Math.cos(i * 311.7 + seed) * 0.5 + 0.5) * h;
            const br = (Math.sin(i * 74.3) * 0.5 + 0.5) * 0.4 + 0.05;
            const twinkle = Math.sin(Date.now() * 0.001 + i) * 0.15 + 0.85;
            ctx.fillStyle = `rgba(255,255,255,${br * twinkle * starDimFactor})`;
            ctx.beginPath(); ctx.arc(sx, sy, 0.6, 0, Math.PI * 2); ctx.fill();
        }
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
        ttName.textContent = closest.name;

        let info = closest.desc;
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