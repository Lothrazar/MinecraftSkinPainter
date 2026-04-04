//  Shared helpers 
const $ = id => document.getElementById(id);
const qp = q => new URLSearchParams(window.location.search).get(q);

//  Shared state ─
let currentSkinUrl    = null;
let currentPlayerName = null;
let currentUuid       = null;

// Editor tool state
let tool         = 'pencil';
let drawing      = false;
let brushColor   = '#ffffff';
let brushSize    = 1;
let gridVisible  = false;
let regionVisible = false;

// Skin metadata
let skinHeight   = 64;
let skinIsLegacy = false;
let skinIsSlim   = false;

// Canvas scale: 64 skin px × 8 = 512 canvas px
const SCALE = 8;

// Undo / redo stacks
const undoStack = [];
const redoStack = [];
const MAX_UNDO  = 50;
