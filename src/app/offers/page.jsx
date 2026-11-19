"use client";

import React, { useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  useOffers,
  addOffer,
  updateOffer,
  deleteOffer,
  toggleOfferActive,
} from "@/hooks/useOffers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useMenuItems, useSizeOptions } from "@/hooks/useMenu";
import { offerDetails, offerPreview } from "@/lib/offer-pricing";
import { formatSAR } from "@/lib/utils";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Upload,
  X,
  Tag,
  ImageIcon,
} from "lucide-react";

const emptyForm = {
  titleEn: "",
  titleAr: "",
  descriptionEn: "",
  descriptionAr: "",
  discount: "",
  originalPrice: 0,
  offerPrice: 0,
  pricingType: "fixed",
  discountPercent: 20,
  items: [],
  isActive: true,
};

export default function OffersPage() {
  const { t, locale } = useI18n();
  const { offers, loading } = useOffers();
  const { items: menuItems, loading: menuLoading } = useMenuItems();
  const { sizes: sizeOptions, loading: sizesLoading } = useSizeOptions();
  const [dialog, setDialog] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const percentage = form.pricingType === "percentage";
  const details = offerDetails(form, menuItems, sizeOptions);
  const pricing = offerPreview(form, menuItems, sizeOptions);
  const valid = !!pricing && !!form.titleEn.trim() && !!form.titleAr.trim();

  const openAdd = () => {
    setSaveError("");
    setEditingOffer(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview("");
    setDialog(true);
  };

  const openEdit = (offer) => {
    setSaveError("");
    setEditingOffer(offer);
    setForm({
      titleEn: offer.titleEn,
      titleAr: offer.titleAr,
      descriptionEn: offer.descriptionEn,
      descriptionAr: offer.descriptionAr,
      discount: offer.discount,
      originalPrice: offer.originalPrice,
      offerPrice: offer.offerPrice,
      pricingType: offer.pricingType || "fixed",
      discountPercent: offer.discountPercent ?? 20,
      items: (offer.items || []).map((line) => ({ ...line })),
      isActive: offer.isActive ?? true,
    });
    setImagePreview(offer.image || "");
    setImageFile(null);
    setDialog(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const addItemRow = () => {
    setForm({
      ...form,
      items: [
        ...form.items,
        { menuItemId: "", nameEn: "", nameAr: "", sizeId: null, qty: 1 },
      ],
    });
  };

  const updateItemRow = (index, field, value) => {
    const updated = [...form.items];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, items: updated });
  };

  const selectMenuItemForRow = (index, menuItemId) => {
    const menuItem = menuItems.find((m) => m.id === menuItemId);
    if (!menuItem) return;
    const updated = [...form.items];
    updated[index] = {
      ...updated[index],
      menuItemId,
      sizeId: null,
      nameEn: menuItem.nameEn,
      nameAr: menuItem.nameAr,
    };
    setForm({ ...form, items: updated });
  };

  const removeItemRow = (index) => {
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== index),
    });
  };

  const handleSave = async () => {
    if (!valid || menuLoading || sizesLoading) { setSaveError(percentage ? t.percentageOfferValidation : t.offerValidation); return; }
    setSaveError("");
    const saved = {
      ...form,
      titleEn: form.titleEn.trim(), titleAr: form.titleAr.trim(),
      originalPrice: pricing.originalPrice, offerPrice: pricing.offerPrice, discount: pricing.discount,
      discountPercent: percentage ? form.discountPercent : null,
      items: form.items.map((line) => ({ ...line, sizeId: percentage ? null : line.sizeId })),
    };
    setSaving(true);
    try {
      if (editingOffer) {
        await updateOffer(editingOffer.id, saved, imageFile || undefined);
      } else {
        await addOffer({ ...saved, image: "" }, imageFile || undefined);
      }
      setDialog(false);
    } catch (err) {
      console.error(err);
      setSaveError(t.offerSaveFailed);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await deleteOffer(id);
  };

  const handleToggle = async (id, current) => {
    await toggleOfferActive(id, !current);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.offersTitle}</h1>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4" />
          {t.addOffer}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t.noData}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((savedOffer) => {
            const offer = { ...savedOffer, ...offerPreview(savedOffer, menuItems, sizeOptions) };
            return (
            <Card key={offer.id} className="overflow-hidden">
              {offer.image ? (
                <div className="h-48 relative bg-muted">
                  <img
                    src={offer.image}
                    alt={offer.titleEn}
                    className="w-full h-full object-cover"
                  />
                  {offer.discount && (
                    <Badge className="absolute top-3 start-3 bg-destructive text-destructive-foreground">
                      <Tag className="w-3 h-3" />
                      {offer.discount}
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="h-48 bg-muted flex items-center justify-center relative">
                  <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  {offer.discount && (
                    <Badge className="absolute top-3 start-3 bg-destructive text-destructive-foreground">
                      <Tag className="w-3 h-3" />
                      {offer.discount}
                    </Badge>
                  )}
                </div>
              )}
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold">
                    {locale === "ar" ? offer.titleAr : offer.titleEn}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={offer.isActive ?? true}
                      onCheckedChange={() =>
                        handleToggle(offer.id, offer.isActive ?? true)
                      }
                    />
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">
                  {locale === "ar" ? offer.descriptionAr : offer.descriptionEn}
                </p>

                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-primary">
                    {offer.pricingType === "percentage" && `${t.offerFrom} `}{formatSAR(offer.offerPrice)}
                  </span>
                  <span className="text-sm text-muted-foreground line-through">
                    {formatSAR(offer.originalPrice)}
                  </span>
                </div>

                {offer.items?.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {offer.items.map((item, i) => (
                      <span key={i}>
                        {locale === "ar" ? item.nameAr : item.nameEn} x
                        {item.qty}
                        {item.sizeId && ` - ${sizeOptions.find((size) => size.id === item.sizeId)?.[locale === "ar" ? "nameAr" : "nameEn"] || ""}`}
                        {i < offer.items.length - 1 ? " • " : ""}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEdit(offer)}>
                    <Pencil className="w-3.5 h-3.5" />
                    {t.edit}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.delete}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t.confirmDeleteOffer}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(offer.id)}
                          className="bg-destructive text-destructive-foreground">
                          {t.delete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ); })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingOffer ? t.editOffer : t.addOffer}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pe-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.titleEn}</Label>
                <Input
                  value={form.titleEn}
                  onChange={(e) =>
                    setForm({ ...form, titleEn: e.target.value })
                  }
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.titleAr}</Label>
                <Input
                  value={form.titleAr}
                  onChange={(e) =>
                    setForm({ ...form, titleAr: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.descriptionEn}</Label>
                <Textarea
                  value={form.descriptionEn}
                  onChange={(e) =>
                    setForm({ ...form, descriptionEn: e.target.value })
                  }
                  dir="ltr"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.descriptionAr}</Label>
                <Textarea
                  value={form.descriptionAr}
                  onChange={(e) =>
                    setForm({ ...form, descriptionAr: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.offerPricingType}</Label>
              <Select value={form.pricingType} onValueChange={(pricingType) => setForm({
                ...form, pricingType, offerPrice: 0, items: form.items.map((line) => ({ ...line, sizeId: null })),
              })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">{t.offerFixedType}</SelectItem>
                  <SelectItem value="percentage">{t.offerPercentageType}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">{percentage ? t.percentageOfferHelp : t.fixedOfferHelp}</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{percentage ? t.offerDiscountPercent : t.discount}</Label>
                {percentage ? (
                  <Input type="number" min="0.01" max="99.99" step="0.01" value={form.discountPercent}
                    onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })} dir="ltr" />
                ) : <Input value={pricing?.discount || "-"} readOnly dir="ltr" />}
              </div>
              <div className="space-y-2">
                <Label>{percentage ? t.offerStartingRegularPrice : t.originalPrice}</Label>
                <Input value={percentage ? (pricing ? formatSAR(pricing.originalPrice) : "-") : (details ? formatSAR(details.originalMinor / 100) : "-")} readOnly dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{percentage ? t.offerStartingPrice : t.offerPrice}</Label>
                {percentage ? <Input value={pricing ? formatSAR(pricing.offerPrice) : "-"} readOnly dir="ltr" /> : (
                  <Input type="number" min="0.01" step="0.01" value={form.offerPrice}
                    onChange={(e) => setForm({ ...form, offerPrice: Number(e.target.value) })} dir="ltr" />
                )}
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>{t.image}</Label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => {
                        setImagePreview("");
                        setImageFile(null);
                      }}
                      className="absolute top-1 end-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-24 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">
                      {t.uploadImage}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Offer Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t.offerItems}</Label>
                <Button variant="outline" size="sm" onClick={addItemRow}>
                  <Plus className="w-3 h-3" />
                  {t.addOfferItem}
                </Button>
              </div>
              {form.items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 items-end p-3 rounded-lg border bg-muted/30">
                  <div className="space-y-1">
                    <Label className="text-xs">{t.menuItem}</Label>
                    <SearchableSelect
                      value={item.menuItemId}
                      onValueChange={(val) => selectMenuItemForRow(idx, val)}
                      placeholder={t.selectMenuItem}
                      searchPlaceholder={
                        t.searchMenuItems || "Search menu items..."
                      }
                      options={menuItems.filter((m) => m.isActive !== false).map((m) => ({
                        value: m.id,
                        label: locale === "ar" ? m.nameAr : m.nameEn,
                      }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.offerSize}</Label>
                    {percentage ? <p className="text-xs text-muted-foreground py-2">{menuItems.find((m) => m.id === item.menuItemId)?.availableSizes?.length ? t.offerCustomerChoosesSize : t.offerNoSize}</p> : menuItems.find((m) => m.id === item.menuItemId)?.availableSizes?.length ? (
                      <Select value={item.sizeId || ""} onValueChange={(value) => updateItemRow(idx, "sizeId", value)}>
                        <SelectTrigger className="h-8"><SelectValue placeholder={t.offerChooseSize} /></SelectTrigger>
                        <SelectContent>
                          {sizeOptions.filter((size) => menuItems.find((m) => m.id === item.menuItemId)?.availableSizes?.includes(size.id)).map((size) => (
                            <SelectItem key={size.id} value={size.id}>{locale === "ar" ? size.nameAr : size.nameEn}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : <p className="text-xs text-muted-foreground py-2">{t.offerNoSize}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.quantity}</Label>
                    <Input
                      type="number"
                      value={item.qty}
                      onChange={(e) =>
                        updateItemRow(idx, "qty", Number(e.target.value))
                      }
                      dir="ltr"
                      className="h-8 text-sm w-20"
                      min={1}
                      max={999}
                      step={1}
                    />
                  </div>
                  <div className="flex justify-end pb-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeItemRow(idx)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isActive: checked })
                }
              />
              <Label>{t.active}</Label>
            </div>
          </div>
          {!valid && form.items.length > 0 && <p className="text-sm text-muted-foreground">{percentage ? t.percentageOfferValidation : t.offerValidation}</p>}
          {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving || menuLoading || sizesLoading || !valid}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
