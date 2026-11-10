import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { buildOrder, executeTool, validateCart, productDetails, normalizeArabic } from "./engine.js";
import { runTextConversation } from "./openai.js";
import { checkout, withReceipt, consumeLimit, handleOrdering } from "./service.js";

// Fixtures preserve the real catalog's identifiers and shape; no network/AI calls.
const catalog = {
  menuItems: [
    { id: "masoub_cream", nameEn: "Cream Masoub", nameAr: "معصوب قشطة", price: 12, category: "masoub", availableSizes: ["cup", "large"], sizePriceAdd: { large: 6 }, availableExtras: ["extra_cream"], cookingOptions: [{ id: "local", nameEn: "Local", nameAr: "محلي", priceAdd: 0, isDefault: true }] },
    { id: "areekah", nameEn: "Areekah", nameAr: "عريكة", price: 10, category: "areekah", aliases: ["عريكه"] },
    { id: "tea", nameEn: "Milk tea", nameAr: "شاي حليب", price: 3, category: "drinks" },
    { id: "unavailable", nameEn: "Unavailable", nameAr: "غير متوفر", price: 4, isAvailable: false },
  ],
  sizeOptions: [{ id: "cup", nameEn: "Cup", nameAr: "كوب", priceAdd: 0 }, { id: "large", nameEn: "Large", nameAr: "كبير", priceAdd: 10 }],
  extrasOptions: [{ id: "extra_cream", nameEn: "Cream", nameAr: "قشطة", price: 3 }],
  offers: [{ id: "breakfast", isActive: true, offerPrice: 10, titleEn: "Breakfast", titleAr: "فطور", items: [{ menuItemId: "areekah", qty: 1 }, { menuItemId: "tea", qty: 1 }] }],
  restaurants: [{ id: "jeddah", nameEn: "Jeddah", nameAr: "جدة", isActive: true, isOpen: true }],
};
const change = (values) => ({ action: "add", cartId: null, productId: null, quantity: 1, sizeId: null, cookingId: null, extraIds: null, ...values });
const edit = (cart, changes, op = "test") => executeTool(catalog, cart, "editCart", { changes }, op);
const order = { confirmed: true, expectedTotal: 3, plateNumber: "ABC 1234", carColor: "white", carModel: "Patrol", restaurantId: "jeddah", paymentMethod: "card", language: "ar" };
const teaCart = () => edit([], [change({ productId: "tea" })]).items;

test("Arabic multi-item order, quantity correction, customization, and removal", () => {
  let result = edit([], [change({ productId: "masoub_cream", sizeId: "cup", cookingId: "local", extraIds: ["extra_cream"] }), change({ productId: "areekah", quantity: 2 })]);
  assert.equal(result.total, 35);
  result = edit(result.items, [change({ action: "update", cartId: result.items[1].cartId, quantity: 1 })]);
  assert.equal(result.total, 25);
  result = edit(result.items, [change({ action: "remove", cartId: result.items[0].cartId })]);
  assert.equal(result.total, 10);
});

test("catalog prices override spoofed prices; per-item size overrides global price", () => {
  const line = edit([], [change({ productId: "masoub_cream", sizeId: "large", cookingId: "local" })]).items[0];
  assert.equal(line.price, 18);
  assert.equal(validateCart(catalog, [{ ...line, price: 0, nameAr: "injected" }])[0].price, 18);
});

test("unsupported removal, unknown/duplicate modifiers, missing size, unavailable and malformed requests fail atomically", () => {
  for (const invalid of [
    change({ productId: "masoub_cream" }),
    change({ productId: "tea", extraIds: ["extra_cream"] }),
    change({ productId: "masoub_cream", sizeId: "cup", cookingId: "local", extraIds: ["extra_cream", "extra_cream"] }),
    change({ productId: "unavailable" }), change({ productId: "tea", quantity: -2 }),
    { ...change({ productId: "tea" }), withoutHoney: true },
  ]) {
    const original = teaCart();
    const copy = structuredClone(original);
    assert.throws(() => edit(original, [change({ productId: "areekah" }), invalid]));
    assert.deepEqual(original, copy);
  }
});

test("same configuration merges; different sizes remain separate; recommendations use available ids", () => {
  const first = change({ productId: "masoub_cream", sizeId: "cup", cookingId: "local" });
  const result = edit([], [first, first, { ...first, sizeId: "large" }]);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].quantity, 2);
  const recommendations = executeTool(catalog, result.items, "getRecommendations", {}, "read").products;
  assert(!recommendations.some((product) => ["unavailable", "masoub_cream"].includes(product.id)));
  assert.equal(normalizeArabic("عَرِيكَة"), normalizeArabic("عريكه"));
  assert.equal(executeTool(catalog, [], "searchProducts", { query: "عريكه" }, "search").products[0].id, "areekah");
});

