import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBoxFaces } from '../js/skin-data.js';

test('buildBoxFaces lays out the 6 UV faces of a box', () => {
  // Steve's right arm box: u=40, v=16, W=4, H=12, D=4
  const faces = buildBoxFaces(40, 16, 4, 12, 4);

  assert.deepEqual(faces, [
    { x: 44, y: 16, w: 4, h: 4,  label: 'top' },
    { x: 48, y: 16, w: 4, h: 4,  label: 'bot' },
    { x: 40, y: 20, w: 4, h: 12, label: 'R'   },
    { x: 44, y: 20, w: 4, h: 12, label: 'frt' },
    { x: 48, y: 20, w: 4, h: 12, label: 'L'   },
    { x: 52, y: 20, w: 4, h: 12, label: 'bk'  },
  ]);
});

test('buildBoxFaces scales side-face width with W and depth with D', () => {
  // Body box: u=16, v=16, W=8, H=12, D=4
  const faces = buildBoxFaces(16, 16, 8, 12, 4);
  const byLabel = Object.fromEntries(faces.map(f => [f.label, f]));

  assert.equal(byLabel.frt.w, 8); // front face is W wide
  assert.equal(byLabel.R.w, 4);   // side face is D wide
  assert.equal(byLabel.top.h, 4); // top face is D deep
});
