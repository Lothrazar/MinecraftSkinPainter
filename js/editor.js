//  Canvas setup 
const canvas       = $('skin-canvas');
const ctx          = canvas.getContext('2d', { willReadFrequently: true });
const gridCanvas   = $('grid-canvas');
const gctx         = gridCanvas.getContext('2d');
const regionCanvas = $('region-canvas');
const rctx         = regionCanvas.getContext('2d');

//  Open / close 
async function openEditor() {
  if (!currentSkinUrl) return;

  // Fetch as blob to avoid canvas taint from cross-origin images
  try {
    const res    = await fetch(currentSkinUrl);
    const blob   = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      skinHeight   = img.naturalHeight; // 32 = legacy pre-1.8, 64 = modern
      skinIsLegacy = skinHeight === 32;
      const drawH  = skinIsLegacy ? 256 : 512;

      ctx.clearRect(0, 0, 512, 512);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, 512, drawH);
      URL.revokeObjectURL(blobUrl);

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
    $('editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
    open3DViewer();
  } catch (e) {
    setError('Could not load skin into editor: ' + e.message);
  }
}

function closeEditor() {
  $('editor').style.display = 'none';
  close3DViewer();
}

function updatePanelsLayout() {
  const editorOpen = $('editor').style.display !== 'none';
  const viewerOpen = $('viewer-3d').style.display !== 'none';
  $('panels-wrap').classList.toggle('dual', editorOpen && viewerOpen);
}

function resetCanvas() {
  if (currentSkinUrl) openEditor();
}

//  Tools ─
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

//  Grid 
function toggleGrid() {
  gridVisible = !gridVisible;
  gridCanvas.style.display = gridVisible ? 'block' : 'none';
  $('grid-toggle').classList.toggle('active', gridVisible);
  if (gridVisible) drawGrid();
}

function drawGrid() {
  const gridH = skinIsLegacy ? 256 : 512;
  gctx.clearRect(0, 0, 512, 512);
  const accentRgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim();
  gctx.strokeStyle = `rgba(${accentRgb},0.18)`;
  gctx.lineWidth = 0.5;
  for (let x = 0; x <= 512; x += SCALE) {
    gctx.beginPath(); gctx.moveTo(x, 0); gctx.lineTo(x, gridH); gctx.stroke();
  }
  for (let y = 0; y <= gridH; y += SCALE) {
    gctx.beginPath(); gctx.moveTo(0, y); gctx.lineTo(512, y); gctx.stroke();
  }
}

//  Region overlay 
// Returns the 6 UV face sub-regions for a Minecraft box.
// (u,v) = UV offset in skin px; W=width, H=height, D=depth of the 3D box.
// Layout: [top W×D][bot W×D] in cap row, then [R D×H][frt W×H][L D×H][bk W×H] in side row.
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
    const B    = r.box;
    const faceW = r.arm ? armFW : B.W;
    const bboxW = r.arm ? armBW : r.w;
    const rx = r.x * SCALE, ry = r.y * SCALE;
    const rw = bboxW * SCALE, rh = r.h * SCALE;
    const faint = r.stroke.replace(/[\d.]+\)$/, '0.22)');

    rctx.fillStyle = r.fill;
    rctx.fillRect(rx, ry, rw, rh);

    // Internal face dividers (dashed)
    rctx.save();
    rctx.strokeStyle = faint;
    rctx.lineWidth = 0.5;
    rctx.setLineDash([2, 3]);
    const hy = (B.v + B.D) * SCALE;
    rctx.beginPath(); rctx.moveTo(rx, hy); rctx.lineTo(rx + rw, hy); rctx.stroke();
    for (const vx of [B.u + B.D, B.u + B.D + faceW, B.u + B.D + faceW + B.D]) {
      const cx = vx * SCALE;
      rctx.beginPath(); rctx.moveTo(cx, ry); rctx.lineTo(cx, ry + rh); rctx.stroke();
    }
    rctx.setLineDash([]);
    rctx.restore();

    rctx.strokeStyle = r.stroke;
    rctx.lineWidth = 1;
    rctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);

    rctx.fillStyle = r.stroke;
    rctx.font = 'bold 8px "Space Mono", monospace';
    rctx.textAlign = 'left';
    rctx.textBaseline = 'top';
    rctx.fillText(r.label, rx + 3, ry + 3);

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

//  Undo / Redo ─
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
  if (e.key === 'z' && !e.shiftKey)                   { e.preventDefault(); undo(); }
  if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
});

//  Canvas drawing 
function getPixelPos(e) {
  const rect   = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = e.type.startsWith('touch')
    ? (e.touches[0].clientX - rect.left) * scaleX
    : (e.clientX - rect.left) * scaleX;
  const cy = e.type.startsWith('touch')
    ? (e.touches[0].clientY - rect.top) * scaleY
    : (e.clientY - rect.top) * scaleY;
  return { px: Math.floor(cx / SCALE), py: Math.floor(cy / SCALE) };
}

function paint(e) {
  const { px, py } = getPixelPos(e);
  $('coords').textContent = `x:${px} y:${py}`;

  if (!drawing) return;
  if (tool === 'eyedropper') return;       // handled on mousedown
  if (py >= skinHeight) return;            // block painting in unused legacy area

  const x    = px * SCALE;
  const y    = py * SCALE;
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
canvas.addEventListener('mouseup',    () => { drawing = false; syncToViewer(); });
canvas.addEventListener('mouseleave', () => { drawing = false; $('coords').textContent = '—'; });

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  drawing = true;
  if (tool === 'eyedropper') { pickColor(e); return; }
  saveSnapshot();
  paint(e);
}, { passive: false });
canvas.addEventListener('touchmove', e => { e.preventDefault(); paint(e); }, { passive: false });
canvas.addEventListener('touchend',  () => { drawing = false; syncToViewer(); });

//  Download edited skin 
function downloadEdited() {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width  = 64;
  exportCanvas.height = skinHeight; // 32 for legacy, 64 for modern
  const ectx = exportCanvas.getContext('2d');
  ectx.imageSmoothingEnabled = false;
  const srcH = skinIsLegacy ? 256 : 512;
  ectx.drawImage(canvas, 0, 0, 512, srcH, 0, 0, 64, skinHeight);
  exportCanvas.toBlob(blob => {
    const a = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `${currentPlayerName || 'skin'}_edited.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
}

//  Sync editor canvas → 3D viewer 
function syncToViewer() {
  if (!viewer3d) return;
  const tmp  = document.createElement('canvas');
  tmp.width  = 64;
  tmp.height = skinHeight;
  const tctx = tmp.getContext('2d');
  tctx.imageSmoothingEnabled = false;
  const srcH = skinIsLegacy ? 256 : 512;
  tctx.drawImage(canvas, 0, 0, 512, srcH, 0, 0, 64, skinHeight);
  viewer3d.loadSkin(tmp.toDataURL('image/png'), { model: skinIsSlim ? 'slim' : 'default' });
}
