//  Favorites (localStorage) 
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

// If a player was already saved under an old name, update it silently
function updateFavName(uuid, name) {
  const favs  = loadFavorites();
  const entry = favs.find(f => f.uuid === uuid);
  if (entry && entry.name !== name) {
    entry.name = name;
    saveFavorites(favs);
  }
}

function toggleFavorite() {
  if (!currentUuid) return;
  const favs = loadFavorites();
  const idx  = favs.findIndex(f => f.uuid === currentUuid);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push({ name: currentPlayerName, uuid: currentUuid, addedAt: Date.now() });
    // Auto-open sidebar when saving a new favorite
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

//  Sidebar UI 
function updateFavBtn() {
  const btn = $('fav-btn');
  if (!btn || !currentUuid) return;
  const saved = isFavorite(currentUuid);
  btn.textContent = saved ? '★ Saved' : '☆ Save';
  btn.classList.toggle('active', saved);
}

function updateFavToggleBtn() {
  const btn    = $('fav-toggle-btn');
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
    empty.className   = 'fav-empty';
    empty.textContent = 'No favorites yet. Look up a player and click ☆ Save.';
    list.appendChild(empty);
    return;
  }

  for (const f of favs) {
    const item = document.createElement('div');
    item.className = 'fav-item';
    item.onclick   = () => lookupFavorite(f.name);

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
    remove.onclick     = e => { e.stopPropagation(); removeFavorite(f.uuid); };

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
