//  Error / loading UI 
function setError(msg) {
  const el = $('error');
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

function setLoading(on) {
  $('loader').style.display   = on ? 'flex' : 'none';
  $('search-btn').disabled    = on;
  if (on) {
    $('result').style.display = 'none';
    $('editor').style.display = 'none';
    close3DViewer();
    setError('');
  }
}

//  Player lookup ─
async function lookup() {
  const name = $('username').value.trim();
  if (!name) return;
  setLoading(true);
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
    skinIsSlim        = data.textures?.slim ?? false;

    if (!skinUrl) throw new Error('No skin URL found.');

    currentSkinUrl    = skinUrl;
    currentPlayerName = displayName;
    currentUuid       = uuid;

    $('avatar-img').src = `https://api.mineatar.io/face/${uuid}?scale=5`;
    $('result-name').textContent = displayName;
    $('result-uuid').textContent = uuid.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
    $('skin-img').src            = skinUrl;
    $('dl-skin').href            = skinUrl;
    $('dl-skin').download        = `${displayName}_skin.png`;

    if (capeUrl) {
      $('cape-img').src              = capeUrl;
      $('cape-block').style.display  = 'flex';
      $('no-cape-block').style.display = 'none';
      $('dl-cape').href              = capeUrl;
      $('dl-cape').download          = `${displayName}_cape.png`;
      $('dl-cape').style.display     = 'inline-block';
    } else {
      $('cape-block').style.display    = 'none';
      $('no-cape-block').style.display = 'flex';
      $('dl-cape').style.display       = 'none';
    }

    setModelState(skinIsSlim);
    $('upload-btn').style.display = 'none'; // upload only via Steve/Alex buttons

    $('result').style.display = 'block';
    $('editor').style.display = 'none';
    history.replaceState(null, '', `?q=${encodeURIComponent(displayName)}`);

    updateFavName(uuid, displayName); // keep stored name fresh if it changed
    updateFavBtn();
    renderFavorites();

  } catch (e) {
    setError(e.message);
  } finally {
    setLoading(false);
  }
}

$('username').addEventListener('keydown', e => { if (e.key === 'Enter') lookup(); });

//  Model state ─
function setModelState(slim) {
  skinIsSlim = slim;
  const label = slim ? 'Alex' : 'Steve';
  const cls   = slim ? 'alex' : 'steve';
  ['model-badge', 'editor-model-badge'].forEach(id => {
    const el = $(id);
    el.textContent = label;
    el.className   = `model-badge ${cls}`;
  });
  $('upload-btn').textContent    = `↑ Upload (${label})`;
  $('upload-btn').style.display  = 'inline-block';
}

//  Default skins ─
async function loadDefaultSkin(key) {
  const skin = DEFAULT_SKINS[key];
  setError('');
  try {
    currentSkinUrl    = skin.dataUrl;
    currentPlayerName = key;
    setModelState(skin.slim);
    $('result').style.display = 'none';
    await openEditor();
  } catch (e) {
    setError(e.message);
  }
}

//  Upload 
function handleUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = ''; // reset so same file can be re-selected

  const reader = new FileReader();
  reader.onload = evt => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w !== 64 || (h !== 32 && h !== 64)) {
        setError(`Invalid skin dimensions (${w}×${h}). Expected 64×32 or 64×64.`);
        return;
      }
      // skinIsSlim is already set by whichever Steve / Alex button was clicked
      currentSkinUrl    = evt.target.result;
      currentPlayerName = file.name.replace(/\.png$/i, '');
      setError('');
      $('result').style.display = 'none';
      openEditor();
    };
    img.onerror = () => setError('Could not read image. Make sure it is a valid PNG.');
    img.src = evt.target.result;
  };
  reader.onerror = () => setError('Could not read file.');
  reader.readAsDataURL(file);
}
