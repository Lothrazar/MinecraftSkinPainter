import { DEFAULT_SKINS } from './defaults.js';

export class DefaultSkinsModal {
  constructor({ onSelect }) {
    this._onSelect = onSelect;
    this._built = false;

    $('defaults-btn').addEventListener('click',        () => this.open());
    $('defaults-modal-close').addEventListener('click',() => this.close());
    $('defaults-modal').addEventListener('click', e => { if (e.target === $('defaults-modal')) this.close(); });
  }

  open() {
    this._buildGrid();
    $('defaults-modal').classList.add('open');
  }

  close() {
    $('defaults-modal').classList.remove('open');
  }

  _buildGrid() {
    if (this._built) return;
    this._built = true;

    for (const category of ['classic', 'slim']) {
      const row = $(`modal-row-${category}`);
      for (const skin of Object.values(DEFAULT_SKINS[category])) {
        const thumb = this._makeThumb(skin);
        thumb.addEventListener('click', () => {
          this._onSelect(skin);
          this.close();
        });
        row.appendChild(thumb);
      }
    }
  }

  _makeThumb(skin) {
    const wrap = document.createElement('div');
    wrap.className = 'skin-thumb';

    const canvas = document.createElement('canvas');
    canvas.width  = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const img = new Image();
    img.src = skin.dataUrl;
    img.onload = () => ctx.drawImage(img, 8, 8, 8, 8, 0, 0, 8, 8);

    const label = document.createElement('span');
    label.className   = 'skin-thumb-name';
    label.textContent = skin.name;

    wrap.appendChild(canvas);
    wrap.appendChild(label);
    return wrap;
  }
}
