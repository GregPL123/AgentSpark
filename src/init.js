// ─── BOOT ─────────────────────────────────────────────────────────────────────
// Thin entry that wires up PWA, gestures and navigation.
// Heavy logic has been extracted to dedicated modules:
//   pwa.js        — manifest, service worker, install banner, update toast
//   gestures.js   — swipe cards, sheet dismiss, tab spring, nav auto-hide
//   navigation.js — drawer, context bar, back-to-top, home panels, accordion
import { initPWA, showSwToast } from './pwa.js';
import { initTabSpring, initSheetDismiss } from './gestures.js';
import {
  toggleDrawer, openDrawer, closeDrawer,
  scrollToTop, switchHomePanel,
  toggleAccordion, initNavigation,
} from './navigation.js';
import { t } from './i18n.js';

// Boot PWA (manifest, SW, offline bar, install banner)
initPWA();

// Touch gestures
initTabSpring();
initSheetDismiss();

// Navigation (drawer, context bar, patches to showScreen / showInstructions)
initNavigation(t);

// Re-export symbols expected by main.js window._app bridge
export {
  toggleDrawer, openDrawer, closeDrawer,
  scrollToTop, switchHomePanel,
  showSwToast,
};

// toggleAccordion needs to be on window for inline onclick in accordion HTML
window.toggleAccordion = toggleAccordion;
