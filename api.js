let suggestionDebounce = null;
let activeSuggestionIndex = -1;
const cityInput = document.getElementById('cityInput');
const suggestionsBox = document.getElementById('searchSuggestions');

cityInput.addEventListener('input', () => {
    clearTimeout(suggestionDebounce);
    const val = cityInput.value.trim();
    if (val.length < 2) { suggestionsBox.classList.remove('visible'); return; }
    suggestionDebounce = setTimeout(() => fetchSuggestions(val), 300);
});

cityInput.addEventListener('keydown', e => {
    const items = suggestionsBox.querySelectorAll('.suggestion-item');
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, items.length - 1);
        updateActiveSuggestion(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, -1);
        updateActiveSuggestion(items);
    } else if (e.key === 'Enter') {
        if (activeSuggestionIndex >= 0 && items[activeSuggestionIndex]) {
            e.preventDefault();
            items[activeSuggestionIndex].click();
        } else {
            searchCity();
        }
    } else if (e.key === 'Escape') {
        suggestionsBox.classList.remove('visible');
        activeSuggestionIndex = -1;
    }
});

document.addEventListener('click', e => {
    if (!cityInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.classList.remove('visible');
    }
});

function updateActiveSuggestion(items) {
    items.forEach((item, i) => item.classList.toggle('active', i === activeSuggestionIndex));
    if (activeSuggestionIndex >= 0 && items[activeSuggestionIndex]) items[activeSuggestionIndex].scrollIntoView({ block: 'nearest' });
}

async function fetchSuggestions(query) {
    try {
        const searchQuery = query.includes(',') ? query.split(',')[0].trim() : query;
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=10&language=en&format=json`);
        const data = await res.json();
        if (!data.results || data.results.length === 0) { suggestionsBox.classList.remove('visible'); return; }
        suggestionsBox.innerHTML = '';
        data.results.forEach((r, i) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            if (i === 0) item.classList.add('active');
            const flag = getFlagEmoji(r.country_code);
            const detail = [r.admin1, r.country].filter(Boolean).join(', ');
            item.innerHTML = `<span class="suggestion-flag">${flag}</span><div style="flex:1;min-width:0;"><div class="suggestion-name">${r.name}</div><div class="suggestion-detail">${detail}</div></div>`;
            item.onclick = () => {
                lat = r.latitude; lon = r.longitude;
                isGpsLocation = false;
                cityName = r.name + (r.admin1 ? ', ' + r.admin1 : '') + (r.country ? ', ' + r.country : '');
                cityInput.value = r.name;
                suggestionsBox.classList.remove('visible');
                document.getElementById('locName').textContent = cityName;
                document.getElementById('arUiLoc').textContent = cityName.split(',')[0].substring(0, 15);
                document.getElementById('searchStatus').textContent = `Set to ${r.name}${r.country ? ' (' + r.country + ')' : ''}`;
                document.getElementById('searchStatus').className = 'search-status success';
                resetSunToggle();
                fetchWeather(); updateAll();
            };
            suggestionsBox.appendChild(item);
        });
        activeSuggestionIndex = 0;
        suggestionsBox.classList.add('visible');
    } catch (e) { suggestionsBox.classList.remove('visible'); }
}

function getFlagEmoji(countryCode) {
    if (!countryCode) return '🌍';
    const code = countryCode.toUpperCase();
    return String.fromCodePoint(...[...code].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

async function searchCity() {
    const input = cityInput.value.trim();
    const status = document.getElementById('searchStatus');
    const btn = document.getElementById('searchBtn');
    if (!input) return;
    btn.disabled = true;
    status.textContent = 'Searching...';
    status.className = 'search-status';
    document.getElementById('starCanvas').classList.add('switching');
    suggestionsBox.classList.remove('visible');
    try {
        const searchQuery = input.includes(',') ? input.split(',')[0].trim() : input;
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=en&format=json`);
        const data = await res.json();
        if (!data.results || data.results.length === 0) {
            status.textContent = 'No city found. Try searching just the city name.';
            status.className = 'search-status error';
            btn.disabled = false;
            document.getElementById('starCanvas').classList.remove('switching');
            return;
        }
        let best = data.results[0];
        for (const r of data.results) { if (r.name.toLowerCase() === input.toLowerCase()) { best = r; break; } }
        lat = best.latitude; lon = best.longitude;
        isGpsLocation = false;
        cityName = best.name + (best.admin1 ? ', ' + best.admin1 : '') + (best.country ? ', ' + best.country : '');
        status.textContent = `Set to ${best.name}${best.country ? ' (' + best.country + ')' : ''} [${lat.toFixed(5)}, ${lon.toFixed(5)}]`;
        status.className = 'search-status success';
        document.getElementById('locName').textContent = cityName;
        document.getElementById('arUiLoc').textContent = cityName.split(',')[0].substring(0, 15);
        resetSunToggle();
        await fetchWeather(); updateAll();
        setTimeout(() => document.getElementById('starCanvas').classList.remove('switching'), 300);
    } catch (e) {
        status.textContent = 'Network error. Please try again.';
        status.className = 'search-status error';
        document.getElementById('starCanvas').classList.remove('switching');
    }
    btn.disabled = false;
}