test("legacy offer groups are canonicalized with existing proportional pricing and cannot be partially edited", () => {
  const inputs = ["areekah", "tea"].map((id, index) => ({ id, cartId: `offer_${index}`, offerGroupId: "breakfast", quantity: 2, offerQty: 2, price: 0 }));
  const lines = validateCart(catalog, inputs);
  assert.equal(lines[0].price, 7.69);
  assert.equal(lines[1].price, 2.31);
  assert.throws(() => edit(lines, [change({ action: "remove", cartId: "offer_0" })]), /LINE_NOT_EDITABLE/);
  assert.throws(() => validateCart(catalog, inputs.slice(1)), /OFFER_UNAVAILABLE/);
});

test("checkout requires explicit confirmation, current prices, car and open restaurant; preserves POS fields", () => {
  assert.throws(() => buildOrder(catalog, teaCart(), { ...order, confirmed: false }, "u", "12345"), /CONFIRMATION_REQUIRED/);
  assert.throws(() => buildOrder(catalog, teaCart(), { ...order, expectedTotal: 1 }, "u", "12345"), /PRICE_CHANGED/);
  assert.throws(() => buildOrder(catalog, teaCart(), { ...order, plateNumber: "" }, "u", "12345"), /CAR_REQUIRED/);
  assert.throws(() => buildOrder({ ...catalog, restaurants: [] }, teaCart(), order, "u", "12345"), /RESTAURANT_UNAVAILABLE/);
  const payload = buildOrder(catalog, teaCart(), { ...order, paymentMethod: "cash", cashAmount: 10, needsChange: true }, "u", "12345");
  assert.equal(payload.status, "pending");
  assert.equal(payload.userId, "u");
  assert.equal(payload.changeAmount, 7);
  assert.equal(payload.items[0].itemId, "tea");
  assert(!Object.hasOwn(payload.items[0], "cartId"));
});

function memoryDb() {
  const records = new Map();
  let version = 0;
  return { records, collection: (collection) => ({ doc: (id) => {
    const key = `${collection}/${id}`;
    return {
      get: async () => { const item = records.get(key); return { exists: !!item, updateTime: item?.version, data: () => item?.data }; },
      create: async (data) => { if (records.has(key)) throw Object.assign(new Error(), { code: "firestore/already-exists" }); records.set(key, { data: structuredClone(data), version: ++version }); },
      set: async (data, options = {}) => {
        const current = records.get(key);
        if (options.updateTime && current?.version !== options.updateTime) throw Object.assign(new Error(), { code: "firestore/precondition-failed" });
        records.set(key, { data: { ...current?.data, ...structuredClone(data) }, version: ++version });
      },
    };
  } }) };
}

test("durable receipts isolate users, reject reused keys with changed requests, and omit transcripts", async () => {
  const db = memoryDb();
  const body = { requestId: "abcdefgh", action: "text" };
  let calls = 0;
  const operation = async () => { calls++; return { items: teaCart(), reply: "private transcript" }; };
  await withReceipt(db, "u1", body, operation);
  const repeat = await withReceipt(db, "u1", body, operation);
  assert.equal(repeat.replayed, true);
  assert.equal(calls, 1);
  assert(!JSON.stringify([...db.records]).includes("private transcript"));
  await assert.rejects(withReceipt(db, "u1", { ...body, extra: true }, operation), /IDEMPOTENCY_CONFLICT/);
  await withReceipt(db, "u2", body, operation);
  assert.equal(calls, 2);
});

test("concurrent checkout and retries after lost responses produce one order", async () => {
  const db = memoryDb();
  const body = { cart: teaCart(), requestId: "checkout_test", order };
  const results = await Promise.all([checkout(db, "u", body, catalog), checkout(db, "u", body, catalog)]);
  assert.equal(results[0].docId, results[1].docId);
  assert.equal(db.records.size, 1);
  // A retry still resolves if the product has since sold out.
  assert.deepEqual(await checkout(db, "u", body, { ...catalog, menuItems: [] }), results[0]);
});

test("CAS rate counters enforce shared limits under concurrency", async () => {
  const db = memoryDb();
  const results = await Promise.allSettled(Array.from({ length: 5 }, () => consumeLimit(db, "same", 2, Date.now() + 1000)));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 2);
});

test("mocked Arabic conversation executes real tools and returns current authoritative cart", async () => {
  let calls = 0;
  const request = async (_path, input) => {
    assert.equal(input.store, false);
    assert(!JSON.stringify(input.tools).includes('"maxLength"'));
    assert(input.tools.every((tool) => tool.strict && tool.parameters.additionalProperties === false));
    calls++;
    return { json: async () => calls === 1 ? { status: "completed", output: [
      { type: "function_call", call_id: "call1", name: "editCart", arguments: JSON.stringify({ changes: [change({ productId: "areekah", quantity: 2 }), change({ productId: "tea", quantity: 3 })] }) },
    ] } : { status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "أبشر، عريكتين وثلاثة شاي حليب." }] }] } };
  };
  const result = await runTextConversation({ catalog, cart: [], messages: [{ role: "user", text: "أبغى عريكتين وثلاثة شاي حليب" }], language: "ar", requestId: "arabic", request });
  assert.equal(result.items[0].quantity, 2);
  assert.equal(result.items[1].quantity, 3);
  assert.equal(result.items.reduce((sum, item) => sum + item.price * item.quantity, 0), 29);
  assert.equal(calls, 2);
});

