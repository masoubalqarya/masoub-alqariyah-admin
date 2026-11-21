import { ADMIN_PAGES } from "./admin-guides.js";

// Each entry maps existing help content to a stable, non-destructive UI target.
export const ADMIN_TOUR_STEPS = [
  { page: "login", section: 0, target: "sidebar-nav" },
  { page: "login", section: 1, target: "language" },
  { page: "login", section: 2, target: "replay-tour" },
  { page: "dashboard", section: 0, target: "dashboard-stats" },
  { page: "dashboard", section: 1, target: "dashboard-recent" },
  { page: "dashboard", section: 2, target: "sidebar-nav" },
  { page: "orders", section: 0, target: "orders-filters" },
  { page: "orders", section: 1, target: "order-advance" },
  { page: "orders", section: 2, target: "order-edit" },
  { page: "orders", section: 3, target: "order-details" },
  { page: "menu", section: 0, target: "menu-add", tab: "items" },
  { page: "menu", section: 1, target: "menu-items", tab: "items" },
  { page: "menu", section: 2, target: "menu-categories", tab: "categories", labelKey: "categories" },
  { page: "menu", section: 2, target: "menu-ordering", tab: "ordering", labelKey: "arrangeMenu" },
  { page: "menu", section: 3, target: "menu-sizes", tab: "sizes", labelKey: "sizeOptions" },
  { page: "menu", section: 3, target: "menu-extras", tab: "extras", labelKey: "extrasOptions" },
  { page: "menu", section: 3, target: "menu-allergies", tab: "allergies", labelKey: "allergiesOptions" },
  { page: "menu", section: 4, target: "menu-add", tab: "items" },
  { page: "offers", section: 0, target: "offers-add" },
  { page: "offers", section: 1, target: "offers-heading" },
  { page: "offers", section: 2, target: "offers-heading" },
  { page: "app-settings", section: 0, target: "app-hero" },
  { page: "app-settings", section: 1, target: "app-updates" },
  { page: "app-settings", section: 2, target: "app-settings-save" },
  { page: "restaurants", section: 0, target: "restaurants-add" },
  { page: "restaurants", section: 1, target: "restaurant-availability" },
  { page: "restaurants", section: 2, target: "nav-users" },
  { page: "users", section: 0, target: "users-filters", tab: "users" },
  { page: "users", section: 1, target: "users-employees", tab: "employees" },
  { page: "users", section: 2, target: "users-employees", tab: "employees" },
  { page: "users", section: 3, target: "attendance-demo", tab: "employees" },
  { page: "attendance", section: 0, target: "attendance-date", tab: "daily" },
  { page: "attendance", section: 1, target: "attendance-daily", tab: "daily" },
  { page: "attendance", section: 2, target: "attendance-report", tab: "monthly" },
  { page: "attendance", section: 3, target: "attendance-settings", tab: "settings" },
  { page: "attendance", section: 4, target: "attendance-reference", tab: "daily" },
  { page: "analytics", section: 0, target: "analytics-period" },
  { page: "analytics", section: 1, target: "analytics-stats" },
  { page: "analytics", section: 2, target: "analytics-charts" },
  { page: "help", section: 0, target: "help-search" },
  { page: "help", section: 1, target: "help-browse" },
  { page: "help", section: 2, target: "help-start-tour" },
];

export const tourSelector = (name) => `[data-tour="${name}"]`;

export function firstTourStep(pageId) {
  return Math.max(0, ADMIN_TOUR_STEPS.findIndex((step) => step.page === pageId));
}

export function tourRoute(pageId) {
  const page = ADMIN_PAGES.find((entry) => entry.id === pageId);
  return page.id === "login" ? "/" : page.href;
}

export async function prepareTourStep(spec, { navigate, pathname, signal }) {
  const route = tourRoute(spec.page);
  if (pathname !== route) navigate(route);
  // Sign-in guidance uses the shell; it must never send an admin to /login.
  await waitForTourElement(`[data-tour-page="${spec.page === "login" ? "dashboard" : spec.page}"]`, { signal });
  if (spec.tab) {
    const tab = await waitForTourElement(`[data-tour-tab="${spec.page}-${spec.tab}"]`, { signal });
    // Radix Tabs activates on keyboard/mousedown, not a synthetic click.
    tab.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await waitForTourElement(tourSelector(`${spec.page}-${spec.tab}`), { signal });
  }
}

// Navigation and tab mounting finish before Joyride measures the target.
// Cancellation disconnects observers when the tour ends or a chapter changes.
export function waitForTourElement(selector, { signal, timeout = 12000 } = {}) {
  return new Promise((resolve, reject) => {
    let observer;
    let timer;
    const cleanup = () => {
      observer?.disconnect();
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
    };
    const cancel = () => { cleanup(); reject(new Error("Tour cancelled")); };
    const check = () => {
      const element = document.querySelector(selector);
      if (!element || !element.getClientRects().length || getComputedStyle(element).visibility === "hidden") return;
      cleanup();
      resolve(element);
    };
    if (signal?.aborted) { cancel(); return; }
    observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    signal?.addEventListener("abort", cancel, { once: true });
    timer = setTimeout(() => { cleanup(); reject(new Error(`Tour target unavailable: ${selector}`)); }, timeout);
    check();
  });
}
