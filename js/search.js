import { state } from './state.js';
import { DEFAULT_SKINS } from './defaults.js';

export class Search {
  // Callbacks injected from main.js to avoid circular imports:
  //   openEditor   — () => editor.open()
  //   closeViewer  — () => viewer.close()
  //   onFavsUpdate — (uuid, name) => favs side-effects
  constructor({ openEditor, closeViewer, onFavsUpdate }) {
    this._openEditor   = openEditor;
    this._closeViewer  = closeViewer;
    this._onFavsUpdate = onFavsUpdate;
  }

  setError(msg) {
    const el = $('error');
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
  }

  setLoading(on) {
    $('loader').style.display    = on ? 'flex' : 'none';
    $('search-btn').disabled     = on;
    if (on) {
      $('result').style.display  = 'none';
      $('editor').style.display  = 'none';
      this._closeViewer();
      this.setError('');
    }
  }

  setModelState(slim) {
    state.skinIsSlim = slim;
    const label = slim ? 'Slim' : 'Classic';
    const cls   = slim ? 'slim' : 'classic';
    ['model-badge', 'editor-model-badge'].forEach(id => {
      const el = $(id);
      el.textContent = label;
      el.className   = `model-badge ${cls}`;
    });
    $('upload-btn').textContent   = `↑ Upload (${label})`;
    $('upload-btn').style.display = 'inline-block';
  }

  async lookup() {
    const name = $('username').value.trim();
    if (!name) return;
    this.setLoading(true);
    try {
      const res = await fetch(`https://api.ashcon.app/mojang/v2/user/${encodeURIComponent(name)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.reason || `API error (${res.status}). Try again shortly.`);
      }

      const data        = await res.json();
      const uuid        = data.uuid;
      const displayName = data.username;
      const skinUrl     = data.textures?.skin?.url;
      const capeUrl     = data.textures?.cape?.url ?? null;
      state.skinIsSlim  = data.textures?.slim ?? false;

      if (!skinUrl) throw new Error('No skin URL found.');

      state.currentSkinUrl    = skinUrl;
      state.currentPlayerName = displayName;
      state.currentUuid       = uuid;

      $('avatar-img').src              = `https://api.mineatar.io/face/${uuid}?scale=5`;
      $('result-name').textContent     = displayName;
      $('result-uuid').textContent     = uuid.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
      $('skin-img').src                = skinUrl;
      $('dl-skin').href                = skinUrl;
      $('dl-skin').download            = `${displayName}_skin.png`;
      $('dl-skin').target              = '_blank';

      if (capeUrl) {
        $('cape-img').src                = capeUrl;
        $('cape-block').style.display    = 'flex';
        $('no-cape-block').style.display = 'none';
        $('dl-cape').href                = capeUrl;
        $('dl-cape').download            = `${displayName}_cape.png`;
        $('dl-cape').target              = '_blank';
        $('dl-cape').style.display       = 'inline-block';
      } else {
        $('cape-block').style.display    = 'none';
        $('no-cape-block').style.display = 'flex';
        $('dl-cape').style.display       = 'none';
      }

      this.setModelState(state.skinIsSlim);
      $('upload-btn').style.display = 'none';
      $('result').style.display     = 'block';
      $('editor').style.display     = 'none';
      history.replaceState(null, '', `?q=${encodeURIComponent(displayName)}`);
      this._onFavsUpdate(uuid, displayName);

    } catch (e) {
      this.setError(e.message);
    } finally {
      this.setLoading(false);
    }
  }

  async loadDefaultSkin(key) {
    const skin = DEFAULT_SKINS[key];
    this.setError('');
    try {
      state.currentSkinUrl    = skin.dataUrl;
      state.currentPlayerName = key;
      this.setModelState(skin.slim);
      $('result').style.display = 'none';
      await this._openEditor();
    } catch (e) {
      this.setError(e.message);
    }
  }

  handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = evt => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (w !== 64 || (h !== 32 && h !== 64)) {
          this.setError(`Invalid skin dimensions (${w}×${h}). Expected 64×32 or 64×64.`);
          return;
        }
        state.currentSkinUrl    = evt.target.result;
        state.currentPlayerName = file.name.replace(/\.png$/i, '');
        this.setError('');
        $('result').style.display = 'none';
        this._openEditor();
      };
      img.onerror = () => this.setError('Could not read image. Make sure it is a valid PNG.');
      img.src = evt.target.result;
    };
    reader.onerror = () => this.setError('Could not read file.');
    reader.readAsDataURL(file);
  }
}
