"use client";

import React, { useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  useMenuItems,
  useCategories,
  useSizeOptions,
  useExtrasOptions,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  addCategory,
  updateCategory,
  deleteCategory,
  updateSizeOption,
  addExtrasOption,
  updateExtrasOption,
  deleteExtrasOption,
} from "@/hooks/useMenu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatSAR } from "@/lib/utils";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Upload,
  X,
  ImageIcon,
} from "lucide-react";

// ─── Menu Item Form ────────────────────────────────────────

const emptyForm = {
  nameEn: "",
  nameAr: "",
  price: 0,
  category: "",
  descriptionEn: "",
  descriptionAr: "",
  cookingOptions: [],
  availableExtras: [],
};

const emptyCooking = {
  id: "",
  nameEn: "",
  nameAr: "",
  priceAdd: 0,
  isDefault: false,
};

export default function MenuPage() {
  const { t, locale } = useI18n();
  const { items, loading: itemsLoading } = useMenuItems();
  const { categories, loading: catsLoading } = useCategories();
  const { sizes } = useSizeOptions();
  const { extras } = useExtrasOptions();

  // Menu item form state
  const [itemDialog, setItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);

  // Category form
  const [catDialog, setCatDialog] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState({ id: "", nameEn: "", nameAr: "" });

  // Extras form
  const [extDialog, setExtDialog] = useState(false);
  const [editingExt, setEditingExt] = useState(null);
  const [extForm, setExtForm] = useState({ nameEn: "", nameAr: "", price: 0 });

  // Size edit
  const [sizeEditing, setSizeEditing] = useState({});

  // Group items by category
  const grouped = categories.reduce((acc, cat) => {
    acc[cat.id] = items.filter((item) => item.category === cat.id);
    return acc;
  }, {});

  // ─── Menu Item Handlers ──────────────────────────────────

  const openAddItem = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview("");
    setItemDialog(true);
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    setForm({
      nameEn: item.nameEn,
      nameAr: item.nameAr,
      price: item.price,
      category: item.category,
      descriptionEn: item.descriptionEn,
      descriptionAr: item.descriptionAr,
      cookingOptions: item.cookingOptions || [],
      availableExtras: item.availableExtras || [],
    });
    setImagePreview(item.image || "");
    setImageFile(null);
    setItemDialog(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const addCookingRow = () => {
    setForm({
      ...form,
      cookingOptions: [
        ...form.cookingOptions,
        { ...emptyCooking, id: `cook_${Date.now()}` },
      ],
    });
  };

  const updateCookingRow = (index, field, value) => {
    const updated = [...form.cookingOptions];
    updated[index][field] = value;
    setForm({ ...form, cookingOptions: updated });
  };

  const removeCookingRow = (index) => {
    setForm({
      ...form,
      cookingOptions: form.cookingOptions.filter((_, i) => i !== index),
    });
  };

  const handleSaveItem = async () => {
    setSaving(true);
    try {
      if (editingItem) {
        await updateMenuItem(
          editingItem.id,
          { ...form },
          imageFile || undefined,
        );
      } else {
        await addMenuItem(
          { ...form, image: "", id: "" },
          imageFile || undefined,
        );
      }
      setItemDialog(false);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleDeleteItem = async (id) => {
    try {
      await deleteMenuItem(id);
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Category Handlers ───────────────────────────────────

  const openAddCat = () => {
    setEditingCat(null);
    setCatForm({ id: "", nameEn: "", nameAr: "" });
    setCatDialog(true);
  };

  const openEditCat = (cat) => {
    setEditingCat(cat);
    setCatForm({ id: cat.id, nameEn: cat.nameEn, nameAr: cat.nameAr });
    setCatDialog(true);
  };

  const handleSaveCat = async () => {
    setSaving(true);
    try {
      if (editingCat) {
        await updateCategory(editingCat.id, {
          nameEn: catForm.nameEn,
          nameAr: catForm.nameAr,
        });
      } else {
        await addCategory({
          id: catForm.id || undefined,
          nameEn: catForm.nameEn,
          nameAr: catForm.nameAr,
        });
      }
      setCatDialog(false);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleDeleteCat = async (id) => {
    await deleteCategory(id);
  };

  // ─── Extras Handlers ─────────────────────────────────────

  const openAddExt = () => {
    setEditingExt(null);
    setExtForm({ nameEn: "", nameAr: "", price: 0 });
    setExtDialog(true);
  };

  const openEditExt = (ext) => {
    setEditingExt(ext);
    setExtForm({ nameEn: ext.nameEn, nameAr: ext.nameAr, price: ext.price });
    setExtDialog(true);
  };

  const handleSaveExt = async () => {
    setSaving(true);
    try {
      if (editingExt) {
        await updateExtrasOption(editingExt.id, extForm);
      } else {
        await addExtrasOption(extForm);
      }
      setExtDialog(false);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  // ─── Size Handlers ───────────────────────────────────────

  const handleSaveSize = async (id, priceAdd) => {
    await updateSizeOption(id, { priceAdd });
    setSizeEditing((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">{t.menuTitle}</h1>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">{t.menuItems}</TabsTrigger>
          <TabsTrigger value="categories">{t.categories}</TabsTrigger>
          <TabsTrigger value="sizes">{t.sizeOptions}</TabsTrigger>
          <TabsTrigger value="extras">{t.extrasOptions}</TabsTrigger>
        </TabsList>

        {/* ─── Menu Items Tab ────────────────────────────── */}
        <TabsContent value="items">
          <div className="flex justify-end mb-4">
            <Button onClick={openAddItem}>
              <Plus className="w-4 h-4" />
              {t.addMenuItem}
            </Button>
          </div>

          {itemsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map((cat) => (
                <Card key={cat.id}>
                  <CardHeader>
                    <CardTitle>
                      {locale === "ar" ? cat.nameAr : cat.nameEn}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(grouped[cat.id] || []).length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        {t.noData}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(grouped[cat.id] || []).map((item) => (
                          <div
                            key={item.id}
                            className="border rounded-lg overflow-hidden group">
                            {item.image ? (
                              <div className="h-32 bg-muted relative">
                                <img
                                  src={item.image}
                                  alt={item.nameEn}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-32 bg-muted flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                            <div className="p-3 space-y-1">
                              <h4 className="font-medium text-sm">
                                {locale === "ar" ? item.nameAr : item.nameEn}
                              </h4>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {locale === "ar"
                                  ? item.descriptionAr
                                  : item.descriptionEn}
                              </p>
                              <div className="flex items-center justify-between pt-1">
                                <span className="font-bold text-primary">
                                  {formatSAR(item.price)}
                                </span>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => openEditItem(item)}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          {t.delete}
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          {t.confirmDeleteItem}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          {t.cancel}
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDeleteItem(item.id)
                                          }
                                          className="bg-destructive text-destructive-foreground">
                                          {t.delete}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Categories Tab ────────────────────────────── */}
        <TabsContent value="categories">
          <div className="flex justify-end mb-4">
            <Button onClick={openAddCat}>
              <Plus className="w-4 h-4" />
              {t.addCategory}
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>{t.nameEn}</TableHead>
                    <TableHead>{t.nameAr}</TableHead>
                    <TableHead className="w-24">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-mono text-sm">
                        {cat.id}
                      </TableCell>
                      <TableCell>{cat.nameEn}</TableCell>
                      <TableCell>{cat.nameAr}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEditCat(cat)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t.deleteCategory}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t.confirmDeleteCategory}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  {t.cancel}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCat(cat.id)}
                                  className="bg-destructive text-destructive-foreground">
                                  {t.delete}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Size Options Tab ──────────────────────────── */}
        <TabsContent value="sizes">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>{t.nameEn}</TableHead>
                    <TableHead>{t.nameAr}</TableHead>
                    <TableHead>{t.priceAdd} (SAR)</TableHead>
                    <TableHead className="w-24">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sizes.map((size) => (
                    <TableRow key={size.id}>
                      <TableCell className="font-mono text-sm">
                        {size.id}
                      </TableCell>
                      <TableCell>{size.nameEn}</TableCell>
                      <TableCell>{size.nameAr}</TableCell>
                      <TableCell>
                        {sizeEditing[size.id] !== undefined ? (
                          <Input
                            type="number"
                            value={sizeEditing[size.id]}
                            onChange={(e) =>
                              setSizeEditing({
                                ...sizeEditing,
                                [size.id]: Number(e.target.value),
                              })
                            }
                            className="w-24"
                            dir="ltr"
                          />
                        ) : (
                          <span>{size.priceAdd}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sizeEditing[size.id] !== undefined ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleSaveSize(size.id, sizeEditing[size.id])
                              }>
                              {t.save}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setSizeEditing((prev) => {
                                  const next = { ...prev };
                                  delete next[size.id];
                                  return next;
                                })
                              }>
                              {t.cancel}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              setSizeEditing({
                                ...sizeEditing,
                                [size.id]: size.priceAdd,
                              })
                            }>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Extras Options Tab ────────────────────────── */}
        <TabsContent value="extras">
          <div className="flex justify-end mb-4">
            <Button onClick={openAddExt}>
              <Plus className="w-4 h-4" />
              {t.addExtra}
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.nameEn}</TableHead>
                    <TableHead>{t.nameAr}</TableHead>
                    <TableHead>{t.price} (SAR)</TableHead>
                    <TableHead className="w-24">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extras.map((ext) => (
                    <TableRow key={ext.id}>
                      <TableCell>{ext.nameEn}</TableCell>
                      <TableCell>{ext.nameAr}</TableCell>
                      <TableCell>{ext.price}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEditExt(ext)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t.deleteExtra}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t.confirmDeleteExtra}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  {t.cancel}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteExtrasOption(ext.id)}
                                  className="bg-destructive text-destructive-foreground">
                                  {t.delete}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Menu Item Dialog ──────────────────────────────── */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? t.editMenuItem : t.addMenuItem}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pe-2">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.price}</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) =>
                    setForm({ ...form, price: Number(e.target.value) })
                  }
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.category}</Label>
                <Select
                  value={form.category}
                  onValueChange={(val) => setForm({ ...form, category: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.category} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {locale === "ar" ? cat.nameAr : cat.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            {/* Available Extras */}
            <div className="space-y-3">
              <Label>{t.availableExtras}</Label>
              {extras.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t.noExtrasOptions}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border bg-muted/30">
                  {extras.map((ext) => (
                    <label
                      key={ext.id}
                      className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={(form.availableExtras ?? []).includes(ext.id)}
                        onChange={(e) => {
                          const current = form.availableExtras ?? [];
                          const updated = e.target.checked
                            ? [...current, ext.id]
                            : current.filter((id) => id !== ext.id);
                          setForm({ ...form, availableExtras: updated });
                        }}
                      />
                      <span className="text-sm">
                        {locale === "ar" ? ext.nameAr : ext.nameEn}
                        {ext.price > 0 && (
                          <span className="text-muted-foreground ms-1">
                            (+{ext.price})
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Cooking Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t.cookingOptions}</Label>
                <Button variant="outline" size="sm" onClick={addCookingRow}>
                  <Plus className="w-3 h-3" />
                  {t.addCookingOption}
                </Button>
              </div>
              {form.cookingOptions.map((opt, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-5 gap-2 items-end p-3 rounded-lg border bg-muted/30">
                  <div className="space-y-1">
                    <Label className="text-xs">{t.nameEn}</Label>
                    <Input
                      value={opt.nameEn}
                      onChange={(e) =>
                        updateCookingRow(idx, "nameEn", e.target.value)
                      }
                      dir="ltr"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.nameAr}</Label>
                    <Input
                      value={opt.nameAr}
                      onChange={(e) =>
                        updateCookingRow(idx, "nameAr", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.priceAdd}</Label>
                    <Input
                      type="number"
                      value={opt.priceAdd}
                      onChange={(e) =>
                        updateCookingRow(
                          idx,
                          "priceAdd",
                          Number(e.target.value),
                        )
                      }
                      dir="ltr"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <Switch
                      checked={opt.isDefault}
                      onCheckedChange={(checked) =>
                        updateCookingRow(idx, "isDefault", checked)
                      }
                    />
                    <span className="text-xs">{t.isDefault}</span>
                  </div>
                  <div className="flex justify-end pb-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeCookingRow(idx)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSaveItem} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Category Dialog ───────────────────────────────── */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCat ? t.editCategory : t.addCategory}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingCat && (
              <div className="space-y-2">
                <Label>ID</Label>
                <Input
                  value={catForm.id}
                  onChange={(e) =>
                    setCatForm({ ...catForm, id: e.target.value })
                  }
                  placeholder="e.g. masoub"
                  dir="ltr"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>{t.nameEn}</Label>
              <Input
                value={catForm.nameEn}
                onChange={(e) =>
                  setCatForm({ ...catForm, nameEn: e.target.value })
                }
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.nameAr}</Label>
              <Input
                value={catForm.nameAr}
                onChange={(e) =>
                  setCatForm({ ...catForm, nameAr: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSaveCat} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Extras Dialog ─────────────────────────────────── */}
      <Dialog open={extDialog} onOpenChange={setExtDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExt ? t.editExtra : t.addExtra}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.nameEn}</Label>
              <Input
                value={extForm.nameEn}
                onChange={(e) =>
                  setExtForm({ ...extForm, nameEn: e.target.value })
                }
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.nameAr}</Label>
              <Input
                value={extForm.nameAr}
                onChange={(e) =>
                  setExtForm({ ...extForm, nameAr: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t.price}</Label>
              <Input
                type="number"
                value={extForm.price}
                onChange={(e) =>
                  setExtForm({ ...extForm, price: Number(e.target.value) })
                }
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtDialog(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSaveExt} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
