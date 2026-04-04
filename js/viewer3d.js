//  3D Viewer ─
let viewer3d         = null;
let viewer3dSkinBlob = null;
let viewer3dCapeBlob = null;
let currentAnimKey   = 'idle';

// animations api: https://github.com/bs-community/skinview3d/blob/55d5c06b62505fdc204d8addb61da1d67ee07fa8/src/animation.ts#L383
const ANIM_MAP = {
  idle:   () => new skinview3d.IdleAnimation(),
  walk:   () => new skinview3d.WalkingAnimation(),
  run:    () => new skinview3d.RunningAnimation(),
  wave:   () => new skinview3d.WaveAnimation(),
  fly:    () => new skinview3d.FlyingAnimation(),
  swim:   () => new skinview3d.SwimAnimation(),
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
      } catch (_) { /* cape is optional */ }
    }

    viewer3d = new skinview3d.SkinViewer({
      canvas:         $('skin-3d-canvas'),
      width:          300,
      height:         420,
      skin:           viewer3dSkinBlob,
      model:          skinIsSlim ? 'slim' : 'default',
      enableControls: true,
      background:     0x0a0a0c,
    });

    if (viewer3dCapeBlob) viewer3d.loadCape(viewer3dCapeBlob);

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

// Unified back-equipment toggle — 'cape', 'elytra', or 'off'
function toggle3DBack(which) {
  if (!viewer3d || !viewer3dCapeBlob) return;
  ['back-cape', 'back-elytra', 'back-off'].forEach(id => $(id)?.classList.remove('active'));
  $(`back-${which}`).classList.add('active');
  if (which === 'cape')        viewer3d.loadCape(viewer3dCapeBlob);
  else if (which === 'elytra') viewer3d.loadCape(viewer3dCapeBlob, { backEquipment: 'elytra' });
  else                         viewer3d.loadCape(null);
}
