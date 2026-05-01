import { state }      from './state.js';
import { applyTheme } from './themes.js';
import { Search }     from './search.js';
import { Favorites }  from './favorites.js';
import { Editor }     from './editor.js';
import { Viewer3D }   from './viewer3d.js';

export class App {
  constructor() {
    this.viewer = new Viewer3D({
      setError:     msg => this.search.setError(msg),
      updateLayout: ()  => this._updateLayout(),
    });

    this.editor = new Editor({
      syncToViewer:  () => this.viewer.syncFromCanvas(this.editor.canvas, state.skinHeight, state.skinIsLegacy, state.skinIsSlim),
      open3DViewer:  () => this.viewer.open(),
      close3DViewer: () => this.viewer.close(),
      setError:      msg => this.search.setError(msg),
    });

    this.favs = new Favorites({
      lookup: () => this.search.lookup(),
    });

    this.search = new Search({
      openEditor:   () => this.editor.open(),
      closeViewer:  () => this.viewer.close(),
      onFavsUpdate: (uuid, name) => { this.favs.updateName(uuid, name); this.favs.updateBtn(); this.favs.render(); },
    });

    this._wireEvents();
    this._init();
  }

  _updateLayout() {
    const editorOpen = $('editor').style.display    !== 'none';
    const viewerOpen = $('viewer-3d').style.display !== 'none';
    $('panels-wrap').classList.toggle('dual', editorOpen && viewerOpen);
  }

  _wireEvents() {
    // Sidebar
    $('fav-header').addEventListener('click',     () => this.favs.toggleSidebar());
    $('fav-toggle-btn').addEventListener('click', () => this.favs.toggleSidebar());

    // Search
    $('search-btn').addEventListener('click',  () => this.search.lookup());
    $('username').addEventListener('keydown',  e => { if (e.key === 'Enter') this.search.lookup(); });

    // Default skins + upload
    $('steve-btn').addEventListener('click',          () => this.search.loadDefaultSkin('steve'));
    $('alex-btn').addEventListener('click',           () => this.search.loadDefaultSkin('alex'));
    $('upload-btn').addEventListener('click',         () => $('skin-upload-input').click());
    $('skin-upload-input').addEventListener('change', e  => this.search.handleUpload(e));

    // Result card
    $('fav-btn').addEventListener('click',  () => this.favs.toggle());
    $('edit-btn').addEventListener('click', () => this.editor.open());

    // Editor toolbar
    $('reset-btn').addEventListener('click',        () => this.editor.reset());
    $('close-editor-btn').addEventListener('click', () => this.editor.close());
    $('btn-undo').addEventListener('click',         () => this.editor.undo());
    $('btn-redo').addEventListener('click',         () => this.editor.redo());
    $('tool-pencil').addEventListener('click',      () => this.editor.setTool('pencil'));
    $('tool-eraser').addEventListener('click',      () => this.editor.setTool('eraser'));
    $('tool-eyedropper').addEventListener('click',  () => this.editor.setTool('eyedropper'));
    $('color-input').addEventListener('input',      () => this.editor.updateColor());
    $('brush-size').addEventListener('input',       () => this.editor.updateBrushSize());
    $('grid-toggle').addEventListener('click',      () => this.editor.toggleGrid());
    $('region-toggle').addEventListener('click',    () => this.editor.toggleRegions());
    $('dl-edited-btn').addEventListener('click',    () => this.editor.download());

    // 3D viewer — animations
    ['idle', 'walk', 'run', 'wave', 'fly', 'swim', 'crouch', 'hit', 'none'].forEach(k => {
      $(`anim-btn-${k}`).addEventListener('click', () => this.viewer.setAnimation(k));
    });

    // 3D viewer — back equipment
    ['cape', 'elytra', 'off'].forEach(w => {
      $(`back-${w}`).addEventListener('click', () => this.viewer.toggle3DBack(w));
    });

    // 3D viewer — view controls
    $('view-btn-outer').addEventListener('click',  () => this.viewer.toggleOuterLayer());
    $('view-btn-rotate').addEventListener('click', () => this.viewer.toggleAutoRotate());
    $('view-btn-reset').addEventListener('click',  () => this.viewer.resetView());

    // Theme picker — applyTheme then redraw grid so it picks up the new accent colour
    qsa('.theme-dot').forEach(btn => {
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.theme);
        this.editor.redrawGridIfVisible();
      });
    });
  }

  _init() {
    applyTheme(localStorage.getItem('mcpaint_theme') || 'cyan');
    this.favs.updateToggleBtn();

    const urlParam = qp('q');
    if (urlParam) { $('username').value = urlParam; this.search.lookup(); }
  }
}

new App();