test("product details expose attached options only", () => {
  assert.equal(productDetails(catalog, "tea").extras.length, 0);
  assert.equal(productDetails(catalog, "masoub_cream").extras[0].id, "extra_cream");
});

test("malformed extras and missing checkout data return validation errors", () => {
  assert.throws(() => validateCart(catalog, [{ ...teaCart()[0], selectedExtras: [null] }]), /UNSUPPORTED_OPTION/);
  assert.throws(() => buildOrder(catalog, teaCart(), null, "u", "12345"), /INVALID_REQUEST/);
});

test("checkout replay does not depend on a successful catalog read", async () => {
  const db = memoryDb();
  const body = { action: "checkout", requestId: "checkout_offline", cart: teaCart(), order, language: "ar", revision: 0 };
  const first = await handleOrdering(db, "u", body, { readCatalog: async () => catalog });
  const replay = await handleOrdering(db, "u", body, { readCatalog: async () => { throw new Error("catalog offline"); } });
  assert.deepEqual(replay, first);
  assert.equal([...db.records.keys()].filter((key) => key.startsWith("orders/")).length, 1);
});

test("a later text edit invalidates an earlier review request", async () => {
  let turn = 0;
  const request = async () => ({ json: async () => {
    turn++;
    if (turn === 3) return { status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "Updated" }] }] };
    return { status: "completed", output: [{ type: "function_call", call_id: `call${turn}`,
      name: turn === 1 ? "proceedToCheckout" : "editCart",
      arguments: JSON.stringify(turn === 1 ? {} : { changes: [change({ productId: "areekah" })] }),
    }] };
  } });
  const result = await runTextConversation({ catalog, cart: teaCart(), messages: [{ role: "user", text: "add areekah" }], language: "en", requestId: "review_edit", request });
  assert.equal(result.reviewRequired, false);
  assert.equal(result.items.length, 2);
});

test("incomplete provider responses cannot execute cart tools", async () => {
  await assert.rejects(runTextConversation({ catalog, cart: [], messages: [{ role: "user", text: "tea" }],
    request: async () => ({ json: async () => ({ status: "incomplete", output: [{ type: "function_call", name: "editCart", arguments: "{}" }] }) }),
  }), /AI_INCOMPLETE/);
});

test("real seed: معصوب قشطة وعريكتين after explicit cup/local clarification", () => {
  const seed = JSON.parse(readFileSync(new URL("./fixtures/catalog.json", import.meta.url), "utf8"));
  const result = executeTool(seed, [], "editCart", { changes: [
    change({ productId: "masoub", sizeId: "cup", cookingId: "local", extraIds: ["extra_cream"] }),
    change({ productId: "areekah", sizeId: "cup", cookingId: "local", quantity: 2 }),
  ] }, "real_seed");
  assert.equal(result.total, 18);
  const corrected = executeTool(seed, result.items, "editCart", { changes: [change({ action: "update", cartId: result.items[1].cartId, quantity: 1 })] }, "correction");
  assert.equal(corrected.total, 13);
  assert.equal(corrected.items[0].selectedExtras[0].nameAr, "قشطة");
});

test("real seed: فولين وتميس وثلاثة شاي حليب after option clarification", () => {
  const seed = JSON.parse(readFileSync(new URL("./fixtures/catalog.json", import.meta.url), "utf8"));
  const result = executeTool(seed, [], "editCart", { changes: [
    change({ productId: "foul", sizeId: "small", cookingId: "qallaba", quantity: 2 }),
    change({ productId: "tamees", cookingId: "local", quantity: 1 }),
    change({ productId: "milk_tea", cookingId: "local", quantity: 3 }),
  ] }, "real_seed");
  assert.deepEqual(result.items.map((line) => line.quantity), [2, 1, 3]);
  assert.equal(result.total, 13);
});

test("real seed offer price matches the existing mobile proportional pricing", () => {
  const seed = JSON.parse(readFileSync(new URL("./fixtures/catalog.json", import.meta.url), "utf8"));
  const cart = seed.offers[0].items.map((item, index) => ({ id: item.menuItemId, cartId: `offer_${index}`, quantity: item.qty, offerQty: 1, offerGroupId: "offer1" }));
  const canonical = validateCart(seed, cart);
  assert.equal(canonical.reduce((sum, line) => sum + line.price * line.quantity, 0), 5);
});
