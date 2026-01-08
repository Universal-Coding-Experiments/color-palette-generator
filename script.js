
(() => {

    const modelSelect = document.getElementById('modelSelect');
    const sizeRange = document.getElementById('sizeRange');
    const generateBtn = document.getElementById('generateBtn');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const paletteGrid = document.getElementById('paletteGrid');
    const toast = document.getElementById('toast');
    const hoverColor = document.getElementById('hoverColor');
    const hoverHex = document.getElementById('hoverHex');
    const hoverContrast = document.getElementById('hoverContrast');
    const gradientBar = document.getElementById('gradientBar');
    const copyAllBtn = document.getElementById('copyAll');
    const savePaletteBtn = document.getElementById('savePalette');
    const savedPalettesList = document.getElementById('savedPalettes');
    const shareBtn = document.getElementById('shareBtn');
    const exportJsonBtn = document.getElementById('exportJson');
    const exportPngBtn = document.getElementById('exportPng');
    const paletteNameEl = document.getElementById('paletteName');
    const exportCanvas = document.getElementById('exportCanvas');


    const state = {
        size: Number(sizeRange?.value || 5),
        model: modelSelect?.value || 'random',
        colors: [],
        locks: [],
        gradientSeed: Date.now() % 1e9,
        name: ''
    };


    const history = [];
    let historyIndex = -1;


    let lastDeletedSaved = null;
    let lastDeletedTimer = null;


    function rand(seed = null) {
        if (seed == null) return Math.random();
        let s = seed >>> 0;
        return function () {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }

    function hslToRgb(h, s, l) {
        s /= 100; l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return { r: Math.round(255 * f(0)), g: Math.round(255 * f(8)), b: Math.round(255 * f(4)) };
    }

    function rgbToHex({ r, g, b }) {
        return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    function hexToRgb(hex) {
        const h = hex.replace('#', '');
        return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
    }

    function contrastRatio(hex) {
        const { r, g, b } = hexToRgb(hex);
        const srgb = [r, g, b].map(v => v / 255).map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
        const L = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
        const whiteL = 1.0;
        const ratio = (Math.max(L, whiteL) + 0.05) / (Math.min(L, whiteL) + 0.05);
        return ratio.toFixed(2);
    }

    function randomHex(randFn = Math.random) {
        return rgbToHex({ r: Math.floor(randFn() * 256), g: Math.floor(randFn() * 256), b: Math.floor(randFn() * 256) });
    }

    function randomName() {
        const adjectives = ['Sunset', 'Neon', 'Velvet', 'Aurora', 'Cyber', 'Retro', 'Muted', 'Vivid', 'Dream', 'Ocean', 'Forest', 'Crimson', 'Golden', 'Electric', 'Pastel'];
        const nouns = ['Glow', 'Palette', 'Wave', 'Pulse', 'Bloom', 'Haze', 'Spectrum', 'Echo', 'Drift', 'Burst', 'Canvas', 'Noir', 'Dawn', 'Dusk', 'Flux'];
        return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
    }


    function generateHarmony(seed, size, model) {
        const randFn = rand(seed) || Math.random;
        const baseHue = Math.floor(randFn() * 360);
        const colors = [];

        if (model === 'random') {
            for (let i = 0; i < size; i++) colors.push(randomHex(randFn));
            return colors;
        }

        if (model === 'monochrome') {
            const sat = 60 + Math.floor(randFn() * 30);
            for (let i = 0; i < size; i++) {
                const l = 30 + Math.floor((i / (size - 1 || 1)) * 50);
                colors.push(rgbToHex(hslToRgb(baseHue, sat, l)));
            }
            return colors;
        }

        if (model === 'analogous') {
            const spread = 30;
            for (let i = 0; i < size; i++) {
                const h = (baseHue + (i - (size - 1) / 2) * spread + 360) % 360;
                const s = 60 + Math.floor(randFn() * 20);
                const l = 40 + Math.floor(randFn() * 20);
                colors.push(rgbToHex(hslToRgb(h, s, l)));
            }
            return colors;
        }

        if (model === 'complementary') {
            const comp = (baseHue + 180) % 360;
            for (let i = 0; i < size; i++) {
                const h = i % 2 === 0 ? baseHue : comp;
                const s = 60 + Math.floor(randFn() * 20);
                const l = 35 + Math.floor((i / (size - 1 || 1)) * 40);
                colors.push(rgbToHex(hslToRgb(h, s, l)));
            }
            return colors;
        }

        if (model === 'triadic') {
            const tri = [baseHue, (baseHue + 120) % 360, (baseHue + 240) % 360];
            for (let i = 0; i < size; i++) {
                const h = tri[i % 3];
                const s = 60 + Math.floor(randFn() * 20);
                const l = 35 + Math.floor(randFn() * 30);
                colors.push(rgbToHex(hslToRgb(h, s, l)));
            }
            return colors;
        }


        for (let i = 0; i < size; i++) colors.push(randomHex(randFn));
        return colors;
    }


    function setCSSVariables(colors) {

        colors.forEach((hex, i) => {
            document.documentElement.style.setProperty(`--color-${i + 1}`, hex);
        });

        if (!colors[0]) document.documentElement.style.setProperty('--color-1', '#333');
        if (!colors[1]) document.documentElement.style.setProperty('--color-2', '#555');
        if (!colors[2]) document.documentElement.style.setProperty('--color-3', '#222');
    }


    function renderPalette(pushHistory = true) {
        paletteGrid.innerHTML = '';
        const colors = state.colors;
        setCSSVariables(colors);
        gradientBar.style.background = `linear-gradient(90deg, ${colors.join(',')})`;

        colors.forEach((hex, idx) => {
            const locked = state.locks[idx] || false;
            const sw = document.createElement('div');
            sw.className = 'palette-swatch';
            sw.innerHTML = `
        <div class="swatch-top" style="background:${hex}"></div>
        <div class="swatch-bottom">
          <div class="hex">${hex}</div>
          <div class="controls-row">
            <button class="lock-btn" data-idx="${idx}">${locked ? '🔒' : '🔓'}</button>
            <button class="copy-btn" data-idx="${idx}">Copy</button>
          </div>
        </div>
      `;


            sw.addEventListener('mouseenter', () => {
                hoverColor.style.background = hex;
                hoverHex.textContent = hex;
                hoverContrast.textContent = `Contrast vs white: ${contrastRatio(hex)}`;
            });


            const copyBtn = sw.querySelector('.copy-btn');
            copyBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await copyToClipboard(hex);
                showToast(`${hex} copied`);
            });


            const lockBtn = sw.querySelector('.lock-btn');
            lockBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const i = Number(e.currentTarget.dataset.idx);
                state.locks[i] = !state.locks[i];

                renderPalette(true);
            });


            sw.addEventListener('click', async () => {
                await copyToClipboard(hex);
                showToast(`${hex} copied`);
            });

            paletteGrid.appendChild(sw);
        });

        if (!state.name) state.name = randomName();
        paletteNameEl.textContent = `Name: ${state.name}`;

        if (pushHistory) snapshot();
    }


    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {

            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            return false;
        }
    }


    function showToast(msg, ms = 1200) {
        if (!toast) return;
        toast.innerHTML = escapeHtml(msg);
        toast.classList.remove('hidden');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => toast.classList.add('hidden'), ms);
    }


    function showToastWithAction(msg, actionLabel, actionCallback, ms = 4000) {
        if (!toast) return;

        toast.innerHTML = '';
        const span = document.createElement('span');
        span.textContent = msg;
        const btn = document.createElement('button');
        btn.textContent = actionLabel;
        btn.className = 'btn small';
        btn.style.marginLeft = '10px';
        btn.addEventListener('click', () => {
            clearTimeout(toast._t);
            toast.classList.add('hidden');
            actionCallback();
        });
        toast.appendChild(span);
        toast.appendChild(btn);
        toast.classList.remove('hidden');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => {
            toast.classList.add('hidden');

            lastDeletedSaved = null;
        }, ms);
    }


    function generatePalette(keepLocks = true) {
        const size = state.size;
        const model = state.model;
        const seed = state.gradientSeed || Date.now();
        const newColors = generateHarmony(seed, size, model);

        if (keepLocks && state.locks.length) {
            const merged = new Array(size);
            for (let i = 0; i < size; i++) {
                merged[i] = state.locks[i] ? (state.colors[i] || newColors[i]) : newColors[i];
            }
            state.colors = merged;
        } else {
            state.colors = newColors;
            state.locks = new Array(size).fill(false);
        }

        state.name = randomName();
        renderPalette(true);
    }

    function snapshot() {
        const entry = {
            colors: state.colors.slice(),
            locks: state.locks.slice(),
            model: state.model,
            size: state.size,
            name: state.name
        };

        if (historyIndex < history.length - 1) history.splice(historyIndex + 1);
        history.push(entry);
        historyIndex = history.length - 1;
        updateUndoRedoButtons();
    }

    function restoreSnapshot(idx) {
        if (idx < 0 || idx >= history.length) return;
        const entry = history[idx];
        state.colors = entry.colors.slice();
        state.locks = entry.locks.slice();
        state.model = entry.model;
        state.size = entry.size;
        state.name = entry.name;
        sizeRange.value = state.size;
        modelSelect.value = state.model;
        renderPalette(false);
        historyIndex = idx;
        updateUndoRedoButtons();
    }

    function undo() {
        if (historyIndex <= 0) return;
        historyIndex--;
        restoreSnapshot(historyIndex);
        showToast('Undo');
    }

    function redo() {
        if (historyIndex >= history.length - 1) return;
        historyIndex++;
        restoreSnapshot(historyIndex);
        showToast('Redo');
    }

    function updateUndoRedoButtons() {
        if (undoBtn) undoBtn.disabled = historyIndex <= 0;
        if (redoBtn) redoBtn.disabled = historyIndex >= history.length - 1;
    }


    function getSaved() {
        try {
            return JSON.parse(localStorage.getItem('palettes') || '[]');
        } catch {
            return [];
        }
    }

    function setSaved(arr) {
        localStorage.setItem('palettes', JSON.stringify(arr.slice(0, 50)));
    }

    function saveCurrentPalette() {
        const saved = getSaved();
        saved.unshift({
            name: state.name || randomName(),
            colors: state.colors.slice(),
            model: state.model,
            date: Date.now()
        });
        setSaved(saved);
        renderSavedList();
        showToast('Palette saved');
    }


    function deleteSavedPalette(index) {
        const saved = getSaved();
        if (index < 0 || index >= saved.length) return;

        lastDeletedSaved = { index, item: saved[index] };

        saved.splice(index, 1);
        setSaved(saved);
        renderSavedList();

        showToastWithAction('Saved palette deleted', 'Undo', () => {

            const cur = getSaved();
            const insertIndex = Math.min(Math.max(0, lastDeletedSaved.index), cur.length);
            cur.splice(insertIndex, 0, lastDeletedSaved.item);
            setSaved(cur);
            renderSavedList();
            showToast('Restore successful');
            lastDeletedSaved = null;
            if (lastDeletedTimer) { clearTimeout(lastDeletedTimer); lastDeletedTimer = null; }
        }, 5000);

        if (lastDeletedTimer) clearTimeout(lastDeletedTimer);
        lastDeletedTimer = setTimeout(() => { lastDeletedSaved = null; lastDeletedTimer = null; }, 5200);
    }

    function renderSavedList() {
        savedPalettesList.innerHTML = '';
        const saved = getSaved();
        saved.forEach((p, idx) => {
            const li = document.createElement('li');
            li.className = 'saved-item';
            li.innerHTML = `
        <div style="flex:1">
          <strong>${escapeHtml(p.name)}</strong>
          <div class="muted small">${new Date(p.date).toLocaleString()}</div>
          <div class="muted small">Model: ${escapeHtml(p.model || 'random')}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          ${p.colors.map(c => `<div class="saved-swatch" style="background:${c}"></div>`).join('')}
          <button class="btn small load" data-idx="${idx}">Load</button>
          <button class="btn small delete" data-idx="${idx}">Delete</button>
        </div>
      `;
            li.querySelector('.load').addEventListener('click', () => {

                state.colors = p.colors.slice();
                state.size = p.colors.length;
                sizeRange.value = state.size;
                state.locks = new Array(state.size).fill(false);
                state.name = p.name;
                state.model = p.model || 'random';
                modelSelect.value = state.model;
                renderPalette(true);
                showToast('Palette loaded');
            });
            li.querySelector('.delete').addEventListener('click', () => deleteSavedPalette(idx));
            savedPalettesList.appendChild(li);
        });
    }


    function buildShareURL() {
        if (!state.colors || !state.colors.length) return null;
        const p = state.colors.map(h => h.replace('#', '')).join(',');
        const n = state.name || '';
        const m = state.model || '';
        const params = new URLSearchParams();
        params.set('p', p);
        if (n) params.set('n', n);
        if (m) params.set('m', m);
        let base;
        try {
            base = (location.origin && location.origin !== 'null') ? location.origin + location.pathname : location.href.split('?')[0].split('#')[0];
        } catch {
            base = location.href.split('?')[0].split('#')[0];
        }
        return `${base}?${params.toString()}`;
    }

    function shareCurrentPalette() {
        const url = buildShareURL();
        if (!url) { showToast('Nothing to share'); return; }
        copyToClipboard(url).then(ok => {
            if (ok) showToast('Share link copied');
            else {
                showToast('Could not copy automatically. Link in console', 3000);
                console.log('Share URL:', url);
            }
        });
    }

    function loadFromURL() {
        try {
            const params = new URLSearchParams(location.search);
            const p = params.get('p');
            const n = params.get('n');
            const m = params.get('m');
            if (!p) return false;
            const raw = decodeURIComponent(p);
            const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
            if (!parts.length) return false;
            const arr = parts.map(s => {
                const clean = s.replace(/^#/, '').trim();
                if (/^[0-9A-Fa-f]{3}$/.test(clean)) return '#' + clean.split('').map(ch => ch + ch).join('').toUpperCase();
                if (/^[0-9A-Fa-f]{6}$/.test(clean)) return '#' + clean.toUpperCase();
                return randomHex();
            });
            state.size = arr.length;
            sizeRange.value = state.size;
            state.colors = arr;
            state.locks = new Array(state.size).fill(false);
            state.name = n ? decodeURIComponent(n) : randomName();
            state.model = m ? decodeURIComponent(m) : (state.model || 'random');
            modelSelect.value = state.model;
            renderPalette(true);
            showToast('Palette loaded from link');
            return true;
        } catch (err) {
            console.error('loadFromURL error', err);
            return false;
        }
    }

    function exportJSON() {
        const data = { name: state.name, colors: state.colors, model: state.model, date: Date.now() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.name.replace(/\s+/g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function exportPNG() {
        const lines = state.colors.length;
        const fontSize = 18;
        const padding = 20;
        const charWidth = fontSize * 0.6;
        const longest = Math.max(...state.colors.map(c => c.length));
        const width = Math.max(400, Math.ceil(longest * charWidth) + padding * 2);
        const height = Math.max(200, lines * (fontSize + 12) + padding * 2);

        const dpr = Math.min(4, Math.max(2, window.devicePixelRatio || 2));
        exportCanvas.width = Math.round(width * dpr);
        exportCanvas.height = Math.round(height * dpr);
        const ctx = exportCanvas.getContext('2d');
        ctx.scale(dpr, dpr);


        ctx.fillStyle = '#071022';
        ctx.fillRect(0, 0, width, height);


        const grad = ctx.createLinearGradient(padding, padding, width - padding, padding);
        state.colors.forEach((c, i) => grad.addColorStop(i / (state.colors.length - 1 || 1), c));
        ctx.fillStyle = grad;
        ctx.fillRect(padding, padding, width - padding * 2, 40);


        ctx.font = `${fontSize}px monospace`;
        ctx.textBaseline = 'top';
        for (let i = 0; i < state.colors.length; i++) {
            const y = padding + 60 + i * (fontSize + 12);
            ctx.fillStyle = state.colors[i];
            ctx.fillRect(padding, y, 48, 48);
            ctx.fillStyle = '#fff';
            ctx.fillText(state.colors[i], padding + 64, y + 8);
        }

        exportCanvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${state.name.replace(/\s+/g, '_')}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        }, 'image/png');
    }


    async function copyAll() {
        const text = state.colors.join('\n');
        await copyToClipboard(text);
        showToast('All hex codes copied');
    }


    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }


    function wireEvents() {
        if (generateBtn) generateBtn.addEventListener('click', () => {
            state.gradientSeed = Date.now();
            generatePalette(true);
        });

        if (undoBtn) undoBtn.addEventListener('click', undo);
        if (redoBtn) redoBtn.addEventListener('click', redo);

        if (sizeRange) sizeRange.addEventListener('input', (e) => {
            const newSize = Number(e.target.value);
            state.size = newSize;
            state.colors = state.colors.slice(0, newSize);
            while (state.colors.length < newSize) state.colors.push(randomHex());
            state.locks = (state.locks || []).slice(0, newSize);
            while (state.locks.length < newSize) state.locks.push(false);
            generatePalette(false);
            snapshot();
        });

        if (modelSelect) modelSelect.addEventListener('change', (e) => {
            state.model = e.target.value;
            state.gradientSeed = Date.now();
            generatePalette(false);
            snapshot();
        });

        if (copyAllBtn) copyAllBtn.addEventListener('click', copyAll);
        if (savePaletteBtn) savePaletteBtn.addEventListener('click', saveCurrentPalette);
        if (shareBtn) shareBtn.addEventListener('click', shareCurrentPalette);
        if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportJSON);
        if (exportPngBtn) exportPngBtn.addEventListener('click', exportPNG);


        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                undo();
            } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
                e.preventDefault();
                redo();
            }
        });
    }

    function init() {

        const loaded = loadFromURL();
        if (!loaded) {
            state.colors = generateHarmony(state.gradientSeed, state.size, state.model);
            state.locks = new Array(state.size).fill(false);
        }
        renderSavedList();
        renderPalette(true);
        wireEvents();
        updateUndoRedoButtons();
    }

    window.__paletteApp = {
        state,
        generatePalette,
        saveCurrentPalette,
        renderSavedList,
        exportJSON,
        exportPNG,
        buildShareURL
    };

    document.addEventListener('DOMContentLoaded', init);
})();

