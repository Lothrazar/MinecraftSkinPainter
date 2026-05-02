import { state } from './state.js';

// animations api: https://github.com/bs-community/skinview3d/blob/55d5c06b62505fdc204d8addb61da1d67ee07fa8/src/animation.ts#L383
const ANIM_MAP = {
  idle:   () => new skinview3d.IdleAnimation(),
  walk:   () => new skinview3d.WalkingAnimation(),
  run:    () => new skinview3d.RunningAnimation(),
  wave:   () => new skinview3d.WaveAnimation(),
  fly:    () => new skinview3d.FlyingAnimation(),
  swim:   typeof skinview3d.SwimAnimation === 'function' ? () => new skinview3d.SwimAnimation() : null,
  crouch: () => new skinview3d.CrouchAnimation(),
  hit:    () => new skinview3d.HitAnimation(),
  none:   null,
};

export class Viewer3D {
  // Callbacks injected from main.js:
  //   setError      — msg => search.setError(msg)
  //   updateLayout  — () => panels dual-class toggle
  constructor({ setError, updateLayout }) {
    this._setError     = setError;
    this._updateLayout = updateLayout;
    this._viewer          = null;
    this._skinBlobUrl     = null;
    this._capeBlobUrl     = null;
    this._animKey         = 'idle';
    this._outerLayerVisible = true;
    this._autoRotate        = false;
  }

  async open() {
    if (!state.currentSkinUrl) return;
    this.close();
    this._setError('');

    try {
      const skinRes  = await fetch(state.currentSkinUrl);
      const skinBlob = await skinRes.blob();
      this._skinBlobUrl = URL.createObjectURL(skinBlob);

      this._capeBlobUrl = null;
      const capeEl = $('cape-img');
      if (capeEl.src && $('cape-block').style.display !== 'none') {
        try {
          const capeRes  = await fetch(capeEl.src);
          const capeBlob = await capeRes.blob();
          this._capeBlobUrl = URL.createObjectURL(capeBlob);
        } catch (_) { /* cape is optional */ }
      }

      this._viewer = new skinview3d.SkinViewer({
        canvas:         $('skin-3d-canvas'),
        width:          300,
        height:         420,
        skin:           this._skinBlobUrl,
        model:          state.skinIsSlim ? 'slim' : 'default',
        enableControls: true,
        background:     0x0a0a0c,
      });

      if (this._capeBlobUrl) this._viewer.loadCape(this._capeBlobUrl);

      this._animKey          = 'idle';
      this._viewer.animation = new skinview3d.IdleAnimation();
      this._outerLayerVisible = true;
      this._autoRotate        = false;
      this._viewer.autoRotate = false;
      this._updateAnimButtons();
      this._updateViewButtons();

      $('back-toggles').style.display = this._capeBlobUrl ? 'flex' : 'none';
      if (this._capeBlobUrl) this.toggle3DBack('cape');

      const vb = $('viewer-3d-model-badge');
      vb.textContent = state.skinIsSlim ? 'Alex' : 'Steve';
      vb.className   = `model-badge ${state.skinIsSlim ? 'alex' : 'steve'}`;

      $('viewer-3d').style.display = 'block';
      this._updateLayout();
      $('viewer-3d').scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (e) {
      this._setError('Could not open 3D viewer: ' + e.message);
    }
  }

  close() {
    $('viewer-3d').style.display = 'none';
    this._updateLayout();
    if (this._viewer)      { this._viewer.dispose(); this._viewer = null; }
    if (this._skinBlobUrl) { URL.revokeObjectURL(this._skinBlobUrl); this._skinBlobUrl = null; }
    if (this._capeBlobUrl) { URL.revokeObjectURL(this._capeBlobUrl); this._capeBlobUrl = null; }
  }

  setAnimation(key) {
    if (!this._viewer) return;
    this._animKey = key;
    const factory = ANIM_MAP[key];
    this._viewer.animation = factory ? factory() : null;
    this._updateAnimButtons();
  }

  toggle3DBack(which) {
    if (!this._viewer || !this._capeBlobUrl) return;
    ['back-cape', 'back-elytra', 'back-off'].forEach(id => $(id)?.classList.remove('active'));
    $(`back-${which}`).classList.add('active');
    if (which === 'cape')        this._viewer.loadCape(this._capeBlobUrl);
    else if (which === 'elytra') this._viewer.loadCape(this._capeBlobUrl, { backEquipment: 'elytra' });
    else                         this._viewer.loadCape(null);
  }

  // Called by Editor after every draw/undo/redo to keep 3D in sync
  syncFromCanvas(canvas, skinHeight, skinIsLegacy, skinIsSlim) {
    if (!this._viewer) return;
    const tmp  = document.createElement('canvas');
    tmp.width  = 64;
    tmp.height = skinHeight;
    const tctx = tmp.getContext('2d');
    tctx.imageSmoothingEnabled = false;
    const srcH = skinIsLegacy ? 256 : 512;
    tctx.drawImage(canvas, 0, 0, 512, srcH, 0, 0, 64, skinHeight);
    this._viewer.loadSkin(tmp.toDataURL('image/png'), { model: skinIsSlim ? 'slim' : 'default' });
  }

  toggleOuterLayer() {
    if (!this._viewer) return;
    this._outerLayerVisible = !this._outerLayerVisible;
    this._viewer.playerObject.skin.setOuterLayerVisible(this._outerLayerVisible);
    this._updateViewButtons();
  }

  toggleAutoRotate() {
    if (!this._viewer) return;
    this._autoRotate = !this._autoRotate;
    this._viewer.autoRotate = this._autoRotate;
    this._updateViewButtons();
  }

  resetView() {
    if (!this._viewer) return;
    this._viewer.resetCameraPose();
  }

  _updateViewButtons() {
    $('view-btn-outer').classList.toggle('active', this._outerLayerVisible);
    $('view-btn-rotate').classList.toggle('active', this._autoRotate);
  }

  _updateAnimButtons() {
    ['idle', 'walk', 'run', 'wave', 'fly', 'swim', 'crouch', 'hit', 'none'].forEach(k => {
      $(`anim-btn-${k}`).classList.toggle('active', k === this._animKey);
    });
  }
}
