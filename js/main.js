//  Initialisation 

// Auto-lookup from URL query param (?q=username)
const _qp = qp('q');
if (_qp) { $('username').value = _qp; lookup(); }

// Seed the favorites toggle button state on load
updateFavToggleBtn();
