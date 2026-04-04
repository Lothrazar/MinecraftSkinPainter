# Minecraft Skin Tool

A client-side Minecraft Java Edition player skin viewer and editor.
No backend required — just serve the files locally.

## Running locally

These tools must be served from a local web server (not opened directly as
`file://`) because the Mojang API blocks requests from `null` origins for
security reasons.


## API usage

### Mojang API (no key required)
- `api.mojang.com` — username → UUID lookup
- `sessionserver.mojang.com` — UUID → profile + textures (skin/cape URLs)
- Rate limit: ~200 requests per 2 minutes per IP
- The textures response is a base64-encoded JSON blob inside a `properties` array

