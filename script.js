
const $ = id => document.getElementById(id);

const qp = q => new URLSearchParams(window.location.search).get(q);

//  State 
let currentSkinUrl = null;
let currentPlayerName = null;
let tool = 'pencil';
let drawing = false;
let brushColor = '#ffffff';
let brushSize = 1;
let gridVisible = false;
let regionVisible = false;
let skinHeight = 64;
let skinIsLegacy = false;
let skinIsSlim = false;
const SCALE = 8; // 64px * 8 = 512px canvas
const undoStack = [];
const redoStack = [];
const MAX_UNDO = 50;

//  Lookup (Phase 1) 
function setError(msg) {
  const el = $('error');
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

function setLoading(on) {
  $('loader').style.display = on ? 'flex' : 'none';
  $('search-btn').disabled = on;
  if (on) {
    $('result').style.display = 'none';
    $('editor').style.display = 'none';
    setError('');
  }
}

async function lookup() {
  const name = $('username').value.trim();
  if (!name) return;
  setLoading(true);
  try {
    const res = await fetch(`https://api.ashcon.app/mojang/v2/user/${encodeURIComponent(name)}`);
    if (res.status === 404) throw new Error(`Player "${name}" not found.`);
    if (!res.ok) throw new Error(`API error (${res.status}). Try again shortly.`);
    const data = await res.json();
    const uuid = data.uuid;
    const displayName = data.username;
    const skinUrl = data.textures?.skin?.url;
    const capeUrl = data.textures?.cape?.url ?? null;
    skinIsSlim = data.textures?.slim ?? false;
    if (!skinUrl) throw new Error('No skin URL found.');

    currentSkinUrl = skinUrl;
    currentPlayerName = displayName;

    $('avatar-img').src = `https://crafatar.com/avatars/${uuid}?size=40&overlay=true`;
    $('result-name').textContent = displayName;
    $('result-uuid').textContent = uuid.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
    $('skin-img').src = skinUrl;
    $('dl-skin').href = skinUrl;
    $('dl-skin').download = `${displayName}_skin.png`;

    if (capeUrl) {
      $('cape-img').src = capeUrl;
      $('cape-block').style.display = 'flex';
      $('no-cape-block').style.display = 'none';
      $('dl-cape').href = capeUrl;
      $('dl-cape').download = `${displayName}_cape.png`;
      $('dl-cape').style.display = 'inline-block';
    } else {
      $('cape-block').style.display = 'none';
      $('no-cape-block').style.display = 'flex';
      $('dl-cape').style.display = 'none';
    }

    setModelState(skinIsSlim);
    $('upload-btn').style.display = 'none'; // upload only available via Steve/Alex buttons

    $('result').style.display = 'block';
    $('editor').style.display = 'none';
    history.replaceState(null, '', `?q=${encodeURIComponent(displayName)}`);

  } catch (e) {
    setError(e.message);
  } finally {
    setLoading(false);
  }
}

$('username').addEventListener('keydown', e => { if (e.key === 'Enter') lookup(); });

//  Default skins (embedded as data URIs to avoid CORS) 
const DEFAULT_SKINS = {
  steve: {
    slim: false,
    dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAFDUlEQVR42u2a20sUURzH97G0LKMotPuWbVpslj1olJXdjCgyisowsSjzgrB0gSKyC5UF1ZNQWEEQSBQ9dHsIe+zJ/+nXfM/sb/rN4ZwZ96LOrnPgyxzP/M7Z+X7OZc96JpEISfWrFhK0YcU8knlozeJKunE4HahEqSc2nF6zSEkCgGCyb+82enyqybtCZQWAzdfVVFgBJJNJn1BWFgC49/VpwGVlD0CaxQiA5HSYEwBM5sMAdKTqygcAG9+8coHKY/XXAZhUNgDYuBSPjJL/GkzVVhAEU5tqK5XZ7cnFtHWtq/TahdSw2l0HUisr1UKIWJQBAMehDuqiDdzndsP2EZECAG1ZXaWMwOCODdXqysLf++uXUGv9MhUHIByDOijjdiSAoH3ErANQD73C7TXXuGOsFj1d4YH4OTJAEy8y9Hd0mCaeZ5z8dfp88zw1bVyiYhCLOg1ZeAqC0ybaDttHRGME1DhDeVWV26u17lRAPr2+mj7dvULfHw2q65fhQRrLXKDfIxkau3ZMCTGIRR3URR5toU38HbaPiMwUcKfBAkoun09PzrbQ2KWD1JJaqswjdeweoR93rirzyCMBCmIQizqoizZkm2H7iOgAcHrMHbbV9KijkUYv7qOn55sdc4fo250e+vUg4329/Xk6QB/6DtOws+dHDGJRB3XRBve+XARt+4hIrAF4UAzbnrY0ve07QW8uHfB+0LzqanMM7qVb+3f69LJrD90/1axiEIs6qIs21BTIToewfcSsA+Bfb2x67OoR1aPPzu2i60fSNHRwCw221Suz0O3jO+jh6V1KyCMGse9721XdN5ePutdsewxS30cwuMjtC860T5JUKpXyKbSByUn7psi5l+juDlZYGh9324GcPKbkycaN3jUSAGxb46IAYPNZzW0AzgiQ5tVnzLUpUDCAbakMQXXrOtX1UMtHn+Q9/X5L4wgl7t37r85OSrx+TYl379SCia9KXjxRpiTjIZTBFOvrV1f8ty2eY/T7XJ81FQAwmA8ASH1ob68r5PnBsxA88/xAMh6SpqW4HRnLBrkOA9Xv5wPAZjAUgOkB+SHxgBgR0qSMh0zmZRsmwDJm1gFg2PMDIC8/nAHIMls8x8GgzOsG5WiaqREgYzDvpTwjLDy8NM15LpexDEA3LepjU8Z64my+8PtDCmUyRr+fFwA2J0eAFYA0AxgSgMmYBMZTwFQnO9RNAEaHOj2DXF5UADmvAToA2ftyxZYA5BqgmZZApDkdAK4mAKo8GzPlr8G8AehzMAyA/i1girUA0HtYB2CaIkUBEHQ/cBHSvwF0AKZFS5M0ZwMQtEaEAmhtbSUoDADH9ff3++QZ4o0I957e+zYAMt6wHkhzpjkuAcgpwNcpA7AZDLsvpwiuOkBvxygA6Bsvb0HlaeKIF2EbADZpGiGzBsA0gnwQHGOhW2snRpbpPexbAB2Z1oicAMQpTnGKU5ziFKc4xSlOcYpTnOIUpzgVmgo+XC324WfJAdDO/+ceADkCpuMFiFKbApEHkOv7BfzfXt+5gpT8V7rpfYJcDz+jAsB233r6yyBsJ0mlBCDofuBJmel4vOwBFPv8fyYAFPJ+wbSf/88UANNRVy4Awo6+Ig2gkCmgA5DHWjoA+X7AlM//owLANkX0w0359od++pvX8fdMAcj3/QJ9iJsAFPQCxHSnQt8vMJ3v2wCYpkhkAOR7vG7q4aCXoMoSgG8hFAuc/grMdAD4B/kHl9da7Ne9AAAAAElFTkSuQmCC',
  },
  alex: {
    slim: true,
    dataUrl: 'data:image/png;base64,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',
  },
};

function setModelState(slim) {
  skinIsSlim = slim;
  const label = slim ? 'Alex' : 'Steve';
  const cls   = slim ? 'alex' : 'steve';
  ['model-badge', 'editor-model-badge'].forEach(id => {
    const el = $(id);
    el.textContent = label;
    el.className = `model-badge ${cls}`;
  });
  // Show upload button and label it with the active model
  $('upload-btn').textContent = `↑ Upload (${label})`;
  $('upload-btn').style.display = 'inline-block';
}

async function loadDefaultSkin(key) {
  const skin = DEFAULT_SKINS[key];
  setError('');
  try {
    currentSkinUrl = skin.dataUrl;
    currentPlayerName = key;
    setModelState(skin.slim);
    $('result').style.display = 'none';
    await openEditor();
  } catch (e) {
    setError(e.message);
  }
}

function handleUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = ''; // reset so the same file can be re-selected later

  const reader = new FileReader();
  reader.onload = evt => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w !== 64 || (h !== 32 && h !== 64)) {
        setError(`Invalid skin dimensions (${w}×${h}). Expected 64×32 or 64×64.`);
        return;
      }
      // skinIsSlim is already set by whichever Steve / Alex button was clicked
      currentSkinUrl = evt.target.result;
      currentPlayerName = file.name.replace(/\.png$/i, '');
      setError('');
      $('result').style.display = 'none';
      openEditor();
    };
    img.onerror = () => setError('Could not read image. Make sure it is a valid PNG.');
    img.src = evt.target.result;
  };
  reader.onerror = () => setError('Could not read file.');
  reader.readAsDataURL(file);
}//*


