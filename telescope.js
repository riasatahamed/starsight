// --- MEADE LX200 HIGH PRECISION PROTOCOL ---
let port = null;
let writer = null;
let reader = null;
let keepReading = false;
let telescopeConnected = false;
let telescopeRA = null;
let telescopeDec = null;
let serialBuffer = "";

async function connectTelescope() {
    if (!("serial" in navigator)) {
        alert("Unsupported browser, only works on Chrome or Edge.");
        return;
    }
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        writer = port.writable.getWriter();
        telescopeConnected = true;
        
        document.getElementById('btnTelescope').classList.add('active');
        document.getElementById('btnTelescope').textContent = "LX200 Connected";
        document.getElementById('mapHint').textContent = "Telescope connected. Syncing time & location...";
        
        keepReading = true;
        readSerialLoop();

        await syncTelescopeData();
        setInterval(pollTelescopePosition, 1000); 

        alert("Telescope connected successfully and active polling started.");
    } catch (err) {
        console.error("Serial connection failed:", err);
        alert("Failed to connect to the telescope.");
    }
}

async function sendCommand(cmd) {
    if (!writer) return;
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(cmd));
    await new Promise(r => setTimeout(r, 100)); 
}

async function readSerialLoop() {
    const decoder = new TextDecoder();
    while (port && port.readable && keepReading) {
        reader = port.readable.getReader();
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                serialBuffer += decoder.decode(value, { stream: true });
                processSerialBuffer();
            }
        } catch (error) {
            console.error("Serial read error:", error);
        } finally {
            reader.releaseLock();
        }
    }
}

function processSerialBuffer() {
    let hashIndex;
    while ((hashIndex = serialBuffer.indexOf('#')) !== -1) {
        let msg = serialBuffer.substring(0, hashIndex);
        serialBuffer = serialBuffer.substring(hashIndex + 1);
        parseTelescopeMessage(msg);
    }
}

function parseTelescopeMessage(msg) {
    const raMatch = msg.match(/^(\d{2}):(\d{2}):(\d{2})$/);
    if (raMatch) {
        const h = parseFloat(raMatch[1]);
        const m = parseFloat(raMatch[2]);
        const s = parseFloat(raMatch[3]);
        telescopeRA = (h + m/60 + s/3600) * 15; 
    }
    const decMatch = msg.match(/^([\+\-])(\d{2})\*(\d{2})(?::(\d{2}))?$/);
    if (decMatch) {
        const sign = decMatch[1] === '-' ? -1 : 1;
        const d = parseFloat(decMatch[2]);
        const m = parseFloat(decMatch[3]);
        const s = decMatch[4] ? parseFloat(decMatch[4]) : 0;
        telescopeDec = sign * (d + m/60 + s/3600);
    }
}

async function pollTelescopePosition() {
    if (!telescopeConnected) return;
    await sendCommand(":GR#");
    await sendCommand(":GD#");
}

async function syncTelescopeData() {
    const now = new Date();
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    const ss = String(now.getUTCSeconds()).padStart(2, '0');
    await sendCommand(`:SG${hh}:${mm}:${ss}#`);

    const mo = String(now.getUTCMonth() + 1).padStart(2, '0');
    const da = String(now.getUTCDate()).padStart(2, '0');
    const yr = String(now.getUTCFullYear()).slice(-2);
    await sendCommand(`:SC${mo}/${da}/${yr}#`);

    const latDeg = Math.floor(Math.abs(lat));
    const latMin = Math.round((Math.abs(lat) - latDeg) * 60);
    const latSign = lat >= 0 ? '+' : '-';
    await sendCommand(`:St${latSign}${String(latDeg).padStart(2, '0')}*${String(latMin).padStart(2, '0')}#`);

    let lonWest = -lon;
    if (lonWest < 0) lonWest += 360;
    const lonDeg = Math.floor(lonWest);
    const lonMin = Math.round((lonWest - lonDeg) * 60);
    await sendCommand(`:Sg${String(lonDeg).padStart(3, '0')}*${String(lonMin).padStart(2, '0')}#`);
}

// --- HIGH PRECISION: Proper Motion + Precession to JNow ---
function precessStarToDate(raDegJ2000, decDegJ2000, astroTime, pmRa_mas = 0, pmDec_mas = 0) {
    const yearsSinceJ2000 = astroTime.tt / 365.25; 
    
    const raAdjusted = raDegJ2000 + (pmRa_mas / 3600000) * yearsSinceJ2000;
    const decAdjusted = decDegJ2000 + (pmDec_mas / 3600000) * yearsSinceJ2000;

    const sphere = new Astronomy.Spherical(decAdjusted, raAdjusted, 1.0);
    const vecJ2000 = Astronomy.VectorFromSphere(sphere, astroTime);
    const rot = Astronomy.Rotation_EQJ_EQD(astroTime);
    const vecDate = Astronomy.RotateVector(rot, vecJ2000);
    const sph = Astronomy.SphereFromVector(vecDate);

    return { ra: sph.lon / 15, dec: sph.lat };
}

