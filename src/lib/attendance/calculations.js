export const RIYADH_TIMEZONE = "Asia/Riyadh";
const RIYADH_OFFSET = "+03:00";
const PUNCH_WINDOW_BUFFER_MINUTES = 90;

export function dateKeyInRiyadh(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: RIYADH_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function addDays(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

export function dateKeysInMonth(year, month) {
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from(
    { length: count },
    (_, index) => `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
  );
}

function monthDateKey(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

export function defaultReportPeriod(today = dateKeyInRiyadh()) {
  const [year, month, day] = today.split("-").map(Number);
  const endMonthOffset = day >= 28 ? 0 : -1;
  return {
    start: monthDateKey(year, month + endMonthOffset - 1, 28),
    end: monthDateKey(year, month + endMonthOffset, 27),
  };
}

export function dateKeysInRange(start, end, maxDays = 366) {
  const valid = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "") &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (!valid(start) || !valid(end)) throw new Error("Invalid report date");
  const count = Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
  if (count < 1 || count > maxDays) throw new Error("Report range must be 1–366 days");
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}

export function getAssignedShiftIds(employee) {
  const ids = Array.isArray(employee?.shiftIds) ? employee.shiftIds : employee?.shiftId ? [employee.shiftId] : [];
  return [...new Set(ids.filter((id) => typeof id === "string" && id))];
}

export function riyadhDateTime(dateKey, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || "")) {
    return null;
  }
  const date = new Date(`${dateKey}T${time}:00${RIYADH_OFFSET}`);
  return Number.isNaN(date.getTime()) || dateKeyInRiyadh(date) !== dateKey
    ? null
    : date;
}

export function parseDeviceTime(raw) {
  const match = /^(\d{4}-\d{2}-\d{2}) ([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.exec(raw || "");
  if (!match) return null;
  const date = new Date(`${match[1]}T${match[2]}:${match[3]}:${match[4]}${RIYADH_OFFSET}`);
  return Number.isNaN(date.getTime()) || dateKeyInRiyadh(date) !== match[1]
    ? null
    : date;
}

export function timeLabel(date) {
  if (!date) return "--";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: RIYADH_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function isWorkingDay(employee, dateKey) {
  if (!employee?.isActive) return false;
  const weekday = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
  return !(employee.weeklyOffDays || []).includes(weekday);
}

export function calculateShiftWindow(shiftDate, shift, employee, prayers) {
  if (!shift || !prayers || !employee) return null;
  const prayer = shift.startPrayer === "Fajr" ? prayers.fajr : prayers.maghrib;
  const baseStart = riyadhDateTime(shiftDate, prayer);
  const endDate = shift.endNextDay ? addDays(shiftDate, 1) : shiftDate;
  const baseEnd = riyadhDateTime(endDate, shift.endTime);
  if (!baseStart || !baseEnd) return null;

  const startOffset = Number(shift.startOffsetMinutes || 0) +
    Number(employee.startOffsetMinutes || 0);
  const endOffset = Number(employee.endOffsetMinutes || 0);
  const graceMinutes = Number(shift.graceMinutes || 0);
  if (![startOffset, endOffset, graceMinutes].every(Number.isFinite) || graceMinutes < 0) return null;
  const expectedStart = new Date(baseStart.getTime() + startOffset * 60_000);
  const expectedEnd = new Date(baseEnd.getTime() + endOffset * 60_000);
  if (expectedEnd <= expectedStart) return null;
  return {
    shiftDate,
    baseStart,
    expectedStart,
    expectedEnd,
    graceDeadline: new Date(expectedStart.getTime() + graceMinutes * 60_000),
    windowStart: new Date(expectedStart.getTime() - PUNCH_WINDOW_BUFFER_MINUTES * 60_000),
    windowEnd: new Date(expectedEnd.getTime() + PUNCH_WINDOW_BUFFER_MINUTES * 60_000),
  };
}

export function calculateDailyAttendance({ employee, shift, shiftDate, prayers, events = [], override }) {
  const window = calculateShiftWindow(shiftDate, shift, employee, prayers);
  if (!window) return null;

  const punches = events
    .filter((event) => String(event.zkUserId) === String(employee.zkUserId) && employee.zkUserId)
    .map((event) => ({ ...event, instant: parseDeviceTime(event.eventTimeRaw) }))
    .filter((event) => event.instant && event.instant >= window.windowStart && event.instant < window.windowEnd)
    .sort((a, b) => a.instant - b.instant);

  const rawFirstPunch = punches[0]?.instant || null;
  const rawLastPunch = punches.length > 1 ? punches[punches.length - 1].instant : null;
  const adjustedFirstPunch = override?.adjustedFirstPunch
    ? parseDeviceTime(override.adjustedFirstPunch)
    : null;
  const adjustedLastPunch = override?.adjustedLastPunch
    ? parseDeviceTime(override.adjustedLastPunch)
    : null;
  const firstPunch = adjustedFirstPunch || rawFirstPunch;
  const lastPunch = adjustedLastPunch || rawLastPunch;
  const rawLateMinutes = rawFirstPunch
    ? Math.max(0, Math.floor((rawFirstPunch - window.graceDeadline) / 60_000))
    : 0;
  const calculatedLateMinutes = firstPunch
    ? Math.max(0, Math.floor((firstPunch - window.graceDeadline) / 60_000))
    : 0;
  const waivedLateMinutes = Math.max(0, Number(override?.waivedLateMinutes || 0));
  const lateMinutes = Math.max(0, calculatedLateMinutes - waivedLateMinutes);

  return {
    employee,
    shift,
    shiftDate,
    ...window,
    punches,
    punchCount: punches.length,
    rawFirstPunch,
    rawLastPunch,
    firstPunch,
    lastPunch,
    rawLateMinutes,
    lateMinutes,
    override: override || null,
    status: !firstPunch ? "absent" : lateMinutes > 0 ? "late" : "onTime",
  };
}

export function calculateEmployeeShiftDays({ employee, shifts, shiftDate, prayers, neighborPrayers = {}, events = [], overrides = [], now = new Date() }) {
  const windows = shifts.map((shift) => ({ shift,
    window: calculateShiftWindow(shiftDate, shift, employee, prayers) }));
  if (windows.some((item) => !item.window)) return [];
  const neighbors = [-1, 1].flatMap((offset) => {
    const date = addDays(shiftDate, offset);
    return neighborPrayers[date] && isWorkingDay(employee, date)
      ? shifts.map((shift) => calculateShiftWindow(date, shift, employee, neighborPrayers[date])).filter(Boolean)
      : [];
  });
  const intersects = (left, right) => left.windowStart < right.windowEnd && right.windowStart < left.windowEnd;
  return windows.map(({ shift, window }, index) => {
    const conflict = windows.some((item, otherIndex) => otherIndex !== index && intersects(window, item.window)) ||
      neighbors.some((neighbor) => intersects(window, neighbor));
    if (conflict) return { employee, shift, shiftDate, ...window,
      punches: [], punchCount: 0, firstPunch: null, lastPunch: null,
      lateMinutes: 0, override: null, status: "conflict" };
    const override = overrides.find((item) => item.shiftId === shift.id) ||
      (employee.shiftId === shift.id ? overrides.find((item) => !item.shiftId) : null);
    const day = calculateDailyAttendance({ employee, shift, shiftDate, prayers, events, override });
    return { ...day, status: day.expectedEnd > now
      ? day.firstPunch ? "inProgress" : "pending" : day.status };
  });
}

export function summarizePeriodAttendance(days, thresholdMinutes) {
  const eligible = days.filter((day) => day && !["conflict", "pending", "inProgress"].includes(day.status));
  const totalLateMinutes = eligible.reduce((total, day) => total + day.lateMinutes, 0);
  const threshold = Math.max(0, Number(thresholdMinutes) || 0);
  const deductionApplies = totalLateMinutes >= threshold;
  return {
    workingDays: new Set(eligible.map((day) => day.shiftDate)).size,
    scheduledShifts: eligible.length,
    presentShifts: eligible.filter((day) => day.firstPunch).length,
    absentShifts: eligible.filter((day) => !day.firstPunch).length,
    lateShifts: eligible.filter((day) => day.lateMinutes > 0).length,
    totalLateMinutes,
    thresholdMinutes: threshold,
    deductionApplies,
    deductibleMinutes: deductionApplies ? totalLateMinutes : 0,
  };
}

export function summarizeMonthlyAttendance(days, thresholdMinutes) {
  const workingDays = days.length;
  const presentDays = days.filter((day) => day.firstPunch).length;
  const lateDays = days.filter((day) => day.lateMinutes > 0).length;
  const totalLateMinutes = days.reduce((total, day) => total + day.lateMinutes, 0);
  const threshold = Math.max(0, Number(thresholdMinutes) || 0);
  const deductionApplies = totalLateMinutes >= threshold;
  return {
    workingDays,
    presentDays,
    absentDays: workingDays - presentDays,
    lateDays,
    totalLateMinutes,
    thresholdMinutes: threshold,
    deductionApplies,
    deductibleMinutes: deductionApplies ? totalLateMinutes : 0,
  };
}
