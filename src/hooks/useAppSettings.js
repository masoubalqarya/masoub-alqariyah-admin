"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadImages } from "@/lib/catalog-images";

export function useAppSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => onSnapshot(doc(db, "appSettings", "mobile"), (snapshot) => {
    setSettings(snapshot.data() || {});
    setLoading(false);
    setError(false);
  }, () => { setError(true); setLoading(false); }), []);
  return { settings, loading, error };
}

export async function saveAppSettings(settings, gallery) {
  const images = await uploadImages(gallery, "appSettings");
  await setDoc(doc(db, "appSettings", "mobile"), {
    ...settings, hero: { ...settings.hero, image: images[0] || "" },
  });
}