(function addMobilePreviewToggle() {
    const previewPanel = document.querySelector('.preview-panel');
    if (!previewPanel) return;

    const toggle = document.createElement('button');
    toggle.className = 'btn';
    toggle.style.position = 'sticky';
    toggle.style.top = '8px';
    toggle.style.marginBottom = '8px';
    toggle.textContent = 'Show Preview';
    toggle.setAttribute('aria-expanded', 'false');


    const parent = previewPanel.parentElement;
    parent.insertBefore(toggle, previewPanel);

    function updateForWidth() {
        if (window.innerWidth <= 980) {
            toggle.style.display = 'inline-flex';
            previewPanel.style.display = 'none';
            toggle.textContent = 'Show Preview';
            toggle.setAttribute('aria-expanded', 'false');
        } else {
            toggle.style.display = 'none';
            previewPanel.style.display = '';
            toggle.setAttribute('aria-expanded', 'true');
        }
    }

    toggle.addEventListener('click', () => {
        const isHidden = previewPanel.style.display === 'none';
        previewPanel.style.display = isHidden ? '' : 'none';
        toggle.textContent = isHidden ? 'Hide Preview' : 'Show Preview';
        toggle.setAttribute('aria-expanded', String(isHidden));

        if (isHidden) previewPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    window.addEventListener('resize', updateForWidth);

    updateForWidth();
})();
