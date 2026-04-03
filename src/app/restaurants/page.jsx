"use client";

import React, { useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  useRestaurants,
  addRestaurant,
  updateRestaurant,
  deleteRestaurant,
  toggleRestaurantStatus,
} from "@/hooks/useRestaurants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Upload,
  X,
  Store,
  Phone,
  MapPin,
  ImageIcon,
} from "lucide-react";

const emptyForm = {
  nameEn: "",
  nameAr: "",
  address: "",
  phone: "",
  isActive: true,
};

export default function RestaurantsPage() {
  const { t, locale } = useI18n();
  const { restaurants, loading } = useRestaurants();
  const [dialog, setDialog] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditingRestaurant(null);
    setForm(emptyForm);
    setLogoFile(null);
    setLogoPreview("");
    setDialog(true);
  };

  const openEdit = (restaurant) => {
    setEditingRestaurant(restaurant);
    setForm({
      nameEn: restaurant.nameEn,
      nameAr: restaurant.nameAr,
      address: restaurant.address,
      phone: restaurant.phone,
      isActive: restaurant.isActive,
    });
    setLogoPreview(restaurant.logoImage || "");
    setLogoFile(null);
    setDialog(true);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingRestaurant) {
        await updateRestaurant(
          editingRestaurant.id,
          form,
          logoFile || undefined,
        );
      } else {
        await addRestaurant(
          { ...form, logoImage: "" },
          logoFile || undefined,
        );
      }
      setDialog(false);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await deleteRestaurant(id);
  };

  const handleToggleStatus = async (id, current) => {
    await toggleRestaurantStatus(id, !current);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.restaurantsTitle}</h1>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4" />
          {t.addRestaurant}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : restaurants.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t.noData}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant) => (
            <Card key={restaurant.id} className="overflow-hidden">
              <CardContent className="p-6 space-y-4">
                {/* Header with logo */}
                <div className="flex items-center gap-4">
                  {restaurant.logoImage ? (
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border shrink-0">
                      <img
                        src={restaurant.logoImage}
                        alt={restaurant.nameEn}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Store className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate">
                      {locale === "ar" ? restaurant.nameAr : restaurant.nameEn}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {locale === "ar" ? restaurant.nameEn : restaurant.nameAr}
                    </p>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="truncate">{restaurant.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span dir="ltr">{restaurant.phone}</span>
                  </div>
                </div>

                {/* Status Toggle - BIG AND VISIBLE */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                  <span className="font-medium">
                    {restaurant.isActive ? t.open : t.closed}
                  </span>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-medium ${
                        restaurant.isActive ? "text-green-600" : "text-red-500"
                      }`}>
                      {restaurant.isActive ? "●" : "●"}
                    </span>
                    <Switch
                      checked={restaurant.isActive}
                      onCheckedChange={() =>
                        handleToggleStatus(restaurant.id, restaurant.isActive)
                      }
                      className="scale-125"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEdit(restaurant)}>
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
                          {t.confirmDeleteRestaurant}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(restaurant.id)}
                          className="bg-destructive text-destructive-foreground">
                          {t.delete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRestaurant ? t.editRestaurant : t.addRestaurant}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.nameEn}</Label>
                <Input
                  value={form.nameEn}
                  onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.nameAr}</Label>
                <Input
                  value={form.nameAr}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.address}</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t.phone}</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                dir="ltr"
              />
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>{t.logoImage}</Label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border">
                    <img
                      src={logoPreview}
                      alt="Logo Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => {
                        setLogoPreview("");
                        setLogoFile(null);
                      }}
                      className="absolute top-0 end-0 bg-destructive text-destructive-foreground rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-20 h-20 rounded-full border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isActive: checked })
                }
              />
              <Label>{t.openClosed}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
