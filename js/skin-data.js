// Returns the 6 UV face sub-regions for a Minecraft box.
// (u,v) = UV offset in skin px; W=width, H=height, D=depth of the 3D box.
// Layout: [top W×D][bot W×D] in cap row, then [R D×H][frt W×H][L D×H][bk W×H] in side row.
export function buildBoxFaces(u, v, W, H, D) {
  return [
    { x: u+D,       y: v,   w: W, h: D, label: 'top' },
    { x: u+D+W,     y: v,   w: W, h: D, label: 'bot' },
    { x: u,         y: v+D, w: D, h: H, label: 'R'   },
    { x: u+D,       y: v+D, w: W, h: H, label: 'frt' },
    { x: u+D+W,     y: v+D, w: D, h: H, label: 'L'   },
    { x: u+D+W+D,   y: v+D, w: W, h: H, label: 'bk'  },
  ];
}

// Regions in 64px skin coords. arm:true → arm face width from skinIsSlim (3 Alex / 4 Steve).
// newFormat:true → only shown for 64×64 skins.
export const SKIN_REGIONS = [
  { x:0,  y:0,  w:32, h:16, label:'Head',    stroke:'rgba(79,195,247,0.7)',  fill:'rgba(79,195,247,0.07)',  box:{u:0,  v:0,  W:8, H:8,  D:8} },
  { x:32, y:0,  w:32, h:16, label:'Hat',     stroke:'rgba(79,195,247,0.4)',  fill:'rgba(79,195,247,0.04)',  box:{u:32, v:0,  W:8, H:8,  D:8} },
  { x:0,  y:16, w:16, h:16, label:'R.Leg',   stroke:'rgba(239,83,80,0.7)',   fill:'rgba(239,83,80,0.07)',   box:{u:0,  v:16, W:4, H:12, D:4} },
  { x:16, y:16, w:24, h:16, label:'Body',    stroke:'rgba(102,187,106,0.7)', fill:'rgba(102,187,106,0.07)', box:{u:16, v:16, W:8, H:12, D:4} },
  { x:40, y:16, w:16, h:16, label:'R.Arm',   stroke:'rgba(255,167,38,0.7)',  fill:'rgba(255,167,38,0.07)',  box:{u:40, v:16,      H:12, D:4}, arm:true },
  { x:0,  y:32, w:16, h:16, label:'R.Leg 2', stroke:'rgba(239,83,80,0.4)',   fill:'rgba(239,83,80,0.04)',   box:{u:0,  v:32, W:4, H:12, D:4}, newFormat:true },
  { x:16, y:32, w:24, h:16, label:'Body 2',  stroke:'rgba(102,187,106,0.4)', fill:'rgba(102,187,106,0.04)', box:{u:16, v:32, W:8, H:12, D:4}, newFormat:true },
  { x:40, y:32, w:16, h:16, label:'R.Arm 2', stroke:'rgba(255,167,38,0.4)',  fill:'rgba(255,167,38,0.04)',  box:{u:40, v:32,      H:12, D:4}, arm:true, newFormat:true },
  { x:0,  y:48, w:16, h:16, label:'L.Leg 2', stroke:'rgba(239,83,80,0.4)',   fill:'rgba(239,83,80,0.04)',   box:{u:0,  v:48, W:4, H:12, D:4}, newFormat:true },
  { x:16, y:48, w:16, h:16, label:'L.Leg',   stroke:'rgba(239,83,80,0.7)',   fill:'rgba(239,83,80,0.07)',   box:{u:16, v:48, W:4, H:12, D:4}, newFormat:true },
  { x:32, y:48, w:16, h:16, label:'L.Arm',   stroke:'rgba(255,167,38,0.7)',  fill:'rgba(255,167,38,0.07)',  box:{u:32, v:48,      H:12, D:4}, arm:true, newFormat:true },
  { x:48, y:48, w:16, h:16, label:'L.Arm 2', stroke:'rgba(255,167,38,0.4)',  fill:'rgba(255,167,38,0.04)',  box:{u:48, v:48,      H:12, D:4}, arm:true, newFormat:true },
];
