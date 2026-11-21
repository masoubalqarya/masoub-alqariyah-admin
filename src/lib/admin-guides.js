// Keep navigation, walkthrough chapters and help articles aligned with UI routes.
export const ADMIN_PAGES = [
  { id: "login", href: "/login", labelKey: "login", category: "start" },
  { id: "dashboard", href: "/", labelKey: "dashboard", category: "start" },
  { id: "orders", href: "/orders", labelKey: "orders", category: "operations" },
  { id: "menu", href: "/menu", labelKey: "menu", category: "catalog" },
  { id: "offers", href: "/offers", labelKey: "offers", category: "catalog" },
  { id: "app-settings", href: "/app-settings", labelKey: "appSettings", category: "catalog" },
  { id: "restaurants", href: "/restaurants", labelKey: "restaurants", category: "operations" },
  { id: "users", href: "/users", labelKey: "users", category: "team" },
  { id: "attendance", href: "/attendance", labelKey: "attendance", category: "team" },
  { id: "analytics", href: "/analytics", labelKey: "analytics", category: "operations" },
  { id: "help", href: "/help", labelKey: "helpCenter", category: "start" },
];

export function normalizeHelpSearch(value) {
  return value.toLowerCase().normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").trim();
}

export function filterHelpPages(help, query, category = "all") {
  const terms = normalizeHelpSearch(query).split(/\s+/).filter(Boolean);
  return ADMIN_PAGES.filter((page) => {
    if (category !== "all" && page.category !== category) return false;
    const guide = help.guides[page.id];
    const text = normalizeHelpSearch([
      guide.title, guide.summary, help.categories[page.category],
      ...guide.sections.flatMap((section) => [section.title, section.body]),
      guide.troubleshooting,
    ].join(" "));
    return terms.every((term) => text.includes(term));
  });
}
