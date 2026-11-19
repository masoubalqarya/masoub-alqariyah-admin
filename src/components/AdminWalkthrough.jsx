"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const replayAdminWalkthrough = () => window.dispatchEvent(new Event("admin-walkthrough-open"));
const steps = [["adminTourOrdersTitle", "adminTourOrdersBody"], ["adminTourMenuTitle", "adminTourMenuBody"], ["adminTourAttendanceTitle", "adminTourAttendanceBody"], ["adminTourSettingsTitle", "adminTourSettingsBody"]];

export default function AdminWalkthrough({ userId }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const key = `admin_walkthrough_v1:${userId}`;
  useEffect(() => {
    let alive = true;
    const show = () => { setIndex(0); setOpen(true); };
    window.addEventListener("admin-walkthrough-open", show);
    Promise.resolve().then(() => { try { if (alive && !localStorage.getItem(key)) show(); } catch { /* Replay stays available if storage is disabled. */ } });
    return () => { alive = false; window.removeEventListener("admin-walkthrough-open", show); };
  }, [key]);
  const close = () => { setOpen(false); try { localStorage.setItem(key, "seen"); } catch { /* No account or server state changes. */ } };
  return <Dialog open={open} onOpenChange={(value) => { if (!value) close(); }}>
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{t.quickWalkthrough}</DialogTitle></DialogHeader>
      <p className="text-xs text-muted-foreground">{index + 1} / {steps.length}</p>
      <h2 className="text-xl font-bold">{t[steps[index][0]]}</h2><p className="leading-8 text-muted-foreground">{t[steps[index][1]]}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => index === steps.length - 1 ? close() : setIndex(index + 1)}>{index === steps.length - 1 ? t.tourDone : t.tourNext}</Button>
        {index > 0 && <Button variant="outline" onClick={() => setIndex(index - 1)}>{t.back}</Button>}
        <Button variant="ghost" onClick={close}>{t.tourSkip}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
