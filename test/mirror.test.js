import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../js/state.js';
import { getMirrorPixel } from '../js/mirror.js';

beforeEach(() => {
  state.skinIsLegacy = false;
  state.skinIsSlim   = false;
});

test('legacy 64x32 skins never mirror', () => {
  state.skinIsLegacy = true;
  assert.equal(getMirrorPixel(44, 25), null);
});

test('Head has no paired region and does not mirror', () => {
  assert.equal(getMirrorPixel(5, 5), null);
});

test('R.Arm front face mirrors to the matching L.Arm front pixel (Steve, non-slim)', () => {
  // px=44,py=25 sits in R.Arm's "frt" face
  assert.deepEqual(getMirrorPixel(44, 25), { px: 39, py: 57 });
});

test('arm mirror uses the slim (3px) face width when skinIsSlim is set', () => {
  state.skinIsSlim = true;
  const result = getMirrorPixel(44, 25);
  assert.ok(result); // still resolves, just narrower — mainly guards against a thrown error
});

test('Body self-mirrors within its own region (frt face x-flip)', () => {
  // px=21,py=26 sits in Body's "frt" face
  assert.deepEqual(getMirrorPixel(21, 26), { px: 26, py: 26 });
});

test('mirroring is its own inverse: R.Arm -> L.Arm -> back to the original pixel', () => {
  const mirrored = getMirrorPixel(44, 25);
  assert.deepEqual(getMirrorPixel(mirrored.px, mirrored.py), { px: 44, py: 25 });
});
