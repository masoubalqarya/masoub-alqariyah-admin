"use client";

import { useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { moveItem } from "@/lib/reorder";

const itemKey = (item) => item.id;

function scrollWhileDragging(element, y) {
  let parent = element?.parentElement;
  while (parent && parent !== document.body) {
    if (parent.scrollHeight > parent.clientHeight && /auto|scroll/.test(getComputedStyle(parent).overflowY)) {
      const bounds = parent.getBoundingClientRect();
      if (y < bounds.top + 48) parent.scrollBy(0, -16);
      else if (y > bounds.bottom - 48) parent.scrollBy(0, 16);
      return;
    }
    parent = parent.parentElement;
  }
  if (y < 80) window.scrollBy(0, -16);
  else if (y > window.innerHeight - 80) window.scrollBy(0, 16);
}

export default function ReorderableList({ items, onChange, renderItem, getKey = itemKey, disabled = false, className = "space-y-2" }) {
  const { t, locale } = useI18n();
  const listId = useId();
  const root = useRef(null);
  const pointer = useRef(null);
  const [drag, setDrag] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const move = (from, to) => {
    const next = moveItem(items, from, to);
    if (next === items || disabled) return;
    onChange(next);
    setAnnouncement(`${t.position} ${new Intl.NumberFormat(locale).format(to + 1)}`);
  };
  const cancel = () => { pointer.current = null; setDrag(null); };
  return (
    <div>
      <div ref={root} role="list" className={className}>
        {items.map((item, index) => {
          const key = String(getKey(item));
          return (
            <div key={key} role="listitem" data-reorder-list={listId} data-reorder-key={key}
              className={`rounded-lg border bg-card p-2 ${drag?.over === key ? "ring-2 ring-primary" : ""} ${drag?.key === key ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="icon" disabled={disabled || items.length < 2}
                  aria-label={`${t.dragToReorder}: ${index + 1}`} title={t.dragToReorder}
                  className="shrink-0 cursor-grab active:cursor-grabbing" style={{ touchAction: "none" }}
                  onPointerDown={(event) => {
                    if (disabled || event.button !== 0) return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    pointer.current = { key, pointerId: event.pointerId, x: event.clientX, y: event.clientY, over: key, moved: false };
                  }}
                  onPointerMove={(event) => {
                    const active = pointer.current;
                    if (!active || active.pointerId !== event.pointerId || disabled) return;
                    if (!active.moved && Math.hypot(event.clientX - active.x, event.clientY - active.y) < 6) return;
                    active.moved = true;
                    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-reorder-key]");
                    if (target?.dataset.reorderList === listId && root.current?.contains(target)) active.over = target.dataset.reorderKey;
                    // Allow long lists to scroll while the handle stays captured.
                    scrollWhileDragging(root.current, event.clientY);
                    setDrag({ key: active.key, over: active.over });
                  }}
                  onPointerUp={(event) => {
                    const active = pointer.current;
                    if (active && active.pointerId !== event.pointerId) return;
                    if (active?.moved) move(items.findIndex((entry) => String(getKey(entry)) === active.key), items.findIndex((entry) => String(getKey(entry)) === active.over));
                    cancel();
                  }}
                  onPointerCancel={cancel} onLostPointerCapture={cancel}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") { cancel(); return; }
                    const targets = { ArrowUp: index - 1, ArrowDown: index + 1, Home: 0, End: items.length - 1 };
                    if (event.key in targets) { event.preventDefault(); move(index, targets[event.key]); }
                  }}>
                  <GripVertical className="h-4 w-4" />
                </Button>
                <span className="min-w-6 text-center text-xs tabular-nums text-muted-foreground">{new Intl.NumberFormat(locale).format(index + 1)}</span>
                <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={disabled || index === 0} onClick={() => move(index, index - 1)} aria-label={t.moveEarlier}><ArrowUp className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={disabled || index === items.length - 1} onClick={() => move(index, index + 1)} aria-label={t.moveLater}><ArrowDown className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    </div>
  );
}
