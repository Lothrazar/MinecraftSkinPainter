import { state } from './state.js';

const FAV_KEY = 'mcpaint_favorites';

export class Favorites {
  // Callbacks injected from main.js:
  //   lookup — () => search.lookup()  (caller sets username input first)
  constructor({ lookup }) {
    this._lookup   = lookup;
    this._dragSrc  = null;
  }

  //  Storage
  load() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; }
    catch { return []; }
  }

  save(favs) {
    localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  }

  isFavorite(uuid) {
    return this.load().some(f => f.uuid === uuid);
  }

  updateName(uuid, name) {
    const favs  = this.load();
    const entry = favs.find(f => f.uuid === uuid);
    if (entry && entry.name !== name) {
      entry.name = name;
      this.save(favs);
    }
  }

  toggle() {
    if (!state.currentUuid) return;
    const favs = this.load();
    const idx  = favs.findIndex(f => f.uuid === state.currentUuid);
    if (idx >= 0) {
      favs.splice(idx, 1);
    } else {
      favs.unshift({ name: state.currentPlayerName, uuid: state.currentUuid, addedAt: Date.now() });
      if (!document.body.classList.contains('sidebar-open')) this.toggleSidebar();
    }
    this.save(favs);
    this.updateBtn();
    this.updateToggleBtn();
    this.render();
  }

  remove(uuid) {
    this.save(this.load().filter(f => f.uuid !== uuid));
    if (state.currentUuid === uuid) this.updateBtn();
    this.updateToggleBtn();
    this.render();
  }

  //  UI
  updateBtn() {
    const btn = $('fav-btn');
    if (!btn || !state.currentUuid) return;
    const saved = this.isFavorite(state.currentUuid);
    btn.textContent = saved ? '★ Saved' : '☆ Save';
    btn.classList.toggle('active', saved);
  }

  updateToggleBtn() {
    const btn     = $('fav-toggle-btn');
    const hasFavs = this.load().length > 0;
    btn.textContent = hasFavs ? '★' : '☆';
    btn.classList.toggle('has-favs', hasFavs);
  }

  toggleSidebar() {
    document.body.classList.toggle('sidebar-open');
    this.render();
  }

  render() {
    const favs = this.load();
    const list  = $('fav-list');
    list.innerHTML = '';

    if (!favs.length) {
      const empty = document.createElement('div');
      empty.className   = 'fav-empty';
      empty.textContent = 'No favorites yet. Look up a player and click ☆ Save.';
      list.appendChild(empty);
      return;
    }

    favs.forEach((f, i) => {
      const item = document.createElement('div');
      item.className = 'fav-item';
      item.draggable = true;

      item.addEventListener('dragstart', e => {
        this._dragSrc = i;
        item.classList.add('fav-dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', () => {
        this._dragSrc = null;
        list.querySelectorAll('.fav-item').forEach(el =>
          el.classList.remove('fav-dragging', 'fav-drag-over'));
      });
      item.addEventListener('dragover', e => {
        if (this._dragSrc === null || this._dragSrc === i) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        list.querySelectorAll('.fav-item').forEach(el => el.classList.remove('fav-drag-over'));
        item.classList.add('fav-drag-over');
      });
      item.addEventListener('dragleave', () => item.classList.remove('fav-drag-over'));
      item.addEventListener('drop', e => {
        e.preventDefault();
        e.stopPropagation();
        if (this._dragSrc === null || this._dragSrc === i) return;
        const current = this.load();
        const [moved] = current.splice(this._dragSrc, 1);
        current.splice(i, 0, moved);
        this.save(current);
        this.render();
      });
      item.addEventListener('click', () => this._lookupFavorite(f.name));

      const handle = document.createElement('span');
      handle.className   = 'fav-drag-handle';
      handle.textContent = '⠿';
      handle.setAttribute('aria-hidden', 'true');

      const img = document.createElement('img');
      img.className = 'fav-avatar';
      img.src       = `https://api.mineatar.io/face/${f.uuid}?scale=4`;
      img.onerror   = () => { img.style.display = 'none'; };
      img.alt       = '';

      const name = document.createElement('span');
      name.className   = 'fav-name';
      name.textContent = f.name;

      const remove = document.createElement('button');
      remove.className   = 'fav-remove';
      remove.textContent = '✕';
      remove.title       = 'Remove';
      remove.onclick     = e => { e.stopPropagation(); this.remove(f.uuid); };

      item.append(handle, img, name, remove);
      list.appendChild(item);
    });
  }

  _lookupFavorite(name) {
    $('username').value = name;
    this._lookup();
    if (window.innerWidth < 700) document.body.classList.remove('sidebar-open');
  }
}
