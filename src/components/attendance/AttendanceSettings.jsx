"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { saveAttendanceSettings, saveShiftTemplate } from "@/hooks/useAttendanceConfig";
import { useI18n } from "@/lib/i18n";

const newShift = {
  nameEn: "", nameAr: "", startPrayer: "Fajr",
  startOffsetMinutes: 20, endTime: "12:00", endNextDay: false,
  graceMinutes: 10, active: true,
};

export default function AttendanceSettings({ shifts, settings }) {
  const { t, locale } = useI18n();
  const [editing, setEditing] = useState(null);
  const [shiftForm, setShiftForm] = useState(newShift);
  const [policy, setPolicy] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setPolicy(settings), [settings]);

  const openShift = (shift = null) => {
    setEditing(shift?.id || "new");
    setShiftForm(shift ? { ...shift } : { ...newShift });
    setError("");
  };

  const saveShift = async () => {
    if (!shiftForm.nameEn.trim() || !shiftForm.nameAr.trim() ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(shiftForm.endTime) ||
      !Number.isInteger(Number(shiftForm.startOffsetMinutes)) ||
      Math.abs(Number(shiftForm.startOffsetMinutes)) > 1440 ||
      !Number.isInteger(Number(shiftForm.graceMinutes)) ||
      Number(shiftForm.graceMinutes) < 0 || Number(shiftForm.graceMinutes) > 1440) {
      setError(t.invalidShiftConfiguration);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await saveShiftTemplate(editing === "new" ? null : editing, shiftForm);
      setEditing(null);
    } catch (saveError) {
      console.error("Shift save failed:", saveError);
      setError(t.attendanceSaveError);
    } finally {
      setSaving(false);
    }
  };

  const savePolicy = async () => {
    if (!Number.isInteger(Number(policy.monthlyLateThresholdMinutes)) ||
      Number(policy.monthlyLateThresholdMinutes) < 1 ||
      !policy.prayerLocation.city.trim() || !policy.prayerLocation.country.trim() ||
      !Number.isInteger(Number(policy.prayerCalculationMethod))) {
      setError(t.invalidAttendancePolicy);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await saveAttendanceSettings(policy);
    } catch (saveError) {
      console.error("Attendance policy save failed:", saveError);
      setError(t.attendanceSaveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t.shiftTemplates}</CardTitle>
          <Button onClick={() => openShift()}><Plus className="w-4 h-4 me-2" />{t.addShift}</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {shifts.length === 0 && <p className="text-muted-foreground">{t.noShiftTemplates}</p>}
          {shifts.map((shift) => (
            <div key={shift.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div>
                <p className="font-semibold">{locale === "ar" ? shift.nameAr : shift.nameEn}</p>
                <p className="text-sm text-muted-foreground">
                  {t.starts}: {t[shift.startPrayer?.toLowerCase()]} + {shift.startOffsetMinutes} {t.minutes}
                  {" · "}{t.gracePeriod}: {shift.graceMinutes} {t.minutes}
                  {" · "}{t.ends}: {shift.endTime} {shift.endNextDay ? `(${t.nextDay})` : ""}
                </p>
                <p className="text-xs text-muted-foreground">{shift.active ? t.active : t.inactive}</p>
              </div>
              <Button variant="outline" size="icon" onClick={() => openShift(shift)} title={t.edit}>
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t.attendancePolicy}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>{t.monthlyLateThreshold}</Label>
              <Input type="number" min="1" value={policy.monthlyLateThresholdMinutes}
                onChange={(event) => setPolicy({ ...policy, monthlyLateThresholdMinutes: event.target.value })} />
            </div>
            <div>
              <Label>{t.prayerCity}</Label>
              <Input value={policy.prayerLocation.city} onChange={(event) => setPolicy({
                ...policy, prayerLocation: { ...policy.prayerLocation, city: event.target.value },
              })} />
            </div>
            <div>
              <Label>{t.prayerCountry}</Label>
              <Input value={policy.prayerLocation.country} onChange={(event) => setPolicy({
                ...policy, prayerLocation: { ...policy.prayerLocation, country: event.target.value },
              })} />
            </div>
            <div>
              <Label>{t.prayerMethod}</Label>
              <Input type="number" min="0" max="23" value={policy.prayerCalculationMethod}
                onChange={(event) => setPolicy({ ...policy, prayerCalculationMethod: event.target.value })} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t.deductionPolicyExplanation}</p>
          <Button onClick={savePolicy} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}{t.save}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing === "new" ? t.addShift : t.editShift}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>{t.shiftNameEn}</Label><Input value={shiftForm.nameEn}
              onChange={(event) => setShiftForm({ ...shiftForm, nameEn: event.target.value })} /></div>
            <div><Label>{t.shiftNameAr}</Label><Input value={shiftForm.nameAr}
              onChange={(event) => setShiftForm({ ...shiftForm, nameAr: event.target.value })} /></div>
            <div>
              <Label>{t.startPrayer}</Label>
              <Select value={shiftForm.startPrayer}
                onValueChange={(value) => setShiftForm({ ...shiftForm, startPrayer: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fajr">{t.fajr}</SelectItem>
                  <SelectItem value="Maghrib">{t.maghrib}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t.minutesAfterPrayer}</Label><Input type="number" value={shiftForm.startOffsetMinutes}
              onChange={(event) => setShiftForm({ ...shiftForm, startOffsetMinutes: event.target.value })} /></div>
            <div><Label>{t.endTime}</Label><Input type="time" dir="ltr" value={shiftForm.endTime}
              onChange={(event) => setShiftForm({ ...shiftForm, endTime: event.target.value })} /></div>
            <div><Label>{t.gracePeriodMinutes}</Label><Input type="number" min="0" value={shiftForm.graceMinutes}
              onChange={(event) => setShiftForm({ ...shiftForm, graceMinutes: event.target.value })} /></div>
            <div className="flex items-center gap-3"><Switch checked={shiftForm.endNextDay}
              onCheckedChange={(value) => setShiftForm({ ...shiftForm, endNextDay: value })} />
              <Label>{t.endNextDay}</Label></div>
            <div className="flex items-center gap-3"><Switch checked={shiftForm.active}
              onCheckedChange={(value) => setShiftForm({ ...shiftForm, active: value })} />
              <Label>{t.active}</Label></div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t.cancel}</Button>
            <Button onClick={saveShift} disabled={saving}>{t.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
