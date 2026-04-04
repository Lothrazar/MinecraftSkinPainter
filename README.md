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

### Crafatar (no key required)
- Endpoint: `https://crafatar.com/avatars/:uuid?size=40&overlay=true`
- Used for the player head avatar shown on the result card
- Source and docs: https://crafatar.com

## Libraries

### skinview3d
- 3D Minecraft skin renderer built on Three.js
- Loaded via CDN: `https://unpkg.com/skinview3d@3.4.1/bundles/skinview3d.bundle.js`
- Handles Steve/Alex models, cape rendering, and animations (Idle, Walk, Run, Wave, etc.)
- Source: https://github.com/bs-community/skinview3d

