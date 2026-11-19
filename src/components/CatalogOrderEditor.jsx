"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { saveCatalogOrder } from "@/hooks/useMenu";
import { sortCategories, sortProducts, sortFeaturedProducts } from "@/lib/catalog-order";
import ReorderableList from "@/components/ReorderableList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function OrderDraft({ items, collectionName, field, scope, draft, onDraftChange, onSavingChange }) {
  const { t, locale } = useI18n();
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const fingerprint = JSON.stringify(items.map((item) => [item.id, item[field], item.category, item.isFeatured]));
  const changedElsewhere = draft && draft.fingerprint !== fingerprint;
  const byId = new Map(items.map((item) => [item.id, item]));
  const displayed = draft ? [...draft.ids.filter((id) => byId.has(id)).map((id) => byId.get(id)), ...items.filter((item) => !draft.ids.includes(item.id))] : items;
  const reset = () => { onDraftChange(null); setFeedback(""); };
  const save = async () => {
    if (!draft || changedElsewhere || saving) return;
    setSaving(true);
    onSavingChange(true);
    setFeedback("");
    try {
      await saveCatalogOrder(collectionName, displayed.map((item) => item.id), field);
      onDraftChange(null);
      setFeedback(t.orderSaved);
    } catch { setFeedback(t.catalogSaveFailed); }
    finally { setSaving(false); onSavingChange(false); }
  };
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">{t.arrangeHelp}</p>
    {items.length === 0 ? <p className="py-6 text-center text-muted-foreground">{scope === "featured" ? t.noFeaturedItems : t.noData}</p> : <ReorderableList items={displayed} disabled={saving || !!changedElsewhere} onChange={(next) => {
      setFeedback("");
      onDraftChange({ ids: next.map((item) => item.id), fingerprint: draft?.fingerprint || fingerprint });
    }} renderItem={(item) => <div className="flex items-center gap-3">
      {item.image && <img src={item.image} alt="" draggable={false} className="h-12 w-12 shrink-0 rounded object-cover" />}
      <div className="min-w-0"><p className="font-medium">{locale === "ar" ? item.nameAr : item.nameEn}</p><p className="text-xs text-muted-foreground">{locale === "ar" ? item.nameEn : item.nameAr}</p></div>
    </div>} />}
    {changedElsewhere && <p role="alert" className="text-sm text-destructive">{t.orderChangedElsewhere}</p>}
    {feedback && <p role="status" className="text-sm">{feedback}</p>}
    <div className="flex items-center gap-2">
      <Button type="button" disabled={!draft || saving || !!changedElsewhere || items.length > 500} onClick={save}>{saving ? t.loading : t.saveOrder}</Button>
      <Button type="button" variant="outline" disabled={!draft || saving} onClick={reset}>{changedElsewhere ? t.reloadOrder : t.cancel}</Button>
      {draft && !changedElsewhere && <span className="text-xs text-muted-foreground">{t.unsavedOrder}</span>}
    </div>
    {items.length > 500 && <p role="alert" className="text-sm text-destructive">{t.orderTooLarge}</p>}
  </div>;
}

export default function CatalogOrderEditor({ categories, items, target, onTargetChange, loading }) {
  const { t, locale } = useI18n();
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const sortedCategories = sortCategories(categories);
  const scope = target === "categories" ? "categories" : target === "featured" ? "featured" : "products";
  const categoryId = scope === "products" ? target.slice("category:".length) : null;
  const ordered = scope === "categories" ? sortedCategories : scope === "featured" ? sortFeaturedProducts(items) : sortProducts(items.filter((item) => item.category === categoryId), categories);
  return <Card>
    <CardHeader><CardTitle>{t.arrangeMenu}</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <label className="block space-y-2 text-sm font-medium">
        <span>{t.arrangeWhat}</span>
        <select value={target} disabled={saving} onChange={(event) => onTargetChange(event.target.value)} className="block w-full rounded-md border bg-background p-3">
          <option value="categories">{t.categories}</option>
          <option value="featured">{t.featuredSection}</option>
          {sortedCategories.map((category) => <option key={category.id} value={`category:${category.id}`}>{t.menuItems} — {locale === "ar" ? category.nameAr : category.nameEn}</option>)}
        </select>
      </label>
      <p className="text-sm text-muted-foreground">{scope === "featured" ? t.featuredOrderHelp : scope === "categories" ? t.categoryOrderHelp : t.productOrderHelp}</p>
      {loading ? <p>{t.loading}</p> : <OrderDraft key={target} items={ordered} scope={scope} collectionName={scope === "categories" ? "categories" : "menuItems"} field={scope === "featured" ? "featuredRank" : "sortOrder"}
        draft={drafts[target] || null} onDraftChange={(draft) => setDrafts((current) => ({ ...current, [target]: draft }))} onSavingChange={setSaving} />}
    </CardContent>
  </Card>;
}
