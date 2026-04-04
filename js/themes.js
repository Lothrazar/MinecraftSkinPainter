//  Theme definitions ─
// Each theme must supply every CSS custom property used in style.css.
// --accent-rgb  : comma-separated R,G,B of --accent, used in rgba() calls
// --accent-text : dark colour for text drawn on top of --accent backgrounds

const THEMES = {
  cyan: {
    '--bg':          '#090e10',
    '--surface':     '#101a1e',
    '--border':      '#162028',
    '--accent':      '#22d3ee',
    '--accent-rgb':  '34,211,238',
    '--accent-text': '#021a1e',
    '--text':        '#d8f0f5',
    '--muted':       '#456070',
    '--error':       '#ff5c5c',
  },
  green: {
    '--bg':          '#0e0f11',
    '--surface':     '#16181c',
    '--border':      '#2a2d35',
    '--accent':      '#5dfc8d',
    '--accent-rgb':  '93,252,141',
    '--accent-text': '#0a1a10',
    '--text':        '#e8eaf0',
    '--muted':       '#6b7080',
    '--error':       '#ff5c5c',
  },
  cobalt: {
    '--bg':          '#0b0e14',
    '--surface':     '#131720',
    '--border':      '#1e2535',
    '--accent':      '#4d9fff',
    '--accent-rgb':  '77,159,255',
    '--accent-text': '#020d1a',
    '--text':        '#dde4f0',
    '--muted':       '#5a6680',
    '--error':       '#ff5c5c',
  },
  amber: {
    '--bg':          '#0f0e0b',
    '--surface':     '#1a1810',
    '--border':      '#302c1a',
    '--accent':      '#f0b429',
    '--accent-rgb':  '240,180,41',
    '--accent-text': '#1a0e00',
    '--text':        '#f0e8d0',
    '--muted':       '#7a6e50',
    '--error':       '#ff5c5c',
  },
  rose: {
    '--bg':          '#0f0b0e',
    '--surface':     '#1a1018',
    '--border':      '#2e1a28',
    '--accent':      '#f06292',
    '--accent-rgb':  '240,98,146',
    '--accent-text': '#1a0010',
    '--text':        '#f0dde8',
    '--muted':       '#7a5068',
    '--error':       '#ff5c5c',
  },
  lavender: {
    '--bg':          '#0d0c12',
    '--surface':     '#16141f',
    '--border':      '#272040',
    '--accent':      '#a78bfa',
    '--accent-rgb':  '167,139,250',
    '--accent-text': '#0e0820',
    '--text':        '#e4e0f5',
    '--muted':       '#635d80',
    '--error':       '#ff5c5c',
  },
};

//  Apply a theme by key 
function applyTheme(key) {
  const t = THEMES[key] || THEMES.cyan;
  const root = document.documentElement;
  Object.entries(t).forEach(([k, v]) => root.style.setProperty(k, v));
  localStorage.setItem('mcpaint_theme', key);

  // Sync active state on picker dots
  document.querySelectorAll('.theme-dot').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === key);
  });

  // Redraw grid immediately if it's visible so it picks up the new accent colour
  if (typeof drawGrid === 'function' && typeof gridVisible !== 'undefined' && gridVisible) {
    drawGrid();
  }
}
