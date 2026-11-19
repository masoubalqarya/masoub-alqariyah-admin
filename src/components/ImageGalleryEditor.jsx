"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import ReorderableList from "@/components/ReorderableList";

function Preview({ image }) {
  const element = useRef(null);
  useEffect(() => {
    const url = typeof image === "string" ? image : URL.createObjectURL(image);
    if (element.current) element.current.src = url;
    return () => { if (typeof image !== "string") URL.revokeObjectURL(url); };
  }, [image]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={element} alt="" draggable={false} className="h-24 w-24 rounded object-cover" />;
}

export default function ImageGalleryEditor({ images, onChange, maxImages = 10, disabled = false }) {
  const { t } = useI18n();
  const [error, setError] = useState(false);
  const [dropping, setDropping] = useState(false);
  const counts = new Map();
  const entries = images.map((image) => {
    const key = typeof image === "string" ? image : `${image.name}:${image.lastModified}:${image.size}`;
    const occurrence = counts.get(key) || 0;
    counts.set(key, occurrence + 1);
    return { id: `${key}:${occurrence}`, image };
  });
  const addFiles = (files) => {
    if (disabled) return;
    const invalid = !files.length || files.some((file) => !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) || files.length + (maxImages === 1 ? 0 : images.length) > maxImages;
    setError(invalid);
    if (!invalid) onChange(maxImages === 1 ? files : [...images, ...files]);
  };
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{maxImages === 1 ? t.singleImageHelp : t.galleryHelp}</p>
      <ReorderableList items={entries} disabled={disabled} onChange={(next) => onChange(next.map((entry) => entry.image))}
        className="grid grid-cols-1 gap-2 sm:grid-cols-2" renderItem={(entry, index) => (
          <div className="space-y-1">
            <Preview image={entry.image} />
            {index === 0 && <p className="text-xs font-medium text-primary">{t.coverImage}</p>}
            <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => { setError(false); onChange(images.filter((_, i) => i !== index)); }}>{t.delete}</Button>
          </div>
        )} />
      <div className={`rounded-lg border-2 border-dashed p-4 ${dropping && !disabled ? "border-primary bg-primary/5" : "border-border"}`}
        onDragOver={(event) => { if (Array.from(event.dataTransfer.types).includes("Files")) { event.preventDefault(); event.dataTransfer.dropEffect = disabled ? "none" : "copy"; if (!disabled) setDropping(true); } }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDropping(false); }}
        onDrop={(event) => { event.preventDefault(); setDropping(false); addFiles(Array.from(event.dataTransfer.files)); }}>
        <label className="block text-sm">
          {t.dropImages}
          <input type="file" accept="image/*" multiple={maxImages > 1} disabled={disabled || (maxImages > 1 && images.length >= maxImages)} className="mt-2 block w-full" onChange={(event) => {
            const files = Array.from(event.target.files || []);
            if (files.length) addFiles(files);
            event.target.value = "";
          }} />
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{t.galleryError}</p>}
    </div>
  );
}
