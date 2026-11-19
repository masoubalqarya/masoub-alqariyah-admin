"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { changeExistingOrder } from "@/hooks/useOrders";
import { changeId, changeSeconds, editGroups, initialEdit, editPatch } from "@/lib/order-edit";

export default function OrderChangePanel({ order, admin = false, onChanged }) {
  const { t, locale } = useI18n();
  const [now, setNow] = useState(Date.now);
  const [mode, setMode] = useState(null);
  const [draft, setDraft] = useState(() => initialEdit(order));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requests = useRef(new Map());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const seconds = changeSeconds(order, now);
  const allowed = order.status !== "cancelled" && (admin || seconds > 0);
  const patch = editPatch(order, draft);
  const save = async () => {
    if (!allowed || busy || (mode === "edit" && !patch) || (admin && !reason.trim())) return;
    setBusy(true); setError("");
    const key = JSON.stringify([mode, patch, reason]);
    if (!requests.current.has(key)) requests.current.set(key, changeId());
    try { await changeExistingOrder(order, mode, mode === "edit" ? patch : {}, reason, requests.current.get(key)); setMode(null); onChanged?.(); }
    catch (failure) { setError(failure.message || t.orderChangeFailed); }
    finally { setBusy(false); }
  };
  return <section className="space-y-3 rounded-xl border border-border bg-secondary/40 p-4">
    <p className="text-sm">{admin ? t.adminOrderChangeHint : allowed ? `${t.orderChangeWindow} ${seconds} ${t.seconds}` : t.orderChangeClosed}</p>
    {allowed && !mode && <div className="flex flex-wrap gap-2"><button type="button" className="rounded-lg bg-primary px-4 py-2 text-primary-foreground" onClick={() => setMode("edit")}>{t.editOrder}</button><button type="button" className="rounded-lg border px-4 py-2 text-destructive" onClick={() => setMode("cancel")}>{t.cancelOrder}</button></div>}
    {mode && <fieldset disabled={busy || !allowed} className="space-y-3">
      {mode === "edit" ? <>
        <p className="text-xs text-muted-foreground">{t.orderEditScope}</p>
        {editGroups(order).map((group) => <label key={group.key} className="flex items-center justify-between gap-3 text-sm"><span>{locale === "ar" ? group.nameAr : group.nameEn}</span><input aria-label={`${t.quantity}: ${locale === "ar" ? group.nameAr : group.nameEn}`} type="number" min="0" max="999" step="1" className="w-24 rounded border bg-background p-2" value={draft.counts[group.key]} onChange={(event) => setDraft({ ...draft, counts: { ...draft.counts, [group.key]: event.target.value } })} /></label>)}
        {order.items.map((item, index) => <label key={index} className="block text-sm">{t.itemNotes}: {locale === "ar" ? item.nameAr : item.nameEn}<input maxLength={500} className="mt-1 w-full rounded border bg-background p-2" value={draft.itemNotes[index]} onChange={(event) => setDraft({ ...draft, itemNotes: draft.itemNotes.map((note, i) => i === index ? event.target.value : note) })} /></label>)}
        <label className="block text-sm">{t.orderNotes}<textarea maxLength={500} className="mt-1 w-full rounded border bg-background p-2" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
        {order.fulfillmentType !== "pickup" && ["plateNumber", "carModel", "carColor"].map((field) => <label key={field} className="block text-sm">{t[field]}<input maxLength={field === "carModel" ? 160 : 100} className="mt-1 w-full rounded border bg-background p-2" value={draft[field]} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })} /></label>)}
        {patch && <p className="font-semibold">{t.total}: {(order.items.reduce((sum, item, index) => sum + Math.round(item.price * 100) * patch.quantities[index], 0) / 100).toFixed(2)} {t.sar || "SAR"}</p>}
      </> : <p>{t.confirmCancelOrder}</p>}
      {admin && <label className="block text-sm">{t.orderChangeReason}<textarea required maxLength={500} className="mt-1 w-full rounded border bg-background p-2" value={reason} onChange={(event) => setReason(event.target.value)} /></label>}
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || !allowed || (mode === "edit" && !patch) || (admin && !reason.trim())} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" onClick={save}>{busy ? t.loading : mode === "cancel" ? t.confirmCancelOrder : t.save}</button><button type="button" className="rounded-lg border px-4 py-2" onClick={() => setMode(null)}>{t.back || t.cancel}</button></div>
    </fieldset>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}
