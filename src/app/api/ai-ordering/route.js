import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { handleOrdering } from "@/lib/ordering/service";
import { OrderingError } from "@/lib/ordering/engine";
import { authorizeOrdering, readOrderingBody } from "@/lib/ordering/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function headers(request) {
  const origin = request.headers.get("origin");
  const allowed = (process.env.AI_ORDERING_ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
  return {
    "Cache-Control": "no-store", "Vary": "Origin",
    ...(origin && allowed.includes(origin) && { "Access-Control-Allow-Origin": origin }),
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
export function OPTIONS(request) {
  return new Response(null, { status: 204, headers: headers(request) });
}

export async function POST(request) {
  const startedAt = Date.now();
  let action = "unknown";
  try {
    const allowedUsers = (process.env.AI_ORDERING_ALLOWED_UIDS || "").split(",").map((value) => value.trim()).filter(Boolean);
    const user = await authorizeOrdering(request, { enabled: process.env.AI_ORDERING_ENABLED === "true", allowedUids: allowedUsers,
      verifyIdToken: (token) => getAdminAuth().verifyIdToken(token),
    });
    const body = await readOrderingBody(request);
    action = ["text", "tool", "voice", "checkout"].includes(body?.action) ? body.action : "unknown";
    if (["text", "voice"].includes(action) && !process.env.OPENAI_API_KEY) throw new OrderingError("AI_NOT_CONFIGURED", 503);
    if (["text", "voice"].includes(action) && (process.env.AI_ORDERING_PROVIDER || "openai") !== "openai") throw new OrderingError("AI_NOT_CONFIGURED", 503);
    const result = await handleOrdering(getAdminDb(), user.uid, body);
    console.info(JSON.stringify({ event: "ordering_request", action, ok: true, elapsedMs: Date.now() - startedAt, usage: result.usage }));
    return Response.json(result, { headers: headers(request) });
  } catch (error) {
    const code = error instanceof OrderingError ? error.code : "ORDERING_FAILED";
    const status = error instanceof OrderingError ? error.status : 500;
    console.error(JSON.stringify({ event: "ordering_request", action, ok: false, code, elapsedMs: Date.now() - startedAt }));
    return Response.json({ error: code }, { status, headers: { ...headers(request), ...(status === 429 && { "Retry-After": "60" }) } });
  }
}
