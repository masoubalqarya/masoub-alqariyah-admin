"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import AttendanceSettings from "@/components/attendance/AttendanceSettings";
import { useAuth } from "@/hooks/useAuth";
import { ATTENDANCE_DEVICE_SERIAL, getRiyadhDateKey, savePrayerOverride, useAttendanceDevice, useAttendanceEvents, usePrayerMonth } from "@/hooks/useAttendance";
import { useAttendanceConfig } from "@/hooks/useAttendanceConfig";
import { saveAttendanceOverride, useAttendanceOverrides } from "@/hooks/useAttendanceOverrides";
import { useEmployees } from "@/hooks/useEmployees";
import { addDays, calculateDailyAttendance, calculateShiftWindow, dateKeysInMonth, isWorkingDay, parseDeviceTime, summarizeMonthlyAttendance, timeLabel } from "@/lib/attendance/calculations";
import { useI18n } from "@/lib/i18n";

function statusBadge(day, t) {
  if (!day) return <Badge variant="secondary">{t.notConfigured}</Badge>;
  if (!day.shift) return <Badge variant="secondary">{day.firstPunch ? t.present : t.notConfigured}</Badge>;
  if (day.status === "late") return <Badge className="bg-amber-100 text-amber-800">{t.late}</Badge>;
  if (day.status === "onTime") return <Badge className="bg-green-100 text-green-800">{t.onTime}</Badge>;
  return <Badge variant="secondary">{t.absent}</Badge>;
}

function AttendanceTable({ heads, rows, loading, error, empty, onSelect }) {
  const { t } = useI18n();
  return <Card><CardContent className="p-0">
    {error ? <p className="p-6 text-destructive">{t.attendanceLoadError}</p> :
      <Table><TableHeader><TableRow>{heads.map((head) => <TableHead key={head}>{head}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{loading ? <TableRow><TableCell colSpan={heads.length} className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow> :
          rows.length === 0 ? <TableRow><TableCell colSpan={heads.length} className="py-10 text-center">{empty}</TableCell></TableRow> :
            rows.map((row) => <TableRow key={row.employee.id} className="cursor-pointer" tabIndex={0}
              onClick={() => onSelect(row)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(row); } }}>
              {row.cells.map((cell, index) => <TableCell key={index}>{cell}</TableCell>)}
            </TableRow>)}
        </TableBody></Table>}
  </CardContent></Card>;
}

