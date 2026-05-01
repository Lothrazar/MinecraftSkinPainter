// DOM helpers
const $   = id  => document.getElementById(id);
const qs  = sel => document.querySelector(sel);
const qsa = sel => document.querySelectorAll(sel);

// URL query param helper
const qp = q => new URLSearchParams(window.location.search).get(q);