// Open-Meteo's geocoding API only does forward (name -> coords) search, so
// feeding it coordinates never reliably resolves a place name. BigDataCloud's
// "reverse-geocode-client" endpoint is free, needs no API key, is CORS-enabled
// for browser use, and is built exactly for this: coords -> place name.
async function reverseGeocode(latVal, lonVal) {
    try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latVal}&longitude=${lonVal}&localityLanguage=en`);
        const data = await res.json();
        const place = data.city || data.locality;
        if (!place) return null;
        const parts = [place];
        if (data.principalSubdivision && data.principalSubdivision !== place) parts.push(data.principalSubdivision);
        if (data.countryName) parts.push(data.countryName);
        return parts.join(', ');
    } catch (e) {
        return null;
    }
}

function detectLocation() {
    const status = document.getElementById('searchStatus');
    if (!navigator.geolocation) { status.textContent = 'Geolocation not supported.'; status.className = 'search-status error'; return; }
    status.textContent = 'Detecting...'; status.className = 'search-status';
    navigator.geolocation.getCurrentPosition(
        async pos => {
            lat = pos.coords.latitude; lon = pos.coords.longitude;
            isGpsLocation = true;
            const resolved = await reverseGeocode(lat, lon);
            cityName = resolved || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
            document.getElementById('locName').textContent = cityName;
            document.getElementById('arUiLoc').textContent = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
            status.textContent = `Location: ${cityName}`; status.className = 'search-status success';
            resetSunToggle();
            await fetchWeather(); updateAll();
        },
        err => {
            let msg = 'Location access denied.';
            if (err.code === 1) msg = 'Location permission denied. Please allow location access in your browser settings.';
            else if (err.code === 2) msg = 'Location unavailable. Please try again or search manually.';
            else if (err.code === 3) msg = 'Location request timed out. Please try again.';
            status.textContent = msg;
            status.className = 'search-status error';
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
}

function autoDetectLocation() {
    if (!navigator.geolocation) return;
    setTimeout(() => {
        navigator.geolocation.getCurrentPosition(
            async pos => {
                lat = pos.coords.latitude; lon = pos.coords.longitude;
                isGpsLocation = true;
                const placeName = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
                const resolved = await reverseGeocode(lat, lon);
                cityName = resolved || placeName;
                document.getElementById('cityInput').value = resolved ? resolved.split(',')[0] : placeName;
                document.getElementById('locName').textContent = cityName;
                document.getElementById('arUiLoc').textContent = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
                resetSunToggle();
                await fetchWeather(); updateAll();
            },
            () => { },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }, 500);
}

async function fetchWeather() {
    try {
        // Added surface_pressure to the API request
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,cloud_cover,visibility,surface_pressure&daily=sunrise,sunset&timezone=auto`);
        const data = await res.json();
        
        // Update live environmental globals for the refraction engine
        liveTemp = data.current.temperature_2m || 10;
        livePressure = data.current.surface_pressure || 1010;

        document.getElementById('wTemp').textContent = Math.round(data.current.temperature_2m) + '°';
        document.getElementById('wHum').textContent = data.current.relative_humidity_2m + '%';
        document.getElementById('wCloud').textContent = data.current.cloud_cover + '%';
        document.getElementById('wVis').textContent = (data.current.visibility / 1000).toFixed(1) + 'km';
        const bortle = Math.min(9, Math.max(1, Math.round(5 + data.current.cloud_cover / 25)));
        currentBortle = bortle; 
        document.getElementById('bortleClass').textContent = 'Bortle ' + bortle;
        document.getElementById('bortleFill').style.width = (bortle / 9 * 100) + '%';
        const notes = ['Excellent dark sky — Milky Way casts shadows','Truly dark sky — zodiacal light visible','Rural sky — Milky Way highly structured','Rural/suburban — some light pollution at horizon','Suburban — Milky Way faint but visible','Bright suburban — Milky Way barely visible','Suburban/urban — only bright constellations','City sky — few bright stars visible','Inner city — most stars invisible'];
        document.getElementById('bortleNote').textContent = notes[bortle - 1];
        
        const sunrise = new Date(data.daily.sunrise[0]);
        const sunset = new Date(data.daily.sunset[0]);
        const sr = formatTime(sunrise).replace('UTC ', '');
        const ss = formatTime(sunset).replace('UTC ', '');
        document.getElementById('moonTimes').textContent = `Sunrise UTC ${sr} · Sunset UTC ${ss}`;
    } catch (e) { console.error('Weather error:', e); }
}
// --- FREE ISS LIVE TRACKER LOOP ---
async function updateISSLive() {
    const list = document.getElementById('issList');
    try {
        const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        
        list.innerHTML = `
            <div class="iss-row">
                <div><div class="iss-time">Position</div><div class="iss-meta">${data.latitude.toFixed(4)}°, ${data.longitude.toFixed(4)}°</div></div>
                <div class="iss-mag">${data.altitude.toFixed(1)} km alt</div>
            </div>
            <div class="iss-row">
                <div><div class="iss-time">Velocity</div><div class="iss-meta">Orbital Speed</div></div>
                <div class="iss-mag">${data.velocity.toFixed(0)} km/h</div>
            </div>
        `;
    } catch (e) {
        list.innerHTML = '<div style="color:var(--text-faint);font-size:0.8rem;padding:20px;text-align:center;">Failed to load live ISS data</div>';
    }
}
// ----------------------------------

