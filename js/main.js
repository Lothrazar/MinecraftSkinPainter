//  Initialisation 

// Restore saved theme (or default to cyan)
applyTheme(localStorage.getItem('mcpaint_theme') || 'cyan');

// Auto-lookup from URL query param (?q=username)
const _qp = qp('q');
if (_qp) { $('username').value = _qp; lookup(); }

// Seed the favorites toggle button state on load
updateFavToggleBtn();
