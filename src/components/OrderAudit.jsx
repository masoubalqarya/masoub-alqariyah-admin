"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useI18n } from "@/lib/i18n";
import { formatSAR } from "@/lib/utils";

export default function OrderAudit({ orderId }) {
  const { t, locale } = useI18n();
  const [feed, setFeed] = useState({ orderId: "", entries: [], error: false });
  const entries = feed.orderId === orderId ? feed.entries : [];
  const error = feed.orderId === orderId && feed.error;
  useEffect(() => onSnapshot(query(collection(db, "orders", orderId, "changeHistory"), orderBy("at", "desc")), (snapshot) => setFeed({ orderId, entries: snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })), error: false }), () => setFeed({ orderId, entries: [], error: true })), [orderId]);
  return <section className="space-y-2 border-t pt-3"><h3 className="font-semibold">{t.orderAudit}</h3>
    {error && <p role="alert" className="text-sm text-destructive">{t.auditLoadFailed}</p>}
    {feed.orderId !== orderId ? <p className="text-sm text-muted-foreground">{t.loading}</p> : !entries.length && !error && <p className="text-sm text-muted-foreground">{t.noOrderChanges}</p>}
    {entries.map((entry) => <details key={entry.id} className="rounded border p-2 text-sm"><summary className="cursor-pointer">{entry.operation === "cancel" ? t.cancelOrder : t.editOrder} · {entry.actorName || entry.role} · {entry.at?.toDate?.().toLocaleString(locale, { timeZone: "Asia/Riyadh" })}</summary><p>{entry.reason}</p>
      {[ [t.changeBefore, entry.before], [t.changeAfter, entry.after] ].map(([label, snapshot]) => <div key={label} className="mt-2 rounded bg-muted p-2"><strong>{label}</strong><p>{t[snapshot?.status] || snapshot?.status}</p><p>{t.total}: {formatSAR(snapshot?.total || 0)}</p><p>{snapshot?.notes}</p><p>{[snapshot?.plateNumber, snapshot?.carModel, snapshot?.carColor].filter(Boolean).join(" · ")}</p>{snapshot?.items?.map((item, index) => <p key={index}>{item.quantity} × {locale === "ar" ? item.nameAr : item.nameEn} · {[item.selectedSize, item.selectedCookingOption, ...(item.selectedExtras || [])].filter(Boolean).map((option) => locale === "ar" ? option.nameAr || option.nameEn : option.nameEn || option.nameAr).join("، ")} · {item.notes}</p>)}</div>)}
    </details>)}
  </section>;
}