//***************************** */
//  3D Viewer 
//***************************** */
let viewer3d         = null;
let viewer3dSkinBlob = null;
let viewer3dCapeBlob = null;
let currentAnimKey   = 'idle';

// animations api https://github.com/bs-community/skinview3d/blob/55d5c06b62505fdc204d8addb61da1d67ee07fa8/src/animation.ts#L383
const ANIM_MAP = {
  idle:   () => new skinview3d.IdleAnimation(),
  walk:   () => new skinview3d.WalkingAnimation(),
  run:    () => new skinview3d.RunningAnimation(),
  wave:   () => new skinview3d.WaveAnimation(),
  fly:    () => new skinview3d.FlyingAnimation(),
  swim:   () => new skinview3d.SwimAnimation(), // TODO: skinview3d.SwimAnimation is not a constructor?
  crouch: () => new skinview3d.CrouchAnimation(),
  hit:    () => new skinview3d.HitAnimation(),
  none:   null,
};

async function open3DViewer() {
  if (!currentSkinUrl) return;
  close3DViewer(); // dispose any existing viewer + revoke old blobs
  setError('');

  try {
    // Fetch skin as blob (avoids canvas taint)
    const skinRes  = await fetch(currentSkinUrl);
    const skinBlob = await skinRes.blob();
    viewer3dSkinBlob = URL.createObjectURL(skinBlob);

    // Cape blob if a cape is loaded
    viewer3dCapeBlob = null;
    const capeEl = $('cape-img');
    if (capeEl.src && $('cape-block').style.display !== 'none') {
      try {
        const capeRes  = await fetch(capeEl.src);
        const capeBlob = await capeRes.blob();
        viewer3dCapeBlob = URL.createObjectURL(capeBlob);
      } catch (_) { /* cape optional */ }
    }

    const canvas3d = $('skin-3d-canvas');
    viewer3d = new skinview3d.SkinViewer({
      canvas:         canvas3d,
      width:          300,
      height:         420,
      skin:           viewer3dSkinBlob,
      model:          skinIsSlim ? 'slim' : 'default',
      enableControls: true,
      background:     0x0a0a0c,
    });

    if (viewer3dCapeBlob) {
      viewer3d.loadCape(viewer3dCapeBlob);
    }

    // Initial animation
    currentAnimKey = 'idle';
    viewer3d.animation = new skinview3d.IdleAnimation();
    updateAnimButtons();

    // Back-equipment toggles (only shown when a cape is present)
    $('cape-toggle').checked   = true;
    $('elytra-toggle').checked = false;
    $('back-toggles').style.display = viewer3dCapeBlob ? 'flex' : 'none';

    // Model badge
    const vb = $('viewer-3d-model-badge');
    vb.textContent = skinIsSlim ? 'Alex' : 'Steve';
    vb.className   = `model-badge ${skinIsSlim ? 'alex' : 'steve'}`;

    $('viewer-3d').style.display = 'block';
    updatePanelsLayout();
    $('viewer-3d').scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (e) {
    setError('Could not open 3D viewer: ' + e.message);
  }
}

function close3DViewer() {
  $('viewer-3d').style.display = 'none';
  updatePanelsLayout();
  if (viewer3d)         { viewer3d.dispose(); viewer3d = null; }
  if (viewer3dSkinBlob) { URL.revokeObjectURL(viewer3dSkinBlob); viewer3dSkinBlob = null; }
  if (viewer3dCapeBlob) { URL.revokeObjectURL(viewer3dCapeBlob); viewer3dCapeBlob = null; }
}

function setAnimation(key) {
  if (!viewer3d) return;
  currentAnimKey = key;
  const factory = ANIM_MAP[key];
  viewer3d.animation = factory ? factory() : null;
  updateAnimButtons();
}

function updateAnimButtons() {
  ['idle','walk','run','wave','fly','swim','crouch','hit','none'].forEach(k => {
    $(`anim-btn-${k}`).classList.toggle('active', k === currentAnimKey);
  });
}

// Unified back-equipment toggle — 'cape' or 'elytra'.
// The two checkboxes are mutually exclusive; checking one unchecks the other.
function toggle3DBack(which) {
  if (!viewer3d || !viewer3dCapeBlob) return;
  const capeEl   = $('cape-toggle');
  const elytraEl = $('elytra-toggle');
  if (which === 'cape') {
    if (capeEl.checked) {
      elytraEl.checked = false;
      viewer3d.loadCape(viewer3dCapeBlob); // normal cape
    } else {
      viewer3d.loadCape(null);
    }
  } else {
    if (elytraEl.checked) {
      capeEl.checked = false;
      viewer3d.loadCape(viewer3dCapeBlob, { backEquipment: 'elytra' });
    } else {
      viewer3d.loadCape(null);
    }
  }
}

//  Query param binding 
const _qp = qp('q');
if (_qp) { $('username').value = _qp; lookup(); }

//  Editor (Phase 2) 
const canvas = $('skin-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const gridCanvas = $('grid-canvas');
const gctx = gridCanvas.getContext('2d');
const regionCanvas = $('region-canvas');
const rctx = regionCanvas.getContext('2d');

async function openEditor() {
  if (!currentSkinUrl) return;

  // Fetch skin as blob to avoid canvas taint from cross-origin img
  try {
    const res = await fetch(currentSkinUrl);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      skinHeight = img.naturalHeight; // 32 = legacy pre-1.8, 64 = modern
      skinIsLegacy = skinHeight === 32;
      const canvasDrawH = skinIsLegacy ? 256 : 512;
      ctx.clearRect(0, 0, 512, 512);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, 512, canvasDrawH);
      URL.revokeObjectURL(blobUrl);
      // Show/hide legacy badge
      $('format-badge').style.display = skinIsLegacy ? 'inline-block' : 'none';
      // Clear history on fresh load
      undoStack.length = 0;
      redoStack.length = 0;
      updateUndoButtons();
      drawGrid();
      if (regionVisible) drawRegions();
      syncToViewer();
    };
    img.src = blobUrl;

    $('editor').style.display = 'block';
    updatePanelsLayout();
    $('editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    setError('Could not load skin into editor: ' + e.message);
  }
}

function closeEditor() {
  $('editor').style.display = 'none';
  updatePanelsLayout();
}

function updatePanelsLayout() {
  const editorOpen = $('editor').style.display !== 'none';
  const viewerOpen = $('viewer-3d').style.display !== 'none';
  $('panels-wrap').classList.toggle('dual', editorOpen && viewerOpen);
}

function resetCanvas() {
  if (currentSkinUrl) openEditor();
}

//  Tools 
function setTool(t) {
  tool = t;
  ['pencil','eraser','eyedropper'].forEach(n => {
    $('tool-' + n).classList.toggle('active', n === t);
  });
  canvas.className = t !== 'pencil' ? `tool-${t}` : '';
}

function updateColor() {
  brushColor = $('color-input').value;
  $('color-preview').style.background = brushColor;
}

function updateBrushSize() {
  brushSize = parseInt($('brush-size').value);
  $('size-val').textContent = brushSize;
}

function toggleGrid() {
  gridVisible = !gridVisible;
  gridCanvas.style.display = gridVisible ? 'block' : 'none';
  $('grid-toggle').classList.toggle('active', gridVisible);
  if (gridVisible) drawGrid();
}

function drawGrid() {
  const gridH = skinIsLegacy ? 256 : 512;
  gctx.clearRect(0, 0, 512, 512);
  gctx.strokeStyle = 'rgba(93,252,141,0.18)';
  gctx.lineWidth = 0.5;
  for (let x = 0; x <= 512; x += SCALE) {
    gctx.beginPath();
    gctx.moveTo(x, 0);
    gctx.lineTo(x, gridH);
    gctx.stroke();
  }
  for (let y = 0; y <= gridH; y += SCALE) {
    gctx.beginPath();
    gctx.moveTo(0, y);
    gctx.lineTo(512, y);
    gctx.stroke();
  }
}

//  Region overlay 
// buildBoxFaces: returns the 6 UV face sub-regions for a Minecraft box.
// (u,v) = UV offset in skin px; W=width, H=height, D=depth of the 3D box.
// Layout: [top W×D][bot W×D] in the cap row, then [R D×H][frt W×H][L D×H][bk W×H] in the side row.
function buildBoxFaces(u, v, W, H, D) {
  return [
    { x: u+D,       y: v,   w: W, h: D, label: 'top' },
    { x: u+D+W,     y: v,   w: W, h: D, label: 'bot' },
    { x: u,         y: v+D, w: D, h: H, label: 'R'   },
    { x: u+D,       y: v+D, w: W, h: H, label: 'frt' },
    { x: u+D+W,     y: v+D, w: D, h: H, label: 'L'   },
    { x: u+D+W+D,   y: v+D, w: W, h: H, label: 'bk'  },
  ];
}

// Regions in 64px skin coords. arm:true → arm face width from skinIsSlim (3 Alex / 4 Steve).
// newFormat:true → only shown for 64×64 skins.
const SKIN_REGIONS = [
  { x:0,  y:0,  w:32, h:16, label:'Head',    stroke:'rgba(79,195,247,0.7)',  fill:'rgba(79,195,247,0.07)',  box:{u:0,  v:0,  W:8, H:8,  D:8} },
  { x:32, y:0,  w:32, h:16, label:'Hat',     stroke:'rgba(79,195,247,0.4)',  fill:'rgba(79,195,247,0.04)',  box:{u:32, v:0,  W:8, H:8,  D:8} },
  { x:0,  y:16, w:16, h:16, label:'R.Leg',   stroke:'rgba(239,83,80,0.7)',   fill:'rgba(239,83,80,0.07)',   box:{u:0,  v:16, W:4, H:12, D:4} },
  { x:16, y:16, w:24, h:16, label:'Body',    stroke:'rgba(102,187,106,0.7)', fill:'rgba(102,187,106,0.07)', box:{u:16, v:16, W:8, H:12, D:4} },
  { x:40, y:16, w:16, h:16, label:'R.Arm',   stroke:'rgba(255,167,38,0.7)',  fill:'rgba(255,167,38,0.07)',  box:{u:40, v:16,      H:12, D:4}, arm:true },
  { x:0,  y:32, w:16, h:16, label:'R.Leg 2', stroke:'rgba(239,83,80,0.4)',   fill:'rgba(239,83,80,0.04)',   box:{u:0,  v:32, W:4, H:12, D:4}, newFormat:true },
  { x:16, y:32, w:24, h:16, label:'Body 2',  stroke:'rgba(102,187,106,0.4)', fill:'rgba(102,187,106,0.04)', box:{u:16, v:32, W:8, H:12, D:4}, newFormat:true },
  { x:40, y:32, w:16, h:16, label:'R.Arm 2', stroke:'rgba(255,167,38,0.4)',  fill:'rgba(255,167,38,0.04)',  box:{u:40, v:32,      H:12, D:4}, arm:true, newFormat:true },
  { x:0,  y:48, w:16, h:16, label:'L.Leg 2', stroke:'rgba(239,83,80,0.4)',   fill:'rgba(239,83,80,0.04)',   box:{u:0,  v:48, W:4, H:12, D:4}, newFormat:true },
  { x:16, y:48, w:16, h:16, label:'L.Leg',   stroke:'rgba(239,83,80,0.7)',   fill:'rgba(239,83,80,0.07)',   box:{u:16, v:48, W:4, H:12, D:4}, newFormat:true },
  { x:32, y:48, w:16, h:16, label:'L.Arm',   stroke:'rgba(255,167,38,0.7)',  fill:'rgba(255,167,38,0.07)',  box:{u:32, v:48,      H:12, D:4}, arm:true, newFormat:true },
  { x:48, y:48, w:16, h:16, label:'L.Arm 2', stroke:'rgba(255,167,38,0.4)',  fill:'rgba(255,167,38,0.04)',  box:{u:48, v:48,      H:12, D:4}, arm:true, newFormat:true },
];

function drawRegions() {
  rctx.clearRect(0, 0, 512, 512);
  const armFW = skinIsSlim ? 3 : 4;   // arm face width (3px Alex, 4px Steve)
  const armBW = skinIsSlim ? 14 : 16; // arm bounding-box width

  for (const r of SKIN_REGIONS) {
    if (r.newFormat && skinHeight < 64) continue;
    const B = r.box;
    const faceW = r.arm ? armFW : B.W;
    const bboxW = r.arm ? armBW : r.w;
    const rx = r.x * SCALE, ry = r.y * SCALE;
    const rw = bboxW * SCALE, rh = r.h * SCALE;
    const faint = r.stroke.replace(/[\d.]+\)$/, '0.22)');

    // Fill
    rctx.fillStyle = r.fill;
    rctx.fillRect(rx, ry, rw, rh);

    // Internal face dividers (dashed)
    rctx.save();
    rctx.strokeStyle = faint;
    rctx.lineWidth = 0.5;
    rctx.setLineDash([2, 3]);
    // Horizontal: separates cap row from side row
    const hy = (B.v + B.D) * SCALE;
    rctx.beginPath(); rctx.moveTo(rx, hy); rctx.lineTo(rx + rw, hy); rctx.stroke();
    // Verticals: between the 4 face columns (R | frt | L | bk)
    for (const vx of [B.u + B.D, B.u + B.D + faceW, B.u + B.D + faceW + B.D]) {
      const cx = vx * SCALE;
      rctx.beginPath(); rctx.moveTo(cx, ry); rctx.lineTo(cx, ry + rh); rctx.stroke();
    }
    rctx.setLineDash([]);
    rctx.restore();

    // Bounding box border
    rctx.strokeStyle = r.stroke;
    rctx.lineWidth = 1;
    rctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);

    // Region name — top-left corner
    rctx.fillStyle = r.stroke;
    rctx.font = 'bold 8px "Space Mono", monospace';
    rctx.textAlign = 'left';
    rctx.textBaseline = 'top';
    rctx.fillText(r.label, rx + 3, ry + 3);

    // Face labels — centered inside each face sub-region
    rctx.font = '7px "Space Mono", monospace';
    rctx.textAlign = 'center';
    rctx.textBaseline = 'middle';
    for (const f of buildBoxFaces(B.u, B.v, faceW, B.H, B.D)) {
      rctx.fillText(f.label, (f.x + f.w / 2) * SCALE, (f.y + f.h / 2) * SCALE);
    }
  }
}

