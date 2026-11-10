import assert from "node:assert/strict";
import { test } from "node:test";
import { authorizeOrdering, readOrderingBody } from "./security.js";

test("kill switch, missing/invalid/expired tokens and pilot allowlist deny access", async () => {
  const request = new Request("https://example.test", { headers: { Authorization: "Bearer signed" } });
  const options = { enabled: true, now: 1000, verifyIdToken: async () => ({ uid: "guest1", exp: 60, firebase: { sign_in_provider: "anonymous" } }) };
  await assert.rejects(authorizeOrdering(request, { ...options, enabled: false }), /AI_DISABLED/);
  await assert.rejects(authorizeOrdering(new Request("https://example.test"), options), /UNAUTHORIZED/);
  await assert.rejects(authorizeOrdering(request, { ...options, verifyIdToken: async () => { throw new Error("invalid signature"); } }), /UNAUTHORIZED/);
  await assert.rejects(authorizeOrdering(request, { ...options, now: 60000 }), /UNAUTHORIZED/);
  await assert.rejects(authorizeOrdering(request, { ...options, allowedUids: ["other"] }), /PILOT_ONLY/);
  assert.equal((await authorizeOrdering(request, { ...options, allowedUids: ["guest1"] })).uid, "guest1");
});

test("request stream has a byte limit and rejects malformed JSON", async () => {
  const request = (body) => new Request("https://example.test", { method: "POST", body });
  await assert.rejects(readOrderingBody(request("x".repeat(100)), 32), /REQUEST_TOO_LARGE/);
  await assert.rejects(readOrderingBody(request("{broken")), /INVALID_JSON/);
  assert.deepEqual(await readOrderingBody(request('{"action":"tool"}')), { action: "tool" });
});
