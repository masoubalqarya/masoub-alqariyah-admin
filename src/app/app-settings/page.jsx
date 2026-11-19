"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAppSettings, saveAppSettings } from "@/hooks/useAppSettings";
import { validPolicy } from "@/lib/app-policy";
import ImageGalleryEditor from "@/components/ImageGalleryEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const emptyPolicy = { mode: "off", version: "", url: "" };

function SettingsForm({ settings }) {
  const { t } = useI18n();
  const [hero, setHero] = useState({ titleEn: "", titleAr: "", descriptionEn: "", descriptionAr: "", ...settings.hero });
  const [gallery, setGallery] = useState(settings.hero?.image ? [settings.hero.image] : []);
  const [updates, setUpdates] = useState({ ios: { ...emptyPolicy, ...settings.updates?.ios }, android: { ...emptyPolicy, ...settings.updates?.android } });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const save = async (event) => {
    event.preventDefault();
    setFeedback("");
    if (!["ios", "android"].every((platform) => validPolicy(updates[platform], platform))) {
      setFeedback(t.updatePolicyInvalid); return;
    }
    const hasHero = gallery.length > 0 || [hero.titleEn, hero.titleAr, hero.descriptionEn, hero.descriptionAr].some((value) => value.trim());
    if (hasHero && (!hero.titleEn.trim() || !hero.titleAr.trim())) {
      setFeedback(t.catalogValidation); return;
    }
    setSaving(true);
    try {
      await saveAppSettings({ hero: Object.fromEntries(Object.entries(hero).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])), updates }, gallery);
      setFeedback(t.settingsSaved);
    } catch { setFeedback(t.catalogSaveFailed); }
    finally { setSaving(false); }
  };
  return <form onSubmit={save} className="space-y-6 max-w-3xl">
    <fieldset disabled={saving} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{t.homeHero}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t.heroHelp}</p>
          {[['titleEn', t.titleEn], ['titleAr', t.titleAr], ['descriptionEn', t.descriptionEn], ['descriptionAr', t.descriptionAr]].map(([key, label]) => <div key={key} className="space-y-2">
            <Label htmlFor={key}>{label}</Label>
            {key.startsWith("description") ? <Textarea id={key} dir={key.endsWith("Ar") ? "rtl" : "ltr"} maxLength={500} value={hero[key]} onChange={(e) => setHero({ ...hero, [key]: e.target.value })} /> : <Input id={key} dir={key.endsWith("Ar") ? "rtl" : "ltr"} maxLength={150} value={hero[key]} onChange={(e) => setHero({ ...hero, [key]: e.target.value })} />}
          </div>)}
          <Label>{t.image}</Label>
          <ImageGalleryEditor images={gallery} onChange={setGallery} maxImages={1} disabled={saving} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t.appUpdates}</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">{t.updatePolicyHelp}</p>
          {["ios", "android"].map((platform) => <div key={platform} className="space-y-3 rounded border p-4">
            <h3 className="font-semibold">{platform === "ios" ? "iOS" : "Android"}</h3>
            <Label htmlFor={`${platform}-mode`}>{t.updateMode}</Label>
            <select id={`${platform}-mode`} className="block w-full rounded border p-2" value={updates[platform].mode} onChange={(e) => setUpdates({ ...updates, [platform]: { ...updates[platform], mode: e.target.value } })}>
              <option value="off">{t.updateOff}</option><option value="optional">{t.updateOptional}</option><option value="forced">{t.updateForced}</option>
            </select>
            <Label htmlFor={`${platform}-version`}>{t.targetVersion}</Label>
            <Input id={`${platform}-version`} disabled={updates[platform].mode === "off"} placeholder="1.2.0" dir="ltr" value={updates[platform].version} onChange={(e) => setUpdates({ ...updates, [platform]: { ...updates[platform], version: e.target.value.trim() } })} />
            <Label htmlFor={`${platform}-url`}>{t.storeUrl}</Label>
            <Input id={`${platform}-url`} disabled={updates[platform].mode === "off"} type="url" dir="ltr" value={updates[platform].url} onChange={(e) => setUpdates({ ...updates, [platform]: { ...updates[platform], url: e.target.value.trim() } })} />
          </div>)}
        </CardContent>
      </Card>
      {feedback && <p role="status">{feedback}</p>}
      <Button type="submit" disabled={saving}>{saving ? t.loading : t.save}</Button>
    </fieldset>
  </form>;
}

export default function AppSettingsPage() {
  const { t } = useI18n();
  const { settings, loading, error } = useAppSettings();
  return <div className="space-y-6">
    <h1 className="text-2xl font-bold">{t.appSettings}</h1>
    {loading ? <p>{t.loading}</p> : error ? <p role="alert">{t.catalogLoadFailed}</p> : <SettingsForm settings={settings} />}
  </div>;
}