export default function AttendancePage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [tab, setTab] = useState("daily");
  const [dateKey, setDateKey] = useState(() => getRiyadhDateKey());
  const [monthKey, setMonthKey] = useState(() => getRiyadhDateKey().slice(0, 7));
  const [selectedId, setSelectedId] = useState(null);
  const [prayerDialog, setPrayerDialog] = useState(false);
  const [prayerForm, setPrayerForm] = useState({ fajr: "", maghrib: "", reason: "" });
  const [adjustForm, setAdjustForm] = useState({ first: "", last: "", waived: 0, reason: "" });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const { employees, loading: employeesLoading, error: employeesError } = useEmployees();
  const { shifts, settings, loading: configLoading, error: configError } = useAttendanceConfig();
  const device = useAttendanceDevice();
  const isMonthly = tab === "monthly";
  const [year, month] = (isMonthly ? monthKey : dateKey.slice(0, 7)).split("-").map(Number);
  const startDate = isMonthly ? `${monthKey}-01` : dateKey;
  const endDate = isMonthly ? addDays(startDate, dateKeysInMonth(year, month).length) : addDays(dateKey, 1);
  const providerKey = `${settings.prayerLocation?.city}|${settings.prayerLocation?.country}|${settings.prayerCalculationMethod}`;
  const prayers = usePrayerMonth(year, month, tab !== "settings", providerKey);
  const attendance = useAttendanceEvents(startDate, endDate, tab !== "settings");
  const adjustments = useAttendanceOverrides(startDate, endDate, tab !== "settings");
  const loading = employeesLoading || configLoading || (tab !== "settings" && (prayers.loading || attendance.loading || adjustments.loading));
  const error = employeesError || configError || (tab !== "settings" && (prayers.error || attendance.error || adjustments.error));
  const activeEmployees = useMemo(() => employees.filter((employee) => employee.isActive), [employees]);
  const shiftById = useMemo(() => new Map(shifts.map((shift) => [shift.id, shift])), [shifts]);
  const overrideByKey = useMemo(() => new Map(adjustments.overrides.map((item) => [`${item.employeeId}_${item.shiftDate}`, item])), [adjustments.overrides]);

  const dailyRows = useMemo(() => activeEmployees.map((employee) => {
    const calculated = calculateDailyAttendance({ employee, shift: shiftById.get(employee.shiftId),
      shiftDate: dateKey, prayers: prayers.days[dateKey], events: attendance.events,
      override: overrideByKey.get(`${employee.id}_${dateKey}`) });
    if (calculated) return { employee, day: calculated };
    // Unassigned employees keep the original raw, calendar-day view until a shift is configured.
    const punches = employee.zkUserId ? attendance.events
      .filter((event) => String(event.zkUserId) === employee.zkUserId && event.eventTimeRaw?.startsWith(dateKey))
      .sort((a, b) => a.eventTimeRaw.localeCompare(b.eventTimeRaw)) : [];
    return { employee, day: { shift: null, punches, punchCount: punches.length,
      firstPunch: parseDeviceTime(punches[0]?.eventTimeRaw),
      lastPunch: punches.length > 1 ? parseDeviceTime(punches[punches.length - 1].eventTimeRaw) : null } };
  }), [activeEmployees, shiftById, dateKey, prayers.days, attendance.events, overrideByKey]);

  const monthlyRows = useMemo(() => activeEmployees.map((employee) => {
    const today = getRiyadhDateKey();
    const days = dateKeysInMonth(year, month).filter((date) => {
      if (!isWorkingDay(employee, date) || date > today) return false;
      const created = employee.createdAt?.toDate?.();
      if (created && date < getRiyadhDateKey(created)) return false;
      const window = calculateShiftWindow(date, shiftById.get(employee.shiftId), employee, prayers.days[date]);
      return window && window.expectedEnd <= new Date();
    }).map((date) => calculateDailyAttendance({ employee, shift: shiftById.get(employee.shiftId),
      shiftDate: date, prayers: prayers.days[date], events: attendance.events,
      override: overrideByKey.get(`${employee.id}_${date}`) })).filter(Boolean);
    return { employee, days, summary: summarizeMonthlyAttendance(days, settings.monthlyLateThresholdMinutes) };
  }), [activeEmployees, year, month, shiftById, prayers.days, attendance.events, overrideByKey, settings.monthlyLateThresholdMinutes]);

  const selectedDaily = dailyRows.find((row) => row.employee.id === selectedId);
  const selectedMonthly = monthlyRows.find((row) => row.employee.id === selectedId);
  const currentPrayer = prayers.days[dateKey];
  const refresh = () => { attendance.refresh(); adjustments.refresh(); prayers.refresh(); device.refresh(); };
  const shiftName = (shift) => (locale === "ar" ? shift?.nameAr : shift?.nameEn) || "--";

  function selectDaily(row) {
    setSelectedId(row.employee.id);
    setActionError("");
    const override = row.day?.override;
    setAdjustForm({
      first: override?.adjustedFirstPunch?.replace(" ", "T").slice(0, 16) || "",
      last: override?.adjustedLastPunch?.replace(" ", "T").slice(0, 16) || "",
      waived: override?.waivedLateMinutes || 0, reason: override?.reason || "",
    });
  }

  async function saveAdjustment() {
    if (!selectedDaily?.day?.shift || !adjustForm.reason.trim() ||
      (!adjustForm.first && !adjustForm.last && Number(adjustForm.waived) <= 0)) {
      setActionError(t.adjustmentRequired); return;
    }
    setSaving(true); setActionError("");
    try {
      await saveAttendanceOverride({ employeeId: selectedDaily.employee.id, shiftDate: dateKey,
        adjustedFirstPunch: adjustForm.first ? `${adjustForm.first.replace("T", " ")}:00` : null,
        adjustedLastPunch: adjustForm.last ? `${adjustForm.last.replace("T", " ")}:00` : null,
        waivedLateMinutes: adjustForm.waived, reason: adjustForm.reason, adjustedBy: user.uid });
      adjustments.refresh(); setSelectedId(null);
    } catch (saveError) { console.error("Attendance adjustment failed:", saveError); setActionError(t.attendanceSaveError); }
    finally { setSaving(false); }
  }

  async function savePrayer() {
    if (!prayerForm.reason.trim()) { setActionError(t.adjustmentRequired); return; }
    setSaving(true); setActionError("");
    try {
      await savePrayerOverride({ date: dateKey, ...prayerForm });
      prayers.refresh(); setPrayerDialog(false);
    } catch (saveError) { console.error("Prayer adjustment failed:", saveError); setActionError(t.attendanceSaveError); }
    finally { setSaving(false); }
  }

  const dailyTableRows = dailyRows.map(({ employee, day }) => ({ employee, day, cells: [
    <span key="name" className="font-medium">{employee.displayName}{employee.demoSeedId && <Badge variant="secondary" className="ms-2">{t.demoData}</Badge>}{day?.override && <Badge variant="secondary" className="ms-2">{t.adjusted}</Badge>}</span>,
    shiftName(day?.shift), <span key="expected" dir="ltr">{timeLabel(day?.expectedStart)}</span>,
    <span key="first" dir="ltr">{timeLabel(day?.firstPunch)}</span>,
    <span key="last" dir="ltr">{timeLabel(day?.lastPunch)}</span>,
    day?.punchCount || 0,
    day?.firstPunch && day.shift ? `${day.lateMinutes} ${t.minutes}` : "--",
    !isWorkingDay(employee, dateKey) && !day?.firstPunch
      ? <Badge key="off" variant="secondary">{t.dayOff}</Badge> : statusBadge(day, t),
  ] }));
  const monthlyTableRows = monthlyRows.map(({ employee, summary }) => ({ employee, cells: [
    <span key="name">{employee.displayName}{employee.demoSeedId && <Badge variant="secondary" className="ms-2">{t.demoData}</Badge>}</span>, shiftName(shiftById.get(employee.shiftId)), summary.workingDays,
    summary.presentDays, summary.absentDays, summary.lateDays, summary.totalLateMinutes,
    summary.deductibleMinutes, summary.deductionApplies ? <Badge key="deduct" className="bg-amber-100 text-amber-800">{t.deductionApplies}</Badge> : t.noDeduction,
  ] }));

  return <div className="space-y-6 animate-fade-in">
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3">
      <CalendarCheck className="w-7 h-7 text-primary" /><div><h1 className="text-2xl font-bold">{t.attendanceTitle}</h1><p className="text-sm text-muted-foreground">{t.attendanceSubtitle}</p></div>
    </div><Button variant="outline" onClick={refresh} disabled={loading}><RefreshCw className={`w-4 h-4 me-2 ${loading ? "animate-spin" : ""}`} />{t.refresh}</Button></div>
    <Tabs value={tab} onValueChange={(value) => { setTab(value); setSelectedId(null); }} className="space-y-5">
      <TabsList><TabsTrigger value="daily">{t.dailyAttendance}</TabsTrigger><TabsTrigger value="monthly">{t.monthlyReport}</TabsTrigger><TabsTrigger value="settings">{t.attendanceSettings}</TabsTrigger></TabsList>
      <TabsContent value="daily" className="space-y-5">
        <div className="flex items-center gap-3"><Label>{t.selectedDate}</Label><Input type="date" dir="ltr" className="w-auto" value={dateKey} onChange={(event) => event.target.value && setDateKey(event.target.value)} /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t.prayerTimes}</p><p className="mt-2 font-semibold" dir="ltr">{t.fajr}: {currentPrayer?.fajr || "--"} · {t.maghrib}: {currentPrayer?.maghrib || "--"}</p><Button variant="link" className="px-0" disabled={!currentPrayer} onClick={() => { setPrayerForm({ fajr: currentPrayer.fajr, maghrib: currentPrayer.maghrib, reason: "" }); setActionError(""); setPrayerDialog(true); }}>{t.adjustPrayerTimes}</Button>{currentPrayer?.override && <Badge variant="secondary">{t.adjusted}</Badge>}</CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t.present}</p><p className="mt-1 text-3xl font-bold">{dailyRows.filter((row) => row.day?.firstPunch).length}</p><p className="text-xs text-muted-foreground">{t.absent}: {dailyRows.filter((row) => isWorkingDay(row.employee, dateKey) && row.day?.shift && !row.day.firstPunch).length} · {t.late}: {dailyRows.filter((row) => row.day?.status === "late").length}</p></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{t.attendanceDevice}</p><p className="font-semibold">{device.device?.model || "SenseFace 2A"}</p><p className="text-xs text-muted-foreground" dir="ltr">{ATTENDANCE_DEVICE_SERIAL}</p><Badge variant="secondary">{device.connected ? t.connected : t.disconnected}</Badge></div>{device.connected ? <Wifi className="w-8 h-8 text-green-600" /> : <WifiOff className="w-8 h-8 text-muted-foreground" />}</CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle className="text-lg">{t.expectedStarts}</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-6">
          {shifts.filter((shift) => shift.active).map((shift) => { const window = calculateShiftWindow(dateKey, shift, { startOffsetMinutes: 0, endOffsetMinutes: 0 }, currentPrayer); return <div key={shift.id}><p className="font-medium">{shiftName(shift)}</p><p className="text-sm text-muted-foreground">{t.expectedStart}: {timeLabel(window?.expectedStart)} · {t.graceUntil}: {timeLabel(window?.graceDeadline)} · {t.ends}: {timeLabel(window?.expectedEnd)} {shift.endNextDay ? `(${t.nextDay})` : ""}</p></div>; })}
          {shifts.length === 0 && <p className="text-muted-foreground">{t.noShiftTemplates}</p>}
        </CardContent></Card>
        <AttendanceTable heads={[t.employee, t.assignedShift, t.expectedStart, t.firstPunch, t.lastPunch, t.numberOfPunches, t.lateMinutes, t.status]} rows={dailyTableRows} loading={loading} error={error} empty={t.noActiveEmployees} onSelect={selectDaily} />
      </TabsContent>
      <TabsContent value="monthly" className="space-y-5">
        <div className="flex flex-wrap items-center gap-3"><Label>{t.monthlyReport}</Label><Input type="month" dir="ltr" className="w-auto" value={monthKey} onChange={(event) => event.target.value && setMonthKey(event.target.value)} /><span className="text-sm text-muted-foreground">{t.completedWorkingDaysOnly}</span></div>
        <AttendanceTable heads={[t.employee, t.assignedShift, t.workingDays, t.presentDays, t.absentDays, t.lateDays, t.totalLateMinutes, t.deductibleMinutes, t.deductionStatus]} rows={monthlyTableRows} loading={loading} error={error} empty={t.noActiveEmployees} onSelect={(row) => setSelectedId(row.employee.id)} />
      </TabsContent>
      <TabsContent value="settings"><AttendanceSettings shifts={shifts} settings={settings} /></TabsContent>
    </Tabs>
    <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}><DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{selectedDaily?.employee.displayName || selectedMonthly?.employee.displayName}</DialogTitle></DialogHeader>
      {isMonthly ? selectedMonthly && <div className="space-y-3"><p className="text-sm text-muted-foreground">{t.totalLateMinutes}: {selectedMonthly.summary.totalLateMinutes} · {t.monthlyLateThreshold}: {selectedMonthly.summary.thresholdMinutes} · {t.deductibleMinutes}: {selectedMonthly.summary.deductibleMinutes}</p>{selectedMonthly.days.map((day) => <div key={day.shiftDate} className="flex items-center justify-between gap-3 border-b py-2"><span dir="ltr">{day.shiftDate}</span><span>{day.lateMinutes} {t.minutes} {day.override && <Badge variant="secondary">{t.adjusted}</Badge>}</span><span className="text-xs text-muted-foreground">{day.override ? `${t.original}: ${day.rawLateMinutes}` : ""}</span>{statusBadge(day, t)}</div>)}</div> :
        selectedDaily?.day ? <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{dateKey} · {t.expectedStart}: {timeLabel(selectedDaily.day.expectedStart)} · {t.graceUntil}: {timeLabel(selectedDaily.day.graceDeadline)} · {t.ends}: {timeLabel(selectedDaily.day.expectedEnd)}</p>
          <div className="space-y-2">{selectedDaily.day.punches.length ? selectedDaily.day.punches.map((punch) => <div key={punch.id} className="flex justify-between gap-3 rounded-lg border p-3"><span dir="ltr">{punch.eventTimeRaw}</span><span className="text-xs text-muted-foreground">{punch.demoSeedId && <Badge variant="secondary" className="me-2">{t.demoData}</Badge>}{t.rawStatus}: {punch.status ?? "--"} · {t.rawVerifyType}: {punch.verifyType ?? "--"}</span></div>) : <p className="text-muted-foreground">{t.noPunches}</p>}</div>
          {selectedDaily.day.override && <p className="text-sm">{t.original}: {selectedDaily.day.rawLateMinutes} {t.minutes} · {t.adjustmentReason}: {selectedDaily.day.override.reason}</p>}
          {selectedDaily.day.shift ? <div className="space-y-3 border-t pt-4"><h3 className="font-semibold">{t.manualAdjustment}</h3><div className="grid gap-3 sm:grid-cols-2"><div><Label>{t.adjustedFirstPunch}</Label><Input type="datetime-local" dir="ltr" value={adjustForm.first} onChange={(event) => setAdjustForm({ ...adjustForm, first: event.target.value })} /></div><div><Label>{t.adjustedLastPunch}</Label><Input type="datetime-local" dir="ltr" value={adjustForm.last} onChange={(event) => setAdjustForm({ ...adjustForm, last: event.target.value })} /></div></div><div><Label>{t.waivedLateMinutes}</Label><Input type="number" min="0" value={adjustForm.waived} onChange={(event) => setAdjustForm({ ...adjustForm, waived: event.target.value })} /></div><div><Label>{t.adjustmentReason}</Label><Textarea value={adjustForm.reason} onChange={(event) => setAdjustForm({ ...adjustForm, reason: event.target.value })} /></div><p className="text-xs text-muted-foreground">{t.rawEventsUnchanged}</p>{actionError && <p className="text-sm text-destructive">{actionError}</p>}<DialogFooter><Button onClick={saveAdjustment} disabled={saving}>{t.saveAdjustment}</Button></DialogFooter></div> : <p className="text-sm text-muted-foreground">{t.noShiftAssigned}</p>}
        </div> : <p className="text-muted-foreground">{t.noShiftAssigned}</p>}
    </DialogContent></Dialog>
    <Dialog open={prayerDialog} onOpenChange={setPrayerDialog}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{t.adjustPrayerTimes} · {dateKey}</DialogTitle></DialogHeader><div className="space-y-3"><div className="grid grid-cols-2 gap-3"><div><Label>{t.fajr}</Label><Input type="time" dir="ltr" value={prayerForm.fajr} onChange={(event) => setPrayerForm({ ...prayerForm, fajr: event.target.value })} /></div><div><Label>{t.maghrib}</Label><Input type="time" dir="ltr" value={prayerForm.maghrib} onChange={(event) => setPrayerForm({ ...prayerForm, maghrib: event.target.value })} /></div></div><div><Label>{t.adjustmentReason}</Label><Textarea value={prayerForm.reason} onChange={(event) => setPrayerForm({ ...prayerForm, reason: event.target.value })} /></div>{actionError && <p className="text-sm text-destructive">{actionError}</p>}</div><DialogFooter><Button onClick={savePrayer} disabled={saving}>{t.save}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
