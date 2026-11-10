import { OrderingError } from "./engine.js";

export async function authorizeOrdering(request, { enabled, allowedUids = [], verifyIdToken, now = Date.now() }) {
  if (!enabled) throw new OrderingError("AI_DISABLED", 503);
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ") || authorization.length > 10000) throw new OrderingError("UNAUTHORIZED", 401);
  let user;
  try {
    user = await verifyIdToken(authorization.slice(7));
    if (typeof user.uid !== "string" || !user.uid || !Number.isFinite(user.exp) || user.exp * 1000 <= now) throw new Error("invalid");
  } catch {
    throw new OrderingError("UNAUTHORIZED", 401);
  }
  if (allowedUids.length && !allowedUids.includes(user.uid)) throw new OrderingError("PILOT_ONLY", 403);
  return user;
}

export async function readOrderingBody(request, limit = 96000) {
  const reader = request.body?.getReader();
  if (!reader) throw new OrderingError("INVALID_REQUEST");
  let size = 0;
  const chunks = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new OrderingError("REQUEST_TOO_LARGE", 413); }
    chunks.push(Buffer.from(value));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new OrderingError("INVALID_JSON"); }
}
