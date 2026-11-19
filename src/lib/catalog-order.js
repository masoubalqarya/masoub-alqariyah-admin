const rank = (value) => Number.isFinite(value) ? value : 0;
const names = new Intl.Collator("ar", { numeric: true, sensitivity: "base" });
const byName = (a, b) => names.compare(a.nameAr || a.nameEn || "", b.nameAr || b.nameEn || "") || String(a.id).localeCompare(String(b.id), "en");

export function sortCategories(categories) {
  return [...categories].sort((a, b) => rank(a.sortOrder) - rank(b.sortOrder) || byName(a, b));
}

// Featured placement is independent: a product's category position always wins here.
export function sortProducts(items, categories) {
  const positions = new Map(sortCategories(categories).map((category, index) => [category.id, index]));
  return [...items].sort((a, b) => {
    const category = (positions.get(a.category) ?? Infinity) - (positions.get(b.category) ?? Infinity);
    if (category) return category;
    const categoryId = String(a.category).localeCompare(String(b.category), "en");
    if (categoryId) return categoryId;
    return rank(a.sortOrder) - rank(b.sortOrder) || byName(a, b);
  });
}

export function sortFeaturedProducts(items) {
  return items.filter((item) => item.isFeatured === true).sort((a, b) => rank(a.featuredRank) - rank(b.featuredRank) || byName(a, b));
}

export function nextPosition(items, field = "sortOrder") {
  return Math.max(0, ...items.map((item) => Number.isFinite(item[field]) ? item[field] : 0)) + 1;
}