function toggleRegions() {
  regionVisible = !regionVisible;
  regionCanvas.style.display = regionVisible ? 'block' : 'none';
  $('region-toggle').classList.toggle('active', regionVisible);
  if (regionVisible) drawRegions();
}

//  Undo / Redo 
function updateUndoButtons() {
  $('btn-undo').disabled = undoStack.length === 0;
  $('btn-redo').disabled = redoStack.length === 0;
}

function saveSnapshot() {
  undoStack.push(ctx.getImageData(0, 0, 512, 512));
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack.length = 0;
  updateUndoButtons();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(ctx.getImageData(0, 0, 512, 512));
  ctx.putImageData(undoStack.pop(), 0, 0);
  updateUndoButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(ctx.getImageData(0, 0, 512, 512));
  ctx.putImageData(redoStack.pop(), 0, 0);
  updateUndoButtons();
}

document.addEventListener('keydown', e => {
  if (!e.ctrlKey && !e.metaKey) return;
  if ($('editor').style.display === 'none') return;
  if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
});

//  Canvas drawing 
function getPixelPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = e.type.startsWith('touch')
    ? (e.touches[0].clientX - rect.left) * scaleX
    : (e.clientX - rect.left) * scaleX;
  const cy = e.type.startsWith('touch')
    ? (e.touches[0].clientY - rect.top) * scaleY
    : (e.clientY - rect.top) * scaleY;
  return {
    px: Math.floor(cx / SCALE),
    py: Math.floor(cy / SCALE),
  };
}