function formatRA(raDecimal) {
    let h = Math.floor(raDecimal / 15);
    let mDec = ((raDecimal / 15) - h) * 60;
    let m = Math.floor(mDec);
    let s = Math.round((mDec - m) * 60); 
    if (s >= 60) { s = 0; m += 1; }
    if (m >= 60) { m = 0; h += 1; }
    if (h >= 24) h -= 24;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDec(decDecimal) {
    let sign = decDecimal < 0 ? '-' : '+';
    let absDec = Math.abs(decDecimal);
    let d = Math.floor(absDec);
    let mDec = (absDec - d) * 60;
    let m = Math.floor(mDec);
    let s = Math.round((mDec - m) * 60); 
    if (s >= 60) { s = 0; m += 1; }
    if (m >= 60) { m = 0; d += 1; }
    return `${sign}${d.toString().padStart(2, '0')}*${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

async function slewToTarget(target) {
    if (!telescopeConnected) {
        alert("Connect the telescope first!");
        return;
    }
    
    const now = getSimTime();
    const astroTime = Astronomy.MakeTime(now);
    
    const pmRa = target.pmRa || 0;
    const pmDec = target.pmDec || 0;
    
    const jNow = precessStarToDate(target.ra, target.dec, astroTime, pmRa, pmDec);
    
    const raStr = formatRA(jNow.ra);
    const decStr = formatDec(jNow.dec);
    
    try {
        await sendCommand(`:Sr ${raStr}#`);
        await sendCommand(`:Sd ${decStr}#`);
        await sendCommand(`:MS#`);
        document.getElementById('mapHint').textContent = `Slewing to ${target.name} (JNow)...`;
    } catch (e) {
        console.error("Slew error:", e);
    }
}

// --- ACTIVE PLATE SOLVING CALIBRATION LOOP ---
async function handlePlateSolve(file) {
    if (!file) return;

    let apiKey = localStorage.getItem('astrometry_api_key');
    if (!apiKey) {
        apiKey = prompt("Please enter your Astrometry.net API key for plate solving:");
        if (!apiKey) {
            document.getElementById('mapHint').textContent = "Plate solve cancelled (API key required).";
            document.getElementById('plateSolveInput').value = '';
            return;
        }
        localStorage.setItem('astrometry_api_key', apiKey.trim());
    }
    
    document.getElementById('mapHint').textContent = "Uploading image for plate solving...";
    
    // Using a free CORS proxy to bypass browser security blocks
    // Example:
const CORS_PROXY = "https://astrometry-proxy.riasatahamed007.workers.dev/?url=";
    
    try {
        const loginForm = new FormData();
        loginForm.append('request-json', JSON.stringify({ apikey: apiKey }));
        
        // Wrapped the Astrometry URL in the proxy URL
        const loginRes = await fetch(CORS_PROXY + encodeURIComponent('https://nova.astrometry.net/api/login'), {
            method: 'POST',
            body: loginForm
        });
        const loginData = await loginRes.json();
        
        if (loginData.status !== "success") {
            localStorage.removeItem('astrometry_api_key');
            throw new Error("Authentication failed. Invalid API key.");
        }
        
        const session = loginData.session;

        const uploadForm = new FormData();
        uploadForm.append('request-json', JSON.stringify({
            session: session,
            allow_commercial_use: 'd',
            allow_modifications: 'd',
            publicly_visible: 'n'
        }));
        uploadForm.append('file', file);

        // Wrapped the Astrometry upload URL in the proxy URL
        const uploadRes = await fetch(CORS_PROXY + encodeURIComponent('https://nova.astrometry.net/api/upload'), {
            method: 'POST',
            body: uploadForm
        });
        const uploadData = await uploadRes.json();
        
        if (uploadData.status === "success") {
            document.getElementById('mapHint').textContent = `Solving (ID: ${uploadData.subid})...`;
            pollPlateSolveStatus(uploadData.subid);
        } else {
            throw new Error("Upload failed");
        }
    } catch (e) {
        console.error("Detailed Plate Solve Error:", e);
        alert("Plate solving error: Check the F12 Console for details. (If CORS proxy failed, it may be overloaded).");
        document.getElementById('mapHint').textContent = "Plate solve failed.";
    }
    document.getElementById('plateSolveInput').value = '';
}

// Update the polling function to use the proxy as well
async function pollPlateSolveStatus(subid) {
    const CORS_PROXY = "https://astrometry-proxy.riasatahamed007.workers.dev/?url=";
    
    const interval = setInterval(async () => {
        try {
            const statRes = await fetch(CORS_PROXY + encodeURIComponent(`https://nova.astrometry.net/api/submissions/${subid}`));
            const statData = await statRes.json();
            
            if (statData.jobs && statData.jobs.length > 0) {
                const jobId = statData.jobs[0];
                const jobRes = await fetch(CORS_PROXY + encodeURIComponent(`https://nova.astrometry.net/api/jobs/${jobId}`));
                const jobData = await jobRes.json();
                
                if (jobData.status === 'success') {
                    clearInterval(interval);
                    const calRes = await fetch(CORS_PROXY + encodeURIComponent(`https://nova.astrometry.net/api/jobs/${jobId}/calibration`));
                    const calData = await calRes.json();
                    document.getElementById('mapHint').textContent = "Solve complete! Syncing telescope...";
                    syncTelescopeToSolvedCoordinates(calData.ra, calData.dec);
                } else if (jobData.status === 'failure') {
                    clearInterval(interval);
                    document.getElementById('mapHint').textContent = "Plate solve failed to find match.";
                }
            }
        } catch (e) {
            console.error("Polling error", e);
        }
    }, 5000); 
}

async function syncTelescopeToSolvedCoordinates(ra, dec) {
    if (!telescopeConnected) {
        alert(`Plate solved at RA: ${ra.toFixed(4)}, Dec: ${dec.toFixed(4)}. Connect LX200 to sync.`);
        return;
    }
    const raStr = formatRA(ra);
    const decStr = formatDec(dec);
    await sendCommand(`:Sr ${raStr}#`);
    await sendCommand(`:Sd ${decStr}#`);
    await sendCommand(`:CM#`); 
    document.getElementById('mapHint').textContent = "Telescope synchronized to solved position.";
}