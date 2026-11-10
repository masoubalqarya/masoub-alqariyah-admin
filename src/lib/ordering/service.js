import { createHash } from "node:crypto";
import { OrderingError, requireValue, validateCart, executeTool, buildOrder } from "./engine.js";
import { createVoiceCall, runTextConversation } from "./openai.js";

export const hash = (value) => createHash("sha256").update(value).digest("hex");
const catalogCollections = ["menuItems", "sizeOptions", "extrasOptions", "offers", "restaurants"];
export async function readCatalog(db) {
  const entries = await Promise.all(catalogCollections.map(async (name) => {
    const snapshot = await db.collection(name).get();
    return [name, snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }))];
  }));
  return Object.fromEntries(entries);
}

// Durable CAS counters survive concurrent serverless instances. No raw UID/IP in logs.
export async function consumeLimit(db, key, limit, expiresAt) {
  const ref = db.collection("orderingRateLimits").doc(hash(key));
  for (let attempt = 0; attempt < 5; attempt++) {
    const snapshot = await ref.get();
    requireValue(!snapshot.exists || snapshot.data().count < limit, "RATE_LIMITED", 429);
    try {
      const value = { count: (snapshot.data()?.count || 0) + 1, expiresAt: new Date(expiresAt) };
      if (snapshot.exists) await ref.set(value, { updateTime: snapshot.updateTime });
      else await ref.create(value);
      return;
    } catch (error) {
      if (!["firestore/precondition-failed", "firestore/already-exists"].includes(error.code)) throw error;
    }
  }
  throw new OrderingError("AI_BUSY", 429);
}

export async function applyLimits(db, uid, action, now = Date.now()) {
  const minute = Math.floor(now / 60000);
  const day = Math.floor(now / 86400000);
  await consumeLimit(db, `${uid}:minute:${minute}`, 40, now + 3600000);
  if (["text", "voice"].includes(action)) {
    await consumeLimit(db, `global:day:${day}`, Number(process.env.AI_ORDERING_DAILY_REQUEST_LIMIT) || 500, now + 172800000);
    await consumeLimit(db, `${uid}:${action}:${day}`, action === "voice" ? 3 : 100, now + 172800000);
  }
}

/** Receipts contain cart data and hashes, never audio or conversation text. */
export async function withReceipt(db, uid, body, operation) {
  const ref = db.collection("orderingOperations").doc(hash(`${uid}:${body.requestId}`));
  const requestHash = hash(JSON.stringify(body));
  const expiresAt = new Date(Date.now() + 86400000);
  try {
    await ref.create({ requestHash, state: "processing", expiresAt });
  } catch (error) {
    if (error.code !== "firestore/already-exists") throw error;
    const existing = (await ref.get()).data();
    requireValue(existing?.requestHash === requestHash, "IDEMPOTENCY_CONFLICT", 409);
    requireValue(existing.state === "complete", "REQUEST_PENDING", 409);
    requireValue(existing.result, "RECONNECT_REQUIRED", 409);
    return { ...existing.result, replayed: true };
  }
  try {
    const result = await operation();
    const receipt = { ...result };
    delete receipt.reply;
    delete receipt.sdp;
    await ref.set({ state: "complete", ...(body.action !== "voice" && { result: receipt }) });
    return result;
  } catch (error) {
    // An uncertain provider outcome is never automatically replayed with the same key.
    await ref.set({ state: "failed" }).catch(() => {});
    throw error;
  }
}

export async function checkout(db, uid, body, catalogOrRead) {
  const id = `mobile_${hash(`${uid}:${body.requestId}`).slice(0, 48)}`;
  const ref = db.collection("orders").doc(id);
  // Resolve a lost HTTP response before revalidating prices/availability.
  const previous = await ref.get();
  if (previous.exists) {
    requireValue(previous.data().userId === uid, "FORBIDDEN", 403);
    return { docId: id, orderNumber: previous.data().orderNumber };
  }
  // A lost-response retry must resolve even if catalog reads are now unavailable.
  const catalog = typeof catalogOrRead === "function" ? await catalogOrRead() : catalogOrRead;
  const orderNumber = String(10000 + parseInt(hash(id).slice(0, 8), 16) % 90000);
  const order = buildOrder(catalog, body.cart, body.order, uid, orderNumber);
  try {
    await ref.create({ ...order, createdAt: new Date(), updatedAt: new Date() });
  } catch (error) {
    if (error.code !== "firestore/already-exists") throw error;
  }
  return { docId: id, orderNumber };
}

export async function handleOrdering(db, uid, body, dependencies = {}) {
  requireValue(body && typeof body === "object" && !Array.isArray(body), "INVALID_REQUEST");
  requireValue(Object.keys(body).every((key) => ["action", "requestId", "cart", "revision", "language", "messages", "tool", "args", "sdp", "order"].includes(key)), "INVALID_REQUEST");
  requireValue(["text", "tool", "voice", "checkout"].includes(body.action), "INVALID_ACTION");
  requireValue(typeof body.requestId === "string" && /^[\w-]{8,100}$/.test(body.requestId), "INVALID_REQUEST_ID");
  requireValue(body.language === "ar" || body.language === "en", "INVALID_LANGUAGE");
  requireValue(Number.isSafeInteger(body.revision) && body.revision >= 0, "INVALID_REVISION");
  await applyLimits(db, uid, body.action);
  if (body.action === "checkout") return checkout(db, uid, body, () => (dependencies.readCatalog || readCatalog)(db));
  const catalog = await (dependencies.readCatalog || readCatalog)(db);
  const cart = validateCart(catalog, body.cart);
  if (body.action === "text") {
    requireValue(Array.isArray(body.messages) && body.messages.length > 0 && body.messages.length <= 16, "INVALID_MESSAGES");
    requireValue(body.messages.at(-1)?.role === "user", "INVALID_MESSAGES");
    requireValue(body.messages.every((entry) => entry && ["user", "assistant"].includes(entry.role) && typeof entry.text === "string" && entry.text.length > 0 && entry.text.length <= 2000), "INVALID_MESSAGES");
    requireValue(body.messages.reduce((sum, entry) => sum + entry.text.length, 0) <= 12000, "INVALID_MESSAGES");
  }
  if (body.action === "voice") requireValue(typeof body.sdp === "string" && body.sdp.startsWith("v=0") && body.sdp.length < 50000, "INVALID_SDP");
  return withReceipt(db, uid, body, async () => {
    if (body.action === "tool") {
      const startedAt = Date.now();
      const result = executeTool(catalog, cart, body.tool, body.args, hash(body.requestId).slice(0, 24));
      console.info(JSON.stringify({ event: "ordering_tool", tool: body.tool, ok: true, elapsedMs: Date.now() - startedAt }));
      return { ...result, revision: body.revision };
    }
    if (body.action === "voice") return (dependencies.createVoiceCall || createVoiceCall)(body.sdp, body.language, hash(uid));
    return { ...await (dependencies.runTextConversation || runTextConversation)({ catalog, cart, messages: body.messages, language: body.language, requestId: hash(body.requestId), safetyId: hash(uid) }), revision: body.revision };
  });
}
