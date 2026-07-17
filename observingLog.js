// --- OBSERVING LOG ---
// Stored client-side only (localStorage) since this app has no backend.
// Export/Import let people back up or move their log between browsers/devices.
const OBSERVING_LOG_KEY = 'starsight_observing_log';

function loadObservingLog() {
    try {
        const raw = localStorage.getItem(OBSERVING_LOG_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn('Observing log unavailable (localStorage blocked or corrupted).', e);
        return [];
    }
}

function saveObservingLogEntries(entries) {
    try {
        localStorage.setItem(OBSERVING_LOG_KEY, JSON.stringify(entries));
        return true;
    } catch (e) {
        console.warn('Could not save observing log.', e);
        return false;
    }
}

function updateLogLastViewedPreview() {
    const el = document.getElementById('logLastViewed');
    const btn = document.getElementById('btnLogLast');
    if (!el || !btn || !lastInspectedObject) return;
    el.textContent = `Ready to log: ${lastInspectedObject.name}`;
    btn.disabled = false;
}

function addObservingLogEntry(name, notes, extra) {
    extra = extra || {};
    const entries = loadObservingLog();
    const t = getSimTime();
    // GPS-detected sites vary observer-to-observer even within the same city,
    // so we record the exact coordinates. Searched locations use the place
    // name instead, since that's what the user actually chose.
    const locationLabel = isGpsLocation ? `${lat.toFixed(5)}, ${lon.toFixed(5)}` : cityName;
    entries.unshift({
        id: Date.now() + Math.random().toString(36).slice(2, 7),
        name: name,
        notes: notes || '',
        observedAt: t.toISOString(),
        wasSimulated: timeOffsetMinutes !== 0,
        lat: lat, lon: lon,
        usedGps: isGpsLocation,
        locationLabel: locationLabel,
        alt: extra.alt !== undefined ? Number(extra.alt.toFixed(1)) : undefined,
        mag: extra.mag !== undefined ? Number(extra.mag.toFixed(2)) : undefined,
        loggedAt: new Date().toISOString(),
    });
    saveObservingLogEntries(entries);
    renderObservingLog();
}

function logLastViewed() {
    if (!lastInspectedObject) return;
    addObservingLogEntry(lastInspectedObject.name, '', {
        alt: lastInspectedObject.alt,
        mag: lastInspectedObject.mag,
    });
}

function logManualEntry() {
    const nameInput = document.getElementById('logManualName');
    const notesInput = document.getElementById('logManualNotes');
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    addObservingLogEntry(name, notesInput.value.trim());
    nameInput.value = '';
    notesInput.value = '';
}

function deleteObservingLogEntry(id) {
    const entries = loadObservingLog().filter(e => e.id !== id);
    saveObservingLogEntries(entries);
    renderObservingLog();
}

function renderObservingLog() {
    const list = document.getElementById('logEntries');
    if (!list) return;
    const entries = loadObservingLog();
    if (entries.length === 0) {
        list.innerHTML = '<div style="color:var(--text-faint);font-size:0.8rem;padding:20px;text-align:center;">No observations logged yet.</div>';
        return;
    }
    list.innerHTML = entries.map(e => {
        const d = new Date(e.observedAt);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        let meta = `${dateStr} · ${timeStr}${e.wasSimulated ? ' (planned)' : ''}`;
        const place = e.locationLabel || e.location;
        if (place) meta += ` · ${place}`;
        if (e.alt !== undefined) meta += ` · ${e.alt}° alt`;
        if (e.mag !== undefined) meta += ` · Mag ${e.mag}`;
        const safeName = e.name.replace(/</g, '&lt;');
        const safeNotes = (e.notes || '').replace(/</g, '&lt;');
        return `<div class="log-entry">
            <div class="log-entry-main">
                <div class="log-entry-name">${safeName}</div>
                <div class="log-entry-meta">${meta}</div>
                ${safeNotes ? `<div class="log-entry-notes">${safeNotes}</div>` : ''}
            </div>
            <button class="log-entry-del" onclick="deleteObservingLogEntry('${e.id}')" title="Delete entry">✕</button>
        </div>`;
    }).join('');
}

function exportObservingLog() {
    const entries = loadObservingLog();
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `starsight-observing-log-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function importObservingLog(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const imported = JSON.parse(reader.result);
            if (!Array.isArray(imported)) throw new Error('Not a log file');
            const existing = loadObservingLog();
            const existingIds = new Set(existing.map(e => e.id));
            const merged = existing.concat(imported.filter(e => e && e.id && !existingIds.has(e.id)));
            merged.sort((a, b) => new Date(b.observedAt) - new Date(a.observedAt));
            saveObservingLogEntries(merged);
            renderObservingLog();
        } catch (e) {
            alert('Could not import that file — it doesn\'t look like a StarSight observing log JSON export.');
        }
    };
    reader.readAsText(file);
    document.getElementById('logImportInput').value = '';
}