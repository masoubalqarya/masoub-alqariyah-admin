import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateDailyAttendance,
  calculateShiftWindow,
  isWorkingDay,
  summarizeMonthlyAttendance,
  timeLabel,
} from "./calculations.js";

const morning = {
  id: "morning",
  active: true,
  startPrayer: "Fajr",
  startOffsetMinutes: 20,
  endTime: "12:00",
  endNextDay: false,
  graceMinutes: 10,
};
const employee = { id: "ahmed", isActive: true, zkUserId: "1", startOffsetMinutes: 0, endOffsetMinutes: 0 };
const prayers = { fajr: "05:00", maghrib: "18:15" };
const punch = (time) => ({ zkUserId: "1", eventTimeRaw: time });

test("morning arrival inside grace has no lateness", () => {
  const day = calculateDailyAttendance({
    employee, shift: morning, shiftDate: "2026-10-21", prayers,
    events: [punch("2026-10-21 05:25:00")],
  });
  assert.equal(day.lateMinutes, 0);
  assert.equal(day.lastPunch, null);
});

test("arrival after grace is 15 minutes late", () => {
  const day = calculateDailyAttendance({
    employee, shift: morning, shiftDate: "2026-10-21", prayers,
    events: [punch("2026-10-21 05:45:00")],
  });
  assert.equal(timeLabel(day.expectedStart), "05:20");
  assert.equal(timeLabel(day.graceDeadline), "05:30");
  assert.equal(day.lateMinutes, 15);
});

test("employee start offset changes deadline", () => {
  const day = calculateDailyAttendance({
    employee: { ...employee, startOffsetMinutes: 15 }, shift: morning,
    shiftDate: "2026-10-21", prayers,
    events: [punch("2026-10-21 05:50:00")],
  });
  assert.equal(timeLabel(day.expectedStart), "05:35");
  assert.equal(timeLabel(day.graceDeadline), "05:45");
  assert.equal(day.lateMinutes, 5);
});

test("evening shift owns punches after midnight", () => {
  const evening = {
    ...morning, id: "evening", startPrayer: "Maghrib", startOffsetMinutes: 15,
    endTime: "02:00", endNextDay: true,
  };
  const window = calculateShiftWindow("2026-10-21", evening, employee, prayers);
  assert.equal(timeLabel(window.expectedStart), "18:30");
  assert.equal(timeLabel(window.expectedEnd), "02:00");
  const day = calculateDailyAttendance({
    employee, shift: evening, shiftDate: "2026-10-21", prayers,
    events: [punch("2026-10-21 18:29:00"), punch("2026-10-22 01:51:00")],
  });
  assert.equal(day.punchCount, 2);
  assert.equal(timeLabel(day.lastPunch), "01:51");
  assert.equal(day.shiftDate, "2026-10-21");
});

test("morning and evening punch windows do not overlap for a normal day", () => {
  const evening = { ...morning, startPrayer: "Maghrib", endTime: "02:00", endNextDay: true };
  const first = calculateShiftWindow("2026-10-21", morning, employee, prayers);
  const second = calculateShiftWindow("2026-10-21", evening, employee, prayers);
  assert.ok(first.windowEnd < second.windowStart);
});

test("configured weekly days off are excluded from working days", () => {
  assert.equal(isWorkingDay({ ...employee, weeklyOffDays: [5] }, "2026-10-23"), false);
  assert.equal(isWorkingDay({ ...employee, weeklyOffDays: [5] }, "2026-10-24"), true);
});

test("inactive template still calculates for an employee already assigned to it", () => {
  const day = calculateDailyAttendance({ employee, shift: { ...morning, active: false },
    shiftDate: "2026-10-21", prayers, events: [punch("2026-10-21 05:25:00")] });
  assert.equal(day.status, "onTime");
});

test("manual adjustment preserves raw late result and changes effective lateness", () => {
  const day = calculateDailyAttendance({
    employee, shift: morning, shiftDate: "2026-10-21", prayers,
    events: [punch("2026-10-21 05:51:00")],
    override: { waivedLateMinutes: 21, reason: "Manager approved" },
  });
  assert.equal(day.rawLateMinutes, 21);
  assert.equal(day.lateMinutes, 0);
  assert.equal(day.punchCount, 1);
});

for (const [late, applies, deductible] of [
  [59, false, 0], [60, true, 60], [61, true, 61], [78, true, 78],
]) {
  test(`Option B at ${late} minutes`, () => {
    const summary = summarizeMonthlyAttendance([{ firstPunch: new Date(), lateMinutes: late }], 60);
    assert.equal(summary.deductionApplies, applies);
    assert.equal(summary.deductibleMinutes, deductible);
  });
}
