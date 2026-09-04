// Colour customisation, shared by both pages. The chosen colours are kept in
// localStorage and applied as CSS custom properties on <html>, overriding the
// defaults in styles.css.
import { openModal, closeModal, setupModal } from './modal.js';

const STORAGE_KEY = 'userColors';

export const DEFAULT_COLORS = Object.freeze({
    bg: '#262626',
    boardBg: '#3c3c3c',
    oddTile: '#2b2ba8',
    evenTile: '#d76b19',
    text: '#f8f9fa'
});

const INPUT_IDS = {
    bg: 'bg-color',
    boardBg: 'board-bg-color',
    oddTile: 'odd-color',
    evenTile: 'even-color',
    text: 'text-color'
};

function toRgb(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(ch => ch + ch).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Lighten (positive) or darken (negative) by a percentage.
function shade(hex, percent) {
    const amount = Math.round(2.55 * percent);
    const [r, g, b] = toRgb(hex).map(v => Math.min(255, Math.max(0, v + amount)));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function luminance(hex) {
    const [r, g, b] = toRgb(hex).map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Pick a readable text colour for a tile background.
function textOn(hex) {
    return luminance(hex) > 0.18 ? '#2c3e50' : '#ffffff';
}

function cssVars(colors) {
    const c = { ...DEFAULT_COLORS, ...colors };
    return {
        '--bg-dark': c.bg,
        '--bg-medium': shade(c.bg, -7),
        '--bg-light': shade(c.bg, 3),
        '--board-bg-dark': c.boardBg,
        '--board-bg-light': shade(c.boardBg, 10),
        '--accent-odd': c.oddTile,
        '--accent-odd-light': shade(c.oddTile, 12),
        '--accent-even': c.evenTile,
        '--accent-even-dark': shade(c.evenTile, 12),
        '--tile-odd-text': textOn(c.oddTile),
        '--tile-even-text': textOn(c.evenTile),
        '--text-primary': c.text,
        '--text-secondary': shade(c.text, -12)
    };
}

export function applyColors(colors) {
    const style = document.documentElement.style;
    for (const [name, value] of Object.entries(cssVars(colors))) style.setProperty(name, value);
}

export function clearColors() {
    const style = document.documentElement.style;
    for (const name of Object.keys(cssVars(DEFAULT_COLORS))) style.removeProperty(name);
}

export function loadSavedColors() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function applySavedColors() {
    const saved = loadSavedColors();
    if (saved) applyColors(saved);
}

// Hook up the colour modal: live preview while picking, save/reset, and
// discarding the preview if the modal is closed without saving.
export function setupColorModal() {
    const modal = document.getElementById('color-modal');
    const openBtn = document.getElementById('customize-colors-btn');
    if (!modal || !openBtn) return;

    const inputs = {};
    for (const [key, id] of Object.entries(INPUT_IDS)) inputs[key] = document.getElementById(id);

    const readInputs = () => {
        const colors = {};
        for (const [key, el] of Object.entries(inputs)) colors[key] = el.value;
        return colors;
    };
    const fillInputs = (colors) => {
        for (const [key, el] of Object.entries(inputs)) el.value = colors[key] || DEFAULT_COLORS[key];
    };

    let saved = loadSavedColors();

    openBtn.addEventListener('click', () => {
        fillInputs(saved || DEFAULT_COLORS);
        openModal(modal);
    });

    setupModal(modal, () => {
        if (saved) applyColors(saved);
        else clearColors();
    });

    for (const el of Object.values(inputs)) {
        el.addEventListener('input', () => applyColors(readInputs()));
    }

    document.getElementById('save-colors-btn').addEventListener('click', () => {
        saved = readInputs();
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch { /* private mode */ }
        applyColors(saved);
        closeModal(modal);
    });

    document.getElementById('reset-colors-btn').addEventListener('click', () => {
        saved = null;
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        fillInputs(DEFAULT_COLORS);
        clearColors();
    });
}
