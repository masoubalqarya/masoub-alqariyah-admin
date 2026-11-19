import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { moveItem } from "./reorder.js";
import { nextPosition, sortCategories, sortProducts, sortFeaturedProducts } from "./catalog-order.js";

test("drag and button moves insert at the chosen position without mutating the source", () => {
  const source = ["a", "b", "c", "d"];
  assert.deepEqual(moveItem(source, 0, 2), ["b", "c", "a", "d"]);
  assert.deepEqual(moveItem(source, 3, 0), ["d", "a", "b", "c"]);
  assert.deepEqual(source, ["a", "b", "c", "d"]);
  for (const [from, to] of [[0, 0], [-1, 2], [0, 4], [1.5, 2]]) assert.equal(moveItem(source, from, to), source);
});

test("categories follow saved positions with natural Arabic name tie-breaking", () => {
  const categories = [
    { id: "random-2", nameAr: "فئة 10", sortOrder: 1 },
    { id: "random-9", nameAr: "فئة 2", sortOrder: 1 },
    { id: "random-1", nameAr: "فئة 1", sortOrder: 2 },
  ];
  assert.deepEqual(sortCategories(categories).map((item) => item.id), ["random-9", "random-2", "random-1"]);
  assert.deepEqual(sortCategories([...categories].reverse()), sortCategories(categories));
});

test("category product order is independent of featured flags and featured ranks", () => {
  const categories = [{ id: "later", sortOrder: 2 }, { id: "first", sortOrder: 1 }];
  const products = [
    { id: "b", category: "first", sortOrder: 2, isFeatured: true, featuredRank: 1 },
    { id: "c", category: "later", sortOrder: 1 },
    { id: "a", category: "first", sortOrder: 1, isFeatured: true, featuredRank: 2 },
    { id: "d", category: "first", sortOrder: 3 },
  ];
  assert.deepEqual(sortProducts(products, categories).map((item) => item.id), ["a", "b", "d", "c"]);
  assert.deepEqual(sortFeaturedProducts(products).map((item) => item.id), ["b", "a"]);
  assert.deepEqual(sortProducts([...products].reverse(), categories), sortProducts(products, categories));
  assert.equal(products[0].id, "b");
});

test("new entries append after existing positions, including unarranged lists", () => {
  assert.equal(nextPosition([]), 1);
  assert.equal(nextPosition([{ sortOrder: 3 }, { sortOrder: 8 }]), 9);
  const existing = [{ id: "a" }, { id: "b", sortOrder: 4 }];
  const added = { id: "c", sortOrder: nextPosition(existing) };
  assert.equal(sortCategories([...existing, added]).at(-1).id, "c");
  assert.equal(nextPosition([{ featuredRank: 7 }], "featuredRank"), 8);
});

test("admin, mobile and web use identical ordering helpers", () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.equal(read("./catalog-order.js"), read("../../../masoub-alqarya/src/utils/catalog-order.js"));
  assert.equal(read("./catalog-order.js"), read("../../../masoub-alqariyah-website/src/lib/catalog-order.js"));
});
