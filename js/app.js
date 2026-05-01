import { state }      from './state.js';
import { applyTheme } from './themes.js';
import { Search }     from './search.js';
import { Favorites }  from './favorites.js';
import { Editor }     from './editor.js';
import { Viewer3D }   from './viewer3d.js';

//  Shared layout helper (needs both editor + viewer display state)
function updateLayout() {
  const editorOpen = $('editor').style.display   !== 'none';
  const viewerOpen = $('viewer-3d').style.display !== 'none';
  $('panels-wrap').classList.toggle('dual', editorOpen && viewerOpen);
}

// Declare first so lazy closures below capture the variable by reference.
// Each instance is assigned before any user interaction triggers a callback.
let search, editor, viewer, favs;

viewer = new Viewer3D({
  setError:     msg => search.setError(msg),
  updateLayout,
});

editor = new Editor({
  syncToViewer:  () => viewer.syncFromCanvas(editor.canvas, state.skinHeight, state.skinIsLegacy, state.skinIsSlim),
  open3DViewer:  () => viewer.open(),
  close3DViewer: () => viewer.close(),
  setError:      msg => search.setError(msg),
});

favs = new Favorites({
  lookup: () => search.lookup(),
});

search = new Search({
  openEditor:   () => editor.open(),
  closeViewer:  () => viewer.close(),
  onFavsUpdate: (uuid, name) => { favs.updateName(uuid, name); favs.updateBtn(); favs.render(); },
});

//  Event listeners — replaces all inline onclick / oninput / onchange attrs

// Sidebar
$('fav-header').addEventListener('click',    () => favs.toggleSidebar());
$('fav-toggle-btn').addEventListener('click', () => favs.toggleSidebar());

// Search
$('search-btn').addEventListener('click',   () => search.lookup());
$('username').addEventListener('keydown',   e => { if (e.key === 'Enter') search.lookup(); });

// Default skins + upload
$('steve-btn').addEventListener('click',          () => search.loadDefaultSkin('steve'));
$('alex-btn').addEventListener('click',           () => search.loadDefaultSkin('alex'));
$('upload-btn').addEventListener('click',         () => $('skin-upload-input').click());
$('skin-upload-input').addEventListener('change', e  => search.handleUpload(e));

// Result card
$('fav-btn').addEventListener('click',  () => favs.toggle());
$('edit-btn').addEventListener('click', () => editor.open());

// Editor toolbar
$('reset-btn').addEventListener('click',       () => editor.reset());
$('close-editor-btn').addEventListener('click', () => editor.close());
$('btn-undo').addEventListener('click',        () => editor.undo());
$('btn-redo').addEventListener('click',        () => editor.redo());
$('tool-pencil').addEventListener('click',     () => editor.setTool('pencil'));
$('tool-eraser').addEventListener('click',     () => editor.setTool('eraser'));
$('tool-eyedropper').addEventListener('click', () => editor.setTool('eyedropper'));
$('color-input').addEventListener('input',     () => editor.updateColor());
$('brush-size').addEventListener('input',      () => editor.updateBrushSize());
$('grid-toggle').addEventListener('click',     () => editor.toggleGrid());
$('region-toggle').addEventListener('click',   () => editor.toggleRegions());
$('dl-edited-btn').addEventListener('click',   () => editor.download());

// 3D viewer — animations
['idle', 'walk', 'run', 'wave', 'fly', 'swim', 'crouch', 'hit', 'none'].forEach(k => {
  $(`anim-btn-${k}`).addEventListener('click', () => viewer.setAnimation(k));
});

// 3D viewer — back equipment
['cape', 'elytra', 'off'].forEach(w => {
  $(`back-${w}`).addEventListener('click', () => viewer.toggle3DBack(w));
});

// Theme picker — applyTheme then redraw grid so it picks up the new accent colour
qsa('.theme-dot').forEach(btn => {
  btn.addEventListener('click', () => {
    applyTheme(btn.dataset.theme);
    editor.redrawGridIfVisible();
  });
});

//  Init
applyTheme(localStorage.getItem('mcpaint_theme') || 'cyan');
favs.updateToggleBtn();

const urlParam = qp('q');
if (urlParam) { $('username').value = urlParam; search.lookup(); }