function paint(e) {
  const { px, py } = getPixelPos(e);
  $('coords').textContent = `x:${px} y:${py}`;

  if (!drawing) return;
  if (tool === 'eyedropper') return; // handled on down
  if (py >= skinHeight) return; // block painting in unused area for legacy skins

  const x = px * SCALE;
  const y = py * SCALE;
  const size = brushSize * SCALE;

  if (tool === 'eraser') {
    ctx.clearRect(x, y, size, size);
  } else {
    ctx.fillStyle = brushColor;
    ctx.fillRect(x, y, size, size);
  }
}

function pickColor(e) {
  const { px, py } = getPixelPos(e);
  const pixel = ctx.getImageData(px * SCALE, py * SCALE, 1, 1).data;
  if (pixel[3] === 0) return; // transparent — skip
  const hex = '#' + [pixel[0], pixel[1], pixel[2]]
    .map(v => v.toString(16).padStart(2, '0')).join('');
  brushColor = hex;
  $('color-input').value = hex;
  $('color-preview').style.background = hex;
  setTool('pencil');
}

canvas.addEventListener('mousedown', e => {
  drawing = true;
  if (tool === 'eyedropper') { pickColor(e); return; }
  saveSnapshot();
  paint(e);
});
canvas.addEventListener('mousemove', paint);
canvas.addEventListener('mouseup', () => { drawing = false; syncToViewer(); });
canvas.addEventListener('mouseleave', () => { drawing = false; $('coords').textContent = '—'; });

