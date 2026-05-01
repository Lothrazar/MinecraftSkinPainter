# skin.painter

A client-side Minecraft Java Edition player skin viewer and editor.
No backend required — runs entirely in the browser.

**Live page:** https://lothrazar.github.io/MinecraftSkinPainter/

## Features

- **Look up any player** by username — resolves UUID, skin, and cape via the Mojang API
- **3D viewer** with 8 animations: idle, walk, run, wave, fly, swim, crouch, hit
- **Cape rendering**, outer layer toggle, and auto-rotate in the 3D viewer
- **Pixel editor** — pencil tool, adjustable brush size, undo/redo (50 levels), region overlay, pixel grid
- **Steve / Alex model detection** — slim arms handled automatically
- **Upload your own skin** PNG to view or edit it
- **Favorites sidebar** — save players locally (persisted to localStorage)
- **6 color themes** — cyan, green, cobalt, amber, rose, lavender

## Running locally

It's a static site with no build step, but ES modules require a local server (browsers block `file://` imports). Either:

```bash
npx serve .
# or
python -m http.server
```

## API usage

### ashcon.app (no key required)
- Endpoint: `https://api.ashcon.app/mojang/v2/user/:username`
- Community-maintained CORS-friendly wrapper around the Mojang API
- Returns UUID, username, skin URL, cape URL, and slim (Alex) flag in a single request
- Replaces the need to call `api.mojang.com` + `sessionserver.mojang.com` separately
- Source and docs: https://github.com/Electroid/mojang-api
- Note: community-hosted; may occasionally be unavailable

### Mineatar (no key required)
- Endpoint: `https://api.mineatar.io/face/:uuid?scale=5`
- Used for the player face avatar shown on the result card and favorites sidebar
- `scale` multiplies the native 8×8 face texture (scale=5 → 40 px, scale=4 → 32 px)
- Overlay (helmet layer) is on by default
- Source and docs: https://mineatar.io/docs

## Libraries

### skinview3d
- 3D Minecraft skin renderer built on Three.js
- Loaded via CDN: `https://cdn.jsdelivr.net/npm/skinview3d@3.4.1/bundles/skinview3d.bundle.js`
- Handles Steve/Alex models, cape rendering, and animations
- Source: https://github.com/bs-community/skinview3d
