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
import { ATTENDANCE_DEVICE_SERIAL, getRiyadhDateKey, savePrayerOverride, useAttendanceDevice, useAttendanceEvents, usePrayerRange } from "@/hooks/useAttendance";
import { useAttendanceConfig } from "@/hooks/useAttendanceConfig";
import { saveAttendanceOverride, useAttendanceOverrides } from "@/hooks/useAttendanceOverrides";
import { useEmployees } from "@/hooks/useEmployees";
import { addDays, calculateEmployeeShiftDays, calculateShiftWindow, dateKeysInRange, defaultReportPeriod, getAssignedShiftIds, isWorkingDay, parseDeviceTime, summarizePeriodAttendance, timeLabel } from "@/lib/attendance/calculations";
import { useI18n } from "@/lib/i18n";

function statusBadge(day, t) {
  if (!day) return <Badge variant="secondary">{t.notConfigured}</Badge>;
  if (!day.shift) return <Badge variant="secondary">{day.firstPunch ? t.present : t.notConfigured}</Badge>;
  if (day.status === "conflict") return <Badge variant="destructive">{t.shiftWindowConflict}</Badge>;
  if (day.status === "pending" || day.status === "inProgress") return <Badge variant="secondary">{day.status === "pending" ? t.shiftPending : t.shiftInProgress}</Badge>;
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
            rows.map((row, index) => <TableRow key={row.key || row.employee.id}
              className={`cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring ${row.groupStart && index > 0 ? "border-t-2 border-border" : ""}`}
              tabIndex={0} aria-label={row.rowLabel}
              onClick={() => onSelect(row)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(row); } }}>
              {row.groupStart && <th scope="row" rowSpan={row.groupSize}
                className="min-w-40 cursor-default border-e bg-muted/30 px-3 py-2 text-start align-middle font-medium"
                onClick={(event) => event.stopPropagation()}>
                {row.nameCell}
              </th>}
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
  const [reportRange, setReportRange] = useState(() => defaultReportPeriod());
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
  const reportDates = useMemo(() => {
    try { return dateKeysInRange(reportRange.start, reportRange.end); }
    catch { return []; }
  }, [reportRange.start, reportRange.end]);
  const rangeValid = reportDates.length > 0;
  const startDate = isMonthly ? reportRange.start : dateKey;
  const endDate = isMonthly && rangeValid ? addDays(reportRange.end, 1) : addDays(dateKey, 1);
  const providerKey = `${settings.prayerLocation?.city}|${settings.prayerLocation?.country}|${settings.prayerCalculationMethod}`;
  const dataEnabled = tab !== "settings" && (!isMonthly || rangeValid);
  const prayerStart = isMonthly && rangeValid ? addDays(reportRange.start, -1) : addDays(dateKey, -1);
  const prayerEnd = isMonthly && rangeValid ? addDays(reportRange.end, 1) : addDays(dateKey, 1);
  const prayers = usePrayerRange(prayerStart, prayerEnd, dataEnabled, providerKey);
  const attendance = useAttendanceEvents(startDate, endDate, dataEnabled);
  const adjustments = useAttendanceOverrides(startDate, endDate, dataEnabled);
  const loading = employeesLoading || configLoading || (dataEnabled && (prayers.loading || attendance.loading || adjustments.loading));
  const error = employeesError || configError || (dataEnabled && (prayers.error || attendance.error || adjustments.error));
  const activeEmployees = useMemo(() => employees.filter((employee) => employee.isActive), [employees]);
  const shiftById = useMemo(() => new Map(shifts.map((shift) => [shift.id, shift])), [shifts]);
  const dailyRows = useMemo(() => activeEmployees.flatMap((employee) => {
    const ids = getAssignedShiftIds(employee);
    const employeeShifts = ids.map((id) => shiftById.get(id)).filter(Boolean);
    if (ids.length && employeeShifts.length === ids.length) {
      const shiftDays = calculateEmployeeShiftDays({ employee, shifts: employeeShifts, shiftDate: dateKey,
        prayers: prayers.days[dateKey], neighborPrayers: prayers.days, events: attendance.events,
        overrides: adjustments.overrides.filter((item) => item.employeeId === employee.id && item.shiftDate === dateKey) });
      return employeeShifts.map((shift) => ({ key: `${employee.id}_${shift.id}`, employee, shift,
        day: shiftDays.find((item) => item.shift.id === shift.id) || null }));
    }
    if (ids.length) return [{ key: employee.id, employee, day: null }];
    // Unassigned employees retain a raw calendar-day view.
    const punches = employee.zkUserId ? attendance.events
      .filter((event) => String(event.zkUserId) === employee.zkUserId && event.eventTimeRaw?.startsWith(dateKey))
      .sort((a, b) => a.eventTimeRaw.localeCompare(b.eventTimeRaw)) : [];
    return [{ key: employee.id, employee, day: { shift: null, punches, punchCount: punches.length,
      firstPunch: parseDeviceTime(punches[0]?.eventTimeRaw),
      lastPunch: punches.length > 1 ? parseDeviceTime(punches[punches.length - 1].eventTimeRaw) : null } }];
  }), [activeEmployees, shiftById, dateKey, prayers.days, attendance.events, adjustments.overrides]);

  const monthlyRows = useMemo(() => activeEmployees.map((employee) => {
    const ids = getAssignedShiftIds(employee);
    const employeeShifts = ids.map((id) => shiftById.get(id)).filter(Boolean);
    const today = getRiyadhDateKey();
    const now = new Date();
    const days = !rangeValid || employeeShifts.length !== ids.length ? [] : reportDates.flatMap((date) => {
      if (!isWorkingDay(employee, date) || date > today) return [];
      const created = employee.createdAt?.toDate?.();
      if (created && date < getRiyadhDateKey(created)) return [];
      const rows = calculateEmployeeShiftDays({ employee, shifts: employeeShifts,
        shiftDate: date, prayers: prayers.days[date], neighborPrayers: prayers.days, events: attendance.events,
        overrides: adjustments.overrides.filter((item) => item.employeeId === employee.id && item.shiftDate === date), now });
      return rows.filter((day) => day.expectedEnd <= now || day.status === "conflict");
    });
    return { employee, days, summary: summarizePeriodAttendance(days, settings.monthlyLateThresholdMinutes) };
  }), [activeEmployees, reportDates, rangeValid, shiftById, prayers.days, attendance.events, adjustments.overrides, settings.monthlyLateThresholdMinutes]);

  const selectedDaily = dailyRows.find((row) => row.key === selectedId);
  const selectedMonthly = monthlyRows.find((row) => row.employee.id === selectedId);
  const currentPrayer = prayers.days[dateKey];
  const refresh = () => { attendance.refresh(); adjustments.refresh(); prayers.refresh(); device.refresh(); };
  const shiftName = (shift) => (locale === "ar" ? shift?.nameAr : shift?.nameEn) || "--";

  function selectDaily(row) {
    setSelectedId(row.key);
    setActionError("");
    const override = row.day?.override;
    setAdjustForm({
      first: override?.adjustedFirstPunch?.replace(" ", "T").slice(0, 16) || "",
      last: override?.adjustedLastPunch?.replace(" ", "T").slice(0, 16) || "",
      waived: override?.waivedLateMinutes || 0, reason: override?.reason || "",
    });
  }

  async function saveAdjustment() {
    if (!selectedDaily?.day?.shift || selectedDaily.day.status === "conflict" || !adjustForm.reason.trim() ||
      (!adjustForm.first && !adjustForm.last && Number(adjustForm.waived) <= 0)) {
      setActionError(t.adjustmentRequired); return;
    }
    setSaving(true); setActionError("");
    try {
      await saveAttendanceOverride({ employeeId: selectedDaily.employee.id, shiftDate: dateKey, shiftId: selectedDaily.day.shift.id,
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

  const dailyTableRows = dailyRows.map(({ key, employee, shift, day }, index) => ({
    key, employee, day,
    groupStart: index === 0 || dailyRows[index - 1].employee.id !== employee.id,
    groupSize: dailyRows.filter((row) => row.employee.id === employee.id).length,
    nameCell: <span>{employee.displayName}{employee.demoSeedId && <Badge variant="secondary" className="ms-2">{t.demoData}</Badge>}</span>,
    rowLabel: `${employee.displayName}: ${shiftName(day?.shift || shift)}`,
    cells: [
      <span key="shift" className="inline-flex min-w-28 items-center gap-2 whitespace-nowrap">
        {shiftName(day?.shift || shift)}{day?.override && <Badge variant="secondary">{t.adjusted}</Badge>}
      </span>,
      <span key="expected" dir="ltr">{timeLabel(day?.expectedStart)}</span>,
      <span key="first" dir="ltr">{timeLabel(day?.firstPunch)}</span>,
      <span key="last" dir="ltr">{timeLabel(day?.lastPunch)}</span>,
      day?.punchCount ?? 0,
      day?.firstPunch && day.shift ? `${day.lateMinutes} ${t.minutes}` : "--",
      !isWorkingDay(employee, dateKey) && !day?.firstPunch
        ? <Badge key="off" variant="secondary">{t.dayOff}</Badge> : statusBadge(day, t),
    ],
  }));
  const monthlyTableRows = monthlyRows.map(({ employee, summary }) => ({ employee, cells: [
    <span key="name">{employee.displayName}{employee.demoSeedId && <Badge variant="secondary" className="ms-2">{t.demoData}</Badge>}</span>, getAssignedShiftIds(employee).map((id) => shiftName(shiftById.get(id))).join(" · ") || "--", summary.workingDays,
    summary.scheduledShifts, summary.presentShifts, summary.absentShifts, summary.lateShifts, summary.totalLateMinutes,
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
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t.presentShifts}</p><p className="mt-1 text-3xl font-bold">{dailyRows.filter((row) => row.day?.shift && row.day?.firstPunch).length}</p><p className="text-xs text-muted-foreground">{t.absentShifts}: {dailyRows.filter((row) => isWorkingDay(row.employee, dateKey) && row.day?.status === "absent").length} · {t.lateShifts}: {dailyRows.filter((row) => row.day?.status === "late").length}</p></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{t.attendanceDevice}</p><p className="font-semibold">{device.device?.model || "SenseFace 2A"}</p><p className="text-xs text-muted-foreground" dir="ltr">{ATTENDANCE_DEVICE_SERIAL}</p><Badge variant="secondary">{device.connected ? t.connected : t.disconnected}</Badge></div>{device.connected ? <Wifi className="w-8 h-8 text-green-600" /> : <WifiOff className="w-8 h-8 text-muted-foreground" />}</CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle className="text-lg">{t.expectedStarts}</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-6">
          {shifts.filter((shift) => shift.active).map((shift) => { const window = calculateShiftWindow(dateKey, shift, { startOffsetMinutes: 0, endOffsetMinutes: 0 }, currentPrayer); return <div key={shift.id}><p className="font-medium">{shiftName(shift)}</p><p className="text-sm text-muted-foreground">{t.expectedStart}: {timeLabel(window?.expectedStart)} · {t.graceUntil}: {timeLabel(window?.graceDeadline)} · {t.ends}: {timeLabel(window?.expectedEnd)} {shift.endNextDay ? `(${t.nextDay})` : ""}</p></div>; })}
          {shifts.length === 0 && <p className="text-muted-foreground">{t.noShiftTemplates}</p>}
        </CardContent></Card>
        <AttendanceTable heads={[t.employee, t.assignedShift, t.expectedStart, t.firstPunch, t.lastPunch, t.numberOfPunches, t.lateMinutes, t.status]} rows={dailyTableRows} loading={loading} error={error} empty={t.noActiveEmployees} onSelect={selectDaily} />
      </TabsContent>
      <TabsContent value="monthly" className="space-y-5">
        <div className="flex flex-wrap items-end gap-3"><div><Label>{t.reportStartDate}</Label><Input type="date" dir="ltr" className="w-auto" value={reportRange.start} onChange={(event) => setReportRange({ ...reportRange, start: event.target.value })} /></div><div><Label>{t.reportEndDate}</Label><Input type="date" dir="ltr" className="w-auto" value={reportRange.end} onChange={(event) => setReportRange({ ...reportRange, end: event.target.value })} /></div><span className="text-sm text-muted-foreground">{t.completedWorkingDaysOnly}</span></div>
        {!rangeValid ? <p className="text-sm text-destructive">{t.invalidReportRange}</p> :
          <AttendanceTable heads={[t.employee, t.assignedShift, t.workingDays, t.scheduledShifts, t.presentShifts, t.absentShifts, t.lateShifts, t.totalLateMinutes, t.deductibleMinutes, t.deductionStatus]} rows={monthlyTableRows} loading={loading} error={error} empty={t.noActiveEmployees} onSelect={(row) => setSelectedId(row.employee.id)} />}
      </TabsContent>
      <TabsContent value="settings"><AttendanceSettings shifts={shifts} settings={settings} /></TabsContent>
    </Tabs>
    <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}><DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{selectedDaily?.employee.displayName || selectedMonthly?.employee.displayName}</DialogTitle></DialogHeader>
      {isMonthly ? selectedMonthly && <div className="space-y-3"><p className="text-sm text-muted-foreground">{t.totalLateMinutes}: {selectedMonthly.summary.totalLateMinutes} · {t.monthlyLateThreshold}: {selectedMonthly.summary.thresholdMinutes} · {t.deductibleMinutes}: {selectedMonthly.summary.deductibleMinutes}</p>{selectedMonthly.days.map((day) => <div key={`${day.shiftDate}_${day.shift.id}`} className="flex items-center justify-between gap-3 border-b py-2"><span dir="ltr">{day.shiftDate}</span><span>{shiftName(day.shift)}</span><span>{day.lateMinutes} {t.minutes} {day.override && <Badge variant="secondary">{t.adjusted}</Badge>}</span><span className="text-xs text-muted-foreground">{day.override ? `${t.original}: ${day.rawLateMinutes}` : ""}</span>{statusBadge(day, t)}</div>)}</div> :
        selectedDaily?.day ? <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{dateKey} · {t.expectedStart}: {timeLabel(selectedDaily.day.expectedStart)} · {t.graceUntil}: {timeLabel(selectedDaily.day.graceDeadline)} · {t.ends}: {timeLabel(selectedDaily.day.expectedEnd)}</p>
          <div className="space-y-2">{selectedDaily.day.punches.length ? selectedDaily.day.punches.map((punch) => <div key={punch.id} className="flex justify-between gap-3 rounded-lg border p-3"><span dir="ltr">{punch.eventTimeRaw}</span><span className="text-xs text-muted-foreground">{punch.demoSeedId && <Badge variant="secondary" className="me-2">{t.demoData}</Badge>}{t.rawStatus}: {punch.status ?? "--"} · {t.rawVerifyType}: {punch.verifyType ?? "--"}</span></div>) : <p className="text-muted-foreground">{t.noPunches}</p>}</div>
          {selectedDaily.day.override && <p className="text-sm">{t.original}: {selectedDaily.day.rawLateMinutes} {t.minutes} · {t.adjustmentReason}: {selectedDaily.day.override.reason}</p>}
          {selectedDaily.day.status === "conflict" ? <p className="text-sm text-destructive">{t.shiftWindowConflict}</p> :
            selectedDaily.day.shift ? <div className="space-y-3 border-t pt-4"><h3 className="font-semibold">{t.manualAdjustment}</h3><div className="grid gap-3 sm:grid-cols-2"><div><Label>{t.adjustedFirstPunch}</Label><Input type="datetime-local" dir="ltr" value={adjustForm.first} onChange={(event) => setAdjustForm({ ...adjustForm, first: event.target.value })} /></div><div><Label>{t.adjustedLastPunch}</Label><Input type="datetime-local" dir="ltr" value={adjustForm.last} onChange={(event) => setAdjustForm({ ...adjustForm, last: event.target.value })} /></div></div><div><Label>{t.waivedLateMinutes}</Label><Input type="number" min="0" value={adjustForm.waived} onChange={(event) => setAdjustForm({ ...adjustForm, waived: event.target.value })} /></div><div><Label>{t.adjustmentReason}</Label><Textarea value={adjustForm.reason} onChange={(event) => setAdjustForm({ ...adjustForm, reason: event.target.value })} /></div><p className="text-xs text-muted-foreground">{t.rawEventsUnchanged}</p>{actionError && <p className="text-sm text-destructive">{actionError}</p>}<DialogFooter><Button onClick={saveAdjustment} disabled={saving}>{t.saveAdjustment}</Button></DialogFooter></div> : <p className="text-sm text-muted-foreground">{t.noShiftAssigned}</p>}
        </div> : <p className="text-muted-foreground">{t.noShiftAssigned}</p>}
    </DialogContent></Dialog>
    <Dialog open={prayerDialog} onOpenChange={setPrayerDialog}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{t.adjustPrayerTimes} · {dateKey}</DialogTitle></DialogHeader><div className="space-y-3"><div className="grid grid-cols-2 gap-3"><div><Label>{t.fajr}</Label><Input type="time" dir="ltr" value={prayerForm.fajr} onChange={(event) => setPrayerForm({ ...prayerForm, fajr: event.target.value })} /></div><div><Label>{t.maghrib}</Label><Input type="time" dir="ltr" value={prayerForm.maghrib} onChange={(event) => setPrayerForm({ ...prayerForm, maghrib: event.target.value })} /></div></div><div><Label>{t.adjustmentReason}</Label><Textarea value={prayerForm.reason} onChange={(event) => setPrayerForm({ ...prayerForm, reason: event.target.value })} /></div>{actionError && <p className="text-sm text-destructive">{actionError}</p>}</div><DialogFooter><Button onClick={savePrayer} disabled={saving}>{t.save}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
