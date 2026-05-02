import { state } from './state.js';

const SCALE   = 8;   // 64 skin px × 8 = 512 canvas px
const MAX_UNDO = 50;

// Returns the 6 UV face sub-regions for a Minecraft box.
// (u,v) = UV offset in skin px; W=width, H=height, D=depth of the 3D box.
// Layout: [top W×D][bot W×D] in cap row, then [R D×H][frt W×H][L D×H][bk W×H] in side row.
function buildBoxFaces(u, v, W, H, D) {
  return [
    { x: u+D,     y: v,   w: W, h: D, label: 'top' },
    { x: u+D+W,   y: v,   w: W, h: D, label: 'bot' },
    { x: u,       y: v+D, w: D, h: H, label: 'R'   },
    { x: u+D,     y: v+D, w: W, h: H, label: 'frt' },
    { x: u+D+W,   y: v+D, w: D, h: H, label: 'L'   },
    { x: u+D+W+D, y: v+D, w: W, h: H, label: 'bk'  },
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

export class Editor {
  // Callbacks injected from main.js:
  //   syncToViewer  — () => viewer.syncFromCanvas(...)
  //   open3DViewer  — () => viewer.open()
  //   close3DViewer — () => viewer.close()
  //   setError      — msg => search.setError(msg)
  constructor({ syncToViewer, open3DViewer, close3DViewer, setError }) {
    this._syncToViewer  = syncToViewer;
    this._open3DViewer  = open3DViewer;
    this._close3DViewer = close3DViewer;
    this._setError      = setError;

    this.canvas       = $('skin-canvas');
    this.ctx          = this.canvas.getContext('2d', { willReadFrequently: true });
    this.gridCanvas   = $('grid-canvas');
    this.gctx         = this.gridCanvas.getContext('2d');
    this.regionCanvas = $('region-canvas');
    this.rctx         = this.regionCanvas.getContext('2d');

    this._tool          = 'pencil';
    this._drawing       = false;
    this._brushColor    = '#ffffff';
    this._brushSize     = 1;
    this._gridVisible   = false;
    this._regionVisible = false;
    this._undoStack     = [];
    this._redoStack     = [];

    this._bindEvents();
  }

  //  Open / close
  async open() {
    if (!state.currentSkinUrl) return;
    try {
      const res     = await fetch(state.currentSkinUrl);
      const blob    = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        state.skinHeight   = img.naturalHeight;
        state.skinIsLegacy = state.skinHeight === 32;
        const drawH = state.skinIsLegacy ? 256 : 512;

        this.ctx.clearRect(0, 0, 512, 512);
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(img, 0, 0, 512, drawH);
        URL.revokeObjectURL(blobUrl);

        $('format-badge').style.display = state.skinIsLegacy ? 'inline-block' : 'none';

        this._undoStack.length = 0;
        this._redoStack.length = 0;
        this._updateUndoButtons();
        this._drawGrid();
        if (this._regionVisible) this._drawRegions();
        this._syncToViewer();
      };
      img.src = blobUrl;

      $('editor').style.display = 'block';
      $('editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
      this._open3DViewer();
    } catch (e) {
      this._setError('Could not load skin into editor: ' + e.message);
    }
  }

  close() {
    $('editor').style.display = 'none';
    this._close3DViewer();
  }

  reset() {
    if (state.currentSkinUrl) this.open();
  }

  //  Tools
  setTool(t) {
    this._tool = t;
    ['pencil', 'eraser', 'eyedropper'].forEach(n => {
      $('tool-' + n).classList.toggle('active', n === t);
    });
    this.canvas.className = t !== 'pencil' ? `tool-${t}` : '';
  }

  updateColor() {
    this._brushColor = $('color-input').value;
    $('color-preview').style.background = this._brushColor;
  }

  updateBrushSize() {
    this._brushSize = parseInt($('brush-size').value);
    $('size-val').textContent = this._brushSize;
  }

  //  Grid
  toggleGrid() {
    this._gridVisible = !this._gridVisible;
    this.gridCanvas.style.display = this._gridVisible ? 'block' : 'none';
    $('grid-toggle').classList.toggle('active', this._gridVisible);
    if (this._gridVisible) this._drawGrid();
  }

  redrawGridIfVisible() {
    if (this._gridVisible) this._drawGrid();
  }

  //  Regions
  toggleRegions() {
    this._regionVisible = !this._regionVisible;
    this.regionCanvas.style.display = this._regionVisible ? 'block' : 'none';
    $('region-toggle').classList.toggle('active', this._regionVisible);
    if (this._regionVisible) this._drawRegions();
  }

  //  Undo / redo
  undo() {
    if (!this._undoStack.length) return;
    this._redoStack.push(this.ctx.getImageData(0, 0, 512, 512));
    this.ctx.putImageData(this._undoStack.pop(), 0, 0);
    this._updateUndoButtons();
    this._syncToViewer();
  }

  redo() {
    if (!this._redoStack.length) return;
    this._undoStack.push(this.ctx.getImageData(0, 0, 512, 512));
    this.ctx.putImageData(this._redoStack.pop(), 0, 0);
    this._updateUndoButtons();
    this._syncToViewer();
  }

  //  Download
  download() {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width  = 64;
    exportCanvas.height = state.skinHeight;
    const ectx = exportCanvas.getContext('2d');
    ectx.imageSmoothingEnabled = false;
    const srcH = state.skinIsLegacy ? 256 : 512;
    ectx.drawImage(this.canvas, 0, 0, 512, srcH, 0, 0, 64, state.skinHeight);
    exportCanvas.toBlob(blob => {
      const a = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = `${state.currentPlayerName || 'skin'}_edited.png`;
      a.target   = '_blank';
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  }

  //  Private helpers
  _bindEvents() {
    this.canvas.addEventListener('mousedown', e => {
      this._drawing = true;
      if (this._tool === 'eyedropper') { this._pickColor(e); return; }
      this._saveSnapshot();
      this._paint(e);
    });
    this.canvas.addEventListener('mousemove',  e => this._paint(e));
    this.canvas.addEventListener('mouseup',    () => { this._drawing = false; this._syncToViewer(); });
    this.canvas.addEventListener('mouseleave', () => { this._drawing = false; $('coords').textContent = '—'; });

    this.canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      this._drawing = true;
      if (this._tool === 'eyedropper') { this._pickColor(e); return; }
      this._saveSnapshot();
      this._paint(e);
    }, { passive: false });
    this.canvas.addEventListener('touchmove',  e => { e.preventDefault(); this._paint(e); }, { passive: false });
    this.canvas.addEventListener('touchend',   () => { this._drawing = false; this._syncToViewer(); });

    document.addEventListener('keydown', e => {
      if (!e.ctrlKey && !e.metaKey) return;
      if ($('editor').style.display === 'none') return;
      if (e.key === 'z' && !e.shiftKey)                   { e.preventDefault(); this.undo(); }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); this.redo(); }
    });
  }

  _updateUndoButtons() {
    $('btn-undo').disabled = this._undoStack.length === 0;
    $('btn-redo').disabled = this._redoStack.length === 0;
  }

  _saveSnapshot() {
    this._undoStack.push(this.ctx.getImageData(0, 0, 512, 512));
    if (this._undoStack.length > MAX_UNDO) this._undoStack.shift();
    this._redoStack.length = 0;
    this._updateUndoButtons();
  }

  _getPixelPos(e) {
    const rect   = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width  / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const cx = e.type.startsWith('touch')
      ? (e.touches[0].clientX - rect.left) * scaleX
      : (e.clientX - rect.left) * scaleX;
    const cy = e.type.startsWith('touch')
      ? (e.touches[0].clientY - rect.top) * scaleY
      : (e.clientY - rect.top) * scaleY;
    return { px: Math.floor(cx / SCALE), py: Math.floor(cy / SCALE) };
  }

  _paint(e) {
    const { px, py } = this._getPixelPos(e);
    $('coords').textContent = `x:${px} y:${py}`;
    if (!this._drawing) return;
    if (this._tool === 'eyedropper') return;
    if (py >= state.skinHeight) return;

    const x    = px * SCALE;
    const y    = py * SCALE;
    const size = this._brushSize * SCALE;

    if (this._tool === 'eraser') {
      this.ctx.clearRect(x, y, size, size);
    } else {
      this.ctx.fillStyle = this._brushColor;
      this.ctx.fillRect(x, y, size, size);
    }
  }

  _pickColor(e) {
    const { px, py } = this._getPixelPos(e);
    const pixel = this.ctx.getImageData(px * SCALE, py * SCALE, 1, 1).data;
    if (pixel[3] === 0) return;
    const hex = '#' + [pixel[0], pixel[1], pixel[2]]
      .map(v => v.toString(16).padStart(2, '0')).join('');
    this._brushColor = hex;
    $('color-input').value = hex;
    $('color-preview').style.background = hex;
    this.setTool('pencil');
  }

  _drawGrid() {
    const gridH     = state.skinIsLegacy ? 256 : 512;
    const accentRgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim();
    this.gctx.clearRect(0, 0, 512, 512);
    this.gctx.strokeStyle = `rgba(${accentRgb},0.18)`;
    this.gctx.lineWidth   = 0.5;
    for (let x = 0; x <= 512; x += SCALE) {
      this.gctx.beginPath(); this.gctx.moveTo(x, 0); this.gctx.lineTo(x, gridH); this.gctx.stroke();
    }
    for (let y = 0; y <= gridH; y += SCALE) {
      this.gctx.beginPath(); this.gctx.moveTo(0, y); this.gctx.lineTo(512, y); this.gctx.stroke();
    }
  }

  _drawRegions() {
    this.rctx.clearRect(0, 0, 512, 512);
    const armFW = state.skinIsSlim ? 3 : 4;   // arm face width (3px Alex, 4px Steve)
    const armBW = state.skinIsSlim ? 14 : 16; // arm bounding-box width

    for (const r of SKIN_REGIONS) {
      if (r.newFormat && state.skinHeight < 64) continue;
      const B     = r.box;
      const faceW = r.arm ? armFW : B.W;
      const bboxW = r.arm ? armBW : r.w;
      const rx    = r.x * SCALE, ry = r.y * SCALE;
      const rw    = bboxW * SCALE, rh = r.h * SCALE;
      const faint = r.stroke.replace(/[\d.]+\)$/, '0.22)');

      this.rctx.fillStyle = r.fill;
      this.rctx.fillRect(rx, ry, rw, rh);

      // Internal face dividers (dashed)
      this.rctx.save();
      this.rctx.strokeStyle = faint;
      this.rctx.lineWidth   = 0.5;
      this.rctx.setLineDash([2, 3]);
      const hy = (B.v + B.D) * SCALE;
      this.rctx.beginPath(); this.rctx.moveTo(rx, hy); this.rctx.lineTo(rx + rw, hy); this.rctx.stroke();
      for (const vx of [B.u + B.D, B.u + B.D + faceW, B.u + B.D + faceW + B.D]) {
        const cx = vx * SCALE;
        this.rctx.beginPath(); this.rctx.moveTo(cx, ry); this.rctx.lineTo(cx, ry + rh); this.rctx.stroke();
      }
      this.rctx.setLineDash([]);
      this.rctx.restore();

      this.rctx.strokeStyle = r.stroke;
      this.rctx.lineWidth   = 1;
      this.rctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);

      this.rctx.fillStyle    = r.stroke;
      this.rctx.font         = 'bold 8px "Space Mono", monospace';
      this.rctx.textAlign    = 'left';
      this.rctx.textBaseline = 'top';
      this.rctx.fillText(r.label, rx + 3, ry + 3);

      this.rctx.font         = '7px "Space Mono", monospace';
      this.rctx.textAlign    = 'center';
      this.rctx.textBaseline = 'middle';
      for (const f of buildBoxFaces(B.u, B.v, faceW, B.H, B.D)) {
        this.rctx.fillText(f.label, (f.x + f.w / 2) * SCALE, (f.y + f.h / 2) * SCALE);
      }
    }
  }
}
