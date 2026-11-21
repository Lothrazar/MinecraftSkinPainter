import { state } from './state.js';
import { SKIN_REGIONS, buildBoxFaces } from './skin-data.js';

// Paired limbs: pixel on region A maps to the corresponding pixel on region B
const LIMB_PAIRS = [
  ['R.Arm',   'L.Arm'],
  ['R.Leg',   'L.Leg'],
  ['R.Arm 2', 'L.Arm 2'],
  ['R.Leg 2', 'L.Leg 2'],
];

// Body/Body 2: self-mirroring within the same region.
//   frt / bk / top / bot → x-flip within the same face
//   R ↔ L               → swap faces with x-flip (same region)
const BODY_LABELS = new Set(['Body', 'Body 2']);

// Face cross-map used by both limb pairs and body self-mirror
const FACE_CROSS = { R: 'L', L: 'R', frt: 'frt', bk: 'bk', top: 'top', bot: 'bot' };

function effectiveW(region) {
  return region.arm ? (state.skinIsSlim ? 3 : 4) : region.box.W;
}

function localFaces(region) {
  return buildBoxFaces(0, 0, effectiveW(region), region.box.H, region.box.D);
}

function faceAt(region, lx, ly) {
  for (const f of localFaces(region)) {
    if (lx >= f.x && lx < f.x + f.w && ly >= f.y && ly < f.y + f.h) return f;
  }
  return null;
}

// Returns the mirror skin-coordinate {px, py} for a given pixel, or null.
// Null means: legacy skin, excluded region (Head/Hat), region padding, or
// the pixel maps exactly to itself (center of an odd-width face).
export function getMirrorPixel(px, py) {
  if (state.skinIsLegacy) return null;

  const region = SKIN_REGIONS.find(r =>
    px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h
  ) ?? null;
  if (!region) return null;

  const lx = px - region.x;
  const ly = py - region.y;

  const face = faceAt(region, lx, ly);
  if (!face) return null; // pixel is in region padding (e.g. slim arm gap)

  const targetFaceLabel = FACE_CROSS[face.label];

  // --- Body self-mirror ---
  if (BODY_LABELS.has(region.label)) {
    const targetFace = localFaces(region).find(f => f.label === targetFaceLabel);
    if (!targetFace) return null;

    const mirroredFaceX = face.w - 1 - (lx - face.x);
    const localFaceY    = ly - face.y;

    const result = {
      px: region.x + targetFace.x + mirroredFaceX,
      py: region.y + targetFace.y + localFaceY,
    };
    // Skip if the pixel maps to itself (center of an odd-width face)
    if (result.px === px && result.py === py) return null;
    return result;
  }

  // --- Limb pair mirror ---
  let pairedLabel = null;
  for (const [a, b] of LIMB_PAIRS) {
    if (region.label === a) { pairedLabel = b; break; }
    if (region.label === b) { pairedLabel = a; break; }
  }
  if (!pairedLabel) return null; // Head, Hat, etc.

  const paired = SKIN_REGIONS.find(r => r.label === pairedLabel) ?? null;
  if (!paired) return null;

  const targetFace = localFaces(paired).find(f => f.label === targetFaceLabel);
  if (!targetFace) return null;

  const mirroredFaceX = face.w - 1 - (lx - face.x);
  const localFaceY    = ly - face.y;

  return {
    px: paired.x + targetFace.x + mirroredFaceX,
    py: paired.y + targetFace.y + localFaceY,
  };
}
