
const $ = id => document.getElementById(id);

const qp = q => new URLSearchParams(window.location.search).get(q);

//  State 
let currentSkinUrl = null;
let currentPlayerName = null;
let currentUuid = null;
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
    currentUuid = uuid;

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
    updateFavName(uuid, displayName); // keep stored name fresh if it changed
    updateFavBtn();
    renderFavorites();

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
    $('back-toggles').style.display = viewer3dCapeBlob ? 'flex' : 'none';
    if (viewer3dCapeBlob) toggle3DBack('cape'); // reset to cape on each open

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

// Unified back-equipment toggle — 'cape', 'elytra', or 'off'.
function toggle3DBack(which) {
  if (!viewer3d || !viewer3dCapeBlob) return;
  ['back-cape', 'back-elytra', 'back-off'].forEach(id => $(id)?.classList.remove('active'));
  $(`back-${which}`).classList.add('active');
  if (which === 'cape')        viewer3d.loadCape(viewer3dCapeBlob);
  else if (which === 'elytra') viewer3d.loadCape(viewer3dCapeBlob, { backEquipment: 'elytra' });
  else                         viewer3d.loadCape(null);
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
  syncToViewer();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(ctx.getImageData(0, 0, 512, 512));
  ctx.putImageData(redoStack.pop(), 0, 0);
  updateUndoButtons();
  syncToViewer();
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

// ── Favorites (Phase 6) ──
const FAV_KEY = 'mcpaint_favorites';

function loadFavorites() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; }
  catch { return []; }
}

function saveFavorites(favs) {
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
}

function isFavorite(uuid) {
  return loadFavorites().some(f => f.uuid === uuid);
}

// If the player was already saved under an old name, update it silently
function updateFavName(uuid, name) {
  const favs = loadFavorites();
  const entry = favs.find(f => f.uuid === uuid);
  if (entry && entry.name !== name) {
    entry.name = name;
    saveFavorites(favs);
  }
}

function toggleFavorite() {
  if (!currentUuid) return;
  let favs = loadFavorites();
  const idx = favs.findIndex(f => f.uuid === currentUuid);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push({ name: currentPlayerName, uuid: currentUuid, addedAt: Date.now() });
    // Open sidebar when saving a new favorite
    if (!document.body.classList.contains('sidebar-open')) toggleSidebar();
  }
  saveFavorites(favs);
  updateFavBtn();
  updateFavToggleBtn();
  renderFavorites();
}

function removeFavorite(uuid) {
  saveFavorites(loadFavorites().filter(f => f.uuid !== uuid));
  if (currentUuid === uuid) updateFavBtn();
  updateFavToggleBtn();
  renderFavorites();
}

function updateFavBtn() {
  const btn = $('fav-btn');
  if (!btn || !currentUuid) return;
  const saved = isFavorite(currentUuid);
  btn.textContent = saved ? '★ Saved' : '☆ Save';
  btn.classList.toggle('active', saved);
}

function updateFavToggleBtn() {
  const btn = $('fav-toggle-btn');
  const hasFavs = loadFavorites().length > 0;
  btn.textContent = hasFavs ? '★' : '☆';
  btn.classList.toggle('has-favs', hasFavs);
}

function toggleSidebar() {
  document.body.classList.toggle('sidebar-open');
  renderFavorites();
}

function renderFavorites() {
  const favs = loadFavorites().sort((a, b) => b.addedAt - a.addedAt);
  const list = $('fav-list');
  list.innerHTML = '';

  if (!favs.length) {
    const empty = document.createElement('div');
    empty.className = 'fav-empty';
    empty.textContent = 'No favorites yet. Look up a player and click ☆ Save.';
    list.appendChild(empty);
    return;
  }

  for (const f of favs) {
    const item = document.createElement('div');
    item.className = 'fav-item';
    item.onclick = () => lookupFavorite(f.name);

    const img = document.createElement('img');
    img.className = 'fav-avatar';
    img.src = `https://crafatar.com/avatars/${f.uuid}?size=32&overlay=true`;
    img.onerror = () => { img.style.display = 'none'; };
    img.alt = '';

    const name = document.createElement('span');
    name.className = 'fav-name';
    name.textContent = f.name;

    const remove = document.createElement('button');
    remove.className = 'fav-remove';
    remove.textContent = '✕';
    remove.title = 'Remove';
    remove.onclick = e => { e.stopPropagation(); removeFavorite(f.uuid); };

    item.append(img, name, remove);
    list.appendChild(item);
  }
}

function lookupFavorite(name) {
  $('username').value = name;
  lookup();
  // Close sidebar on narrow screens after selecting
  if (window.innerWidth < 700) document.body.classList.remove('sidebar-open');
}

// Init toggle button state on load
updateFavToggleBtn();
