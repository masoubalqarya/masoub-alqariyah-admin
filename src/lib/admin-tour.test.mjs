import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { ADMIN_PAGES } from "./admin-guides.js";
import { ADMIN_TOUR_STEPS, firstTourStep, prepareTourStep, tourRoute, waitForTourElement } from "./admin-tour.js";
import en from "./i18n/help-en.js";
import ar from "./i18n/help-ar.js";

test("all pages and help tasks have interactive steps and valid localized content", () => {
  const routes = readdirSync(new URL("../app/", import.meta.url), { recursive: true })
    .filter((path) => /(^|[\\/])page.jsx$/.test(path))
    .map((path) => "/" + path.replace(/[\\/]?page.jsx$/, "").replaceAll("\\", "/"));
  assert.deepEqual(ADMIN_PAGES.map((page) => page.href).sort(), routes.sort());
  for (const locale of [en, ar]) {
    for (const page of ADMIN_PAGES) {
      assert.equal(ADMIN_TOUR_STEPS[firstTourStep(page.id)].page, page.id);
      locale.guides[page.id].sections.forEach((_, section) => {
        assert.ok(ADMIN_TOUR_STEPS.some((step) => step.page === page.id && step.section === section));
      });
    }
    for (const step of ADMIN_TOUR_STEPS) assert.ok(locale.guides[step.page].sections[step.section].body);
  }
  assert.equal(tourRoute("login"), "/");
  assert.equal(firstTourStep("unknown"), 0);
});

test("every target and tab has an explicit UI anchor", () => {
  const app = new URL("../app/", import.meta.url);
  const sources = readdirSync(app, { recursive: true }).filter((path) => path.endsWith("page.jsx"))
    .map((path) => readFileSync(new URL(path.replaceAll("\\", "/"), app), "utf8"))
    .concat(readFileSync(new URL("../components/Sidebar.jsx", import.meta.url), "utf8")).join("\n");
  for (const step of ADMIN_TOUR_STEPS) {
    if (step.target !== "nav-users") assert.ok(sources.includes(`data-tour="${step.target}"`), step.target);
    if (step.tab) assert.ok(sources.includes(`data-tour-tab="${step.page}-${step.tab}"`));
  }
});

function mockDom(t) {
  const nodes = new Map();
  const observers = new Set();
  const globals = {
    document: { body: {}, querySelector: (selector) => nodes.get(selector) || null },
    getComputedStyle: (element) => ({ visibility: element.hidden ? "hidden" : "visible" }),
    KeyboardEvent: class { constructor(type, options) { this.type = type; Object.assign(this, options); } },
    MutationObserver: class {
      constructor(callback) { this.callback = callback; }
      observe() { observers.add(this); }
      disconnect() { observers.delete(this); }
    },
  };
  for (const [key, value] of Object.entries(globals)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; });
  }
  const notify = () => [...observers].forEach((observer) => observer.callback());
  return {
    observers,
    notify,
    show(selector, props = {}) {
      const element = { getClientRects: () => [{}], ...props };
      nodes.set(selector, element);
      notify();
      return element;
    },
  };
}

test("target wait handles late mounting and hidden tabs, then disconnects", async (t) => {
  const dom = mockDom(t);
  const ready = waitForTourElement("#late");
  const target = dom.show("#late", { hidden: true });
  assert.equal(dom.observers.size, 1);
  target.hidden = false;
  dom.notify();
  assert.equal(await ready, target);
  assert.equal(dom.observers.size, 0);
});

test("skip/unmount cancellation and load timeout release pending observers", async (t) => {
  const dom = mockDom(t);
  const controller = new AbortController();
  const pending = waitForTourElement("#missing", { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, /cancelled/);
  assert.equal(dom.observers.size, 0);
  await assert.rejects(waitForTourElement("#missing", { timeout: 5 }), /unavailable/);
  assert.equal(dom.observers.size, 0);
});

test("cross-page steps await route and activate a Radix tab before proceeding", async (t) => {
  const dom = mockDom(t);
  const visited = [];
  let activated = false;
  const pending = prepareTourStep({ page: "menu", tab: "ordering" }, { pathname: "/help", navigate: (route) => visited.push(route) });
  assert.deepEqual(visited, ["/menu"]);
  dom.show('[data-tour-page="menu"]');
  dom.show('[data-tour-tab="menu-ordering"]', { dispatchEvent(event) {
    assert.equal(event.type, "keydown");
    assert.equal(event.key, "Enter");
    activated = true;
    dom.show('[data-tour="menu-ordering"]');
  } });
  await pending;
  assert.equal(activated, true);
  assert.equal(dom.observers.size, 0);
});

test("sign-in chapter stays authenticated and does not navigate to login", async (t) => {
  const dom = mockDom(t);
  dom.show('[data-tour-page="dashboard"]');
  await prepareTourStep({ page: "login" }, { pathname: "/", navigate: () => assert.fail("Unexpected navigation") });
});
