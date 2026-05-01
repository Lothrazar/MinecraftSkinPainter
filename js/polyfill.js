// DOM helpers — assigned to window so ES modules can access them as globals
window.$   = id  => document.getElementById(id);
window.qs  = sel => document.querySelector(sel);
window.qsa = sel => document.querySelectorAll(sel);

// URL query param helper
window.qp = q => new URLSearchParams(window.location.search).get(q);
