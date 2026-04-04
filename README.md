# Minecraft Skin Tool

A client-side Minecraft Java Edition player skin viewer and editor.
No backend required — just serve the files locally.

## Running locally

These tools must be served from a local web server (not opened directly as
`file://`) because the Mojang API blocks requests from `null` origins for
security reasons.


## API usage

### ashcon.app (no key required)
- Endpoint: `https://api.ashcon.app/mojang/v2/user/:username`
- Community-maintained CORS-friendly wrapper around the Mojang API
- Returns UUID, username, skin URL, cape URL, and slim (Alex) flag in a single request
- Replaces the need to call `api.mojang.com` + `sessionserver.mojang.com` separately
- Source and docs: https://github.com/Electroid/mojang-api

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
- Handles Steve/Alex models, cape rendering, and animations (Idle, Walk, Run, Wave, etc.)
- Source: https://github.com/bs-community/skinview3d