// Touch support
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  drawing = true;
  if (tool === 'eyedropper') { pickColor(e); return; }
  saveSnapshot();
  paint(e);
}, { passive: false });
canvas.addEventListener('touchmove', e => { e.preventDefault(); paint(e); }, { passive: false });
canvas.addEventListener('touchend', () => { drawing = false; syncToViewer(); });

//  Download edited
function downloadEdited() {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = 64;
  exportCanvas.height = skinHeight; // 32 for legacy, 64 for modern
  const ectx = exportCanvas.getContext('2d');
  ectx.imageSmoothingEnabled = false;
  // Only copy the drawn portion of the canvas (top 256px for legacy, full 512px for modern)
  const srcH = skinIsLegacy ? 256 : 512;
  ectx.drawImage(canvas, 0, 0, 512, srcH, 0, 0, 64, skinHeight);
  exportCanvas.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${currentPlayerName || 'skin'}_edited.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
}

// ── Sync editor canvas → 3D viewer (Phase 9) ──
function syncToViewer() {
  if (!viewer3d) return;
  const tmp = document.createElement('canvas');
  tmp.width  = 64;
  tmp.height = skinHeight; // 64 modern, 32 legacy
  const tctx = tmp.getContext('2d');
  tctx.imageSmoothingEnabled = false;
  const srcH = skinIsLegacy ? 256 : 512;
  tctx.drawImage(canvas, 0, 0, 512, srcH, 0, 0, 64, skinHeight);
  viewer3d.loadSkin(tmp.toDataURL('image/png'), { model: skinIsSlim ? 'slim' : 'default' });
}

function toggle3DViewer() {
  if ($('viewer-3d').style.display !== 'none') {
    close3DViewer();
  } else {
    open3DViewer();
  }
}