function populateShowers() {
    const list = document.getElementById('showerList');
    const s = [
        {n:'Perseids',p:'Aug 12',r:'100/hr'},{n:'Geminids',p:'Dec 13',r:'120/hr'},
        {n:'Quadrantids',p:'Jan 3',r:'120/hr'},{n:'Lyrids',p:'Apr 22',r:'18/hr'},
        {n:'Orionids',p:'Oct 21',r:'20/hr'},{n:'Leonids',p:'Nov 17',r:'15/hr'},
    ];
    s.forEach(sh => {
        const d = document.createElement('div');
        d.className = 'shower-row';
        d.innerHTML = `<div><div class="shower-name">${sh.n}</div><div class="shower-when">Peak ${sh.p}</div></div><div class="shower-rate">${sh.r}</div>`;
        list.appendChild(d);
    });
}

async function fetchAPOD() {
    const container = document.getElementById('apodContent');
    try {
       const res = await fetch('data/apod.json');
        if (!res.ok) throw new Error('Failed to load APOD');
        const data = await res.json();
        renderAPOD(data);
    } catch (e) {
        container.innerHTML = `<div style="padding:40px;text-align:center;background:rgba(255,255,255,0.02);border-radius:20px;border:1px solid rgba(255,255,255,0.05);"><div style="font-size:2.5rem;margin-bottom:12px;filter:drop-shadow(0 0 10px rgba(255,255,255,0.3));">🌌</div><div style="color:var(--text-dim);font-size:1rem;margin-bottom:12px;">NASA APOD is temporarily unavailable</div><a href="https://apod.nasa.gov/apod/astropix.html" target="_blank" rel="noopener" style="color:var(--accent);font-size:0.9rem;text-decoration:none;">View today's picture on NASA →</a></div>`;
    }
}

function renderAPOD(data) {
    const container = document.getElementById('apodContent');
    const isVideo = data.media_type === 'video';
    const imgUrl = isVideo ? (data.thumbnail_url || data.url) : data.url;
    const hdUrl = data.hdurl || imgUrl;
    const copyright = data.copyright ? `© ${data.copyright}` : '';
    container.innerHTML = `
        <div class="apod-content">
            <div class="apod-image-wrap">
                <a href="${hdUrl}" target="_blank" rel="noopener">
                    <img src="${imgUrl}" alt="${data.title}" loading="lazy" onerror="this.style.display='none';this.parentElement.innerHTML='<div style=\'padding:60px;text-align:center;color:var(--text-faint)\'>Image unavailable</div>'">
                </a>
                ${isVideo ? `<div class="apod-play">▶</div>` : ''}
            </div>
            <div class="apod-text">
                <div class="apod-title">${data.title}</div>
                <div class="apod-date">${data.date}</div>
                <div class="apod-explanation">${data.explanation}</div>
                ${copyright ? `<div class="apod-copyright">${copyright}</div>` : ''}
                ${isVideo ? `<div style="margin-top:16px;"><a href="${data.url}" target="_blank" rel="noopener" style="color:var(--accent);font-size:0.9rem;text-decoration:none;border-bottom:1px solid rgba(0, 240, 255, 0.4);">Watch video →</a></div>` : ''}
            </div>
        </div>
    `;
}