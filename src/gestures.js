// ─── GESTURES ─────────────────────────────────────────────────────────────────
// Touch & scroll gesture handlers:
//   initTabSpring()       — iOS-style spring rebound on tab bar press
//   initSheetDismiss()    — swipe-down to dismiss bottom sheets (.ios-sheet)
//   initSwipeGestures()   — horizontal swipe-to-delete on project cards
//   initNavHideOnScroll() — hides header + tab bar on scroll down, shows on up

// ── Tab spring ────────────────────────────────────────────────────────────────
export function initTabSpring() {
  const tabBar = document.getElementById('ios-tab-bar');
  if (!tabBar) return;

  tabBar.addEventListener('touchstart', e => {
    const btn = e.target.closest('.ios-tab-btn');
    if (!btn) return;
    btn.style.transform  = 'scale(0.88)';
    btn.style.transition = 'transform 0.08s ease';
  }, { passive: true });

  tabBar.addEventListener('touchend', e => {
    const btn = e.target.closest('.ios-tab-btn');
    if (!btn) return;
    btn.style.transform  = 'scale(1.06)';
    btn.style.transition = 'transform 0.12s cubic-bezier(0.34,1.56,0.64,1)';
    setTimeout(() => {
      btn.style.transform  = 'scale(1)';
      btn.style.transition = 'transform 0.18s ease';
    }, 120);
  }, { passive: true });
}

// ── Sheet dismiss (swipe-down) ────────────────────────────────────────────────
export function initSheetDismiss() {
  let _startY    = 0;
  let _sheet     = null;
  let _overlay   = null;
  let _startTop  = 0;
  const DISMISS_THRESHOLD = 100; // px

  document.addEventListener('touchstart', e => {
    const handle = e.target.closest('.ios-sheet-handle');
    if (!handle) return;
    _sheet   = handle.closest('.ios-sheet');
    _overlay = _sheet?.closest('.ios-sheet-overlay');
    if (!_sheet) return;
    _startY   = e.touches[0].clientY;
    _startTop = parseInt(getComputedStyle(_sheet).marginTop) || 0;
    _sheet.style.transition = 'none';
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!_sheet) return;
    const dy = e.touches[0].clientY - _startY;
    if (dy < 0) return; // don't allow dragging up
    _sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (!_sheet) return;
    const dy = e.changedTouches[0].clientY - _startY;
    _sheet.style.transition = '';

    if (dy > DISMISS_THRESHOLD) {
      // Dismiss
      _sheet.style.transform = `translateY(100%)`;
      setTimeout(() => {
        if (_overlay) _overlay.classList.remove('open');
        _sheet.style.transform = '';
      }, 300);
    } else {
      // Snap back
      _sheet.style.transform = '';
    }
    _sheet   = null;
    _overlay = null;
  }, { passive: true });
}

// ── Swipe-to-delete on project cards ─────────────────────────────────────────
export function initSwipeGestures() {
  const containers = [
    document.getElementById('projects-list'),
    document.getElementById('home-projects-list'),
  ].filter(Boolean);

  containers.forEach(container => {
    let _startX    = 0;
    let _startY    = 0;
    let _card      = null;
    let _dragging  = false;
    const SWIPE_THRESHOLD = 80;

    container.addEventListener('touchstart', e => {
      _card    = e.target.closest('.project-card');
      if (!_card) return;
      _startX  = e.touches[0].clientX;
      _startY  = e.touches[0].clientY;
      _dragging = false;
      _card.style.transition = 'none';
    }, { passive: true });

    container.addEventListener('touchmove', e => {
      if (!_card) return;
      const dx = e.touches[0].clientX - _startX;
      const dy = e.touches[0].clientY - _startY;

      // Only activate on predominantly horizontal swipe
      if (!_dragging && Math.abs(dy) > Math.abs(dx)) { _card = null; return; }
      _dragging = true;

      if (dx < 0) {
        _card.style.transform = `translateX(${dx}px)`;
        _card.style.opacity   = String(1 + dx / 200);
      }
    }, { passive: true });

    container.addEventListener('touchend', e => {
      if (!_card || !_dragging) return;
      const dx = e.changedTouches[0].clientX - _startX;
      _card.style.transition = 'transform 0.25s ease, opacity 0.25s ease';

      if (dx < -SWIPE_THRESHOLD) {
        // Trigger delete
        _card.style.transform = 'translateX(-120%)';
        _card.style.opacity   = '0';
        const id = _card.dataset.projectId || _card.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        if (id) {
          setTimeout(() => window.deleteProject?.(id), 260);
        }
      } else {
        // Snap back
        _card.style.transform = '';
        _card.style.opacity   = '';
      }
      _card     = null;
      _dragging = false;
    }, { passive: true });
  });
}

// ── Nav hide on scroll ────────────────────────────────────────────────────────
export function initNavHideOnScroll() {
  const header = document.querySelector('header');
  const tabBar = document.getElementById('ios-tab-bar');

  let _lastY      = 0;
  let _hidden     = false;
  let _ticking    = false;
  const THRESHOLD = 8;

  function _update() {
    const y   = window.scrollY;
    const dy  = y - _lastY;

    if (Math.abs(dy) < THRESHOLD) { _ticking = false; return; }

    const shouldHide = dy > 0 && y > 60;

    if (shouldHide !== _hidden) {
      _hidden = shouldHide;
      header?.classList.toggle('hidden-by-scroll', _hidden);
      tabBar?.classList.toggle('hidden-by-scroll', _hidden);
    }

    _lastY   = y;
    _ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!_ticking) {
      requestAnimationFrame(_update);
      _ticking = true;
    }
  }, { passive: true });

  // Return a reset function (called by navigation.js patchShowScreen on screen change)
  return function resetNavHide() {
    _hidden = false;
    header?.classList.remove('hidden-by-scroll');
    tabBar?.classList.remove('hidden-by-scroll');
    _lastY = window.scrollY;
  };
}
