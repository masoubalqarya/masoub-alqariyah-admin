import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateDailyAttendance, calculateEmployeeShiftDays, dateKeyInRiyadh, dateKeysInMonth, isWorkingDay, summarizePeriodAttendance } from "./calculations.js";
import { DEMO_EMPLOYEES, planDemoPunches } from "./demoSeed.js";

const prayers = { fajr: "05:00", maghrib: "18:00" };
const morning = { startPrayer: "Fajr", startOffsetMinutes: 20, endTime: "14:00", endNextDay: false, graceMinutes: 10 };
const night = { startPrayer: "Maghrib", startOffsetMinutes: 15, endTime: "02:00", endNextDay: true, graceMinutes: 10 };
const now = new Date("2026-11-01T00:00:00+03:00");

function monthDays(zkUserId, month) {
  const base = DEMO_EMPLOYEES.find((item) => item.zkUserId === zkUserId);
  const employee = { ...base, isActive: true };
  const shift = base.shift === "night" ? night : morning;
  let workingIndex = 0;
  return dateKeysInMonth(2026, month).filter((date) => isWorkingDay(employee, date)).map((date) => {
    const instants = planDemoPunches({ employee, shift, date, prayers, workingIndex: workingIndex++, now });
    const events = instants.map((instant) => ({ zkUserId, eventTimeRaw: new Date(instant.getTime() + 3 * 60 * 60_000).toISOString().slice(0, 19).replace("T", " ") }));
    return calculateDailyAttendance({ employee, shift, shiftDate: date, prayers, events });
  });
}

test("demo cases straddle the monthly 60-minute threshold", () => {
  for (const month of [8, 9]) {
    assert.equal(monthDays("3", month).reduce((sum, day) => sum + day.lateMinutes, 0), 59);
    assert.equal(monthDays("4", month).reduce((sum, day) => sum + day.lateMinutes, 0), 60);
    assert.equal(monthDays("5", month).reduce((sum, day) => sum + day.lateMinutes, 0), 78);
  }
});

test("demo includes absence, single punches, multiple punches, and overnight checkout", () => {
  const absent = monthDays("7", 8);
  const singles = monthDays("6", 8);
  const overnight = monthDays("8", 8);
  assert.ok(absent.some((day) => day.status === "absent"));
  assert.ok(singles.some((day) => day.punchCount === 1 && day.lastPunch === null));
  assert.ok(overnight.some((day) => day.punchCount === 4));
  assert.ok(overnight.some((day) => day.lastPunch && dateKeyInRiyadh(day.lastPunch) > day.shiftDate));
});

test("incomplete future shift never receives punches", () => {
  const employee = { ...DEMO_EMPLOYEES[6], isActive: true };
  assert.deepEqual(planDemoPunches({ employee, shift: night, date: "2026-10-21", prayers,
    workingIndex: 5, now: new Date("2026-10-21T12:00:00+03:00") }), []);
});

test("both demo shifts are seeded deterministically and threshold cases remain on original shift", () => {
  for (const [zkUserId, expected] of [["3", 59], ["4", 60], ["5", 78]]) {
    const base = DEMO_EMPLOYEES.find((item) => item.zkUserId === zkUserId);
    const employee = { ...base, isActive: true, shiftIds: ["morning", "night"] };
    let workingIndex = 0;
    const days = dateKeysInMonth(2026, 8).filter((date) => isWorkingDay(employee, date)).flatMap((date) => {
      const index = workingIndex++;
      const first = planDemoPunches({ employee, shift: morning, date, prayers, workingIndex: index, now });
      const second = planDemoPunches({ employee, shift: night, date, prayers, workingIndex: index, now, isSecondary: true });
      assert.deepEqual(second, planDemoPunches({ employee, shift: night, date, prayers, workingIndex: index, now, isSecondary: true }));
      const events = [...first, ...second].map((instant) => ({ zkUserId,
        eventTimeRaw: new Date(instant.getTime() + 3 * 60 * 60_000).toISOString().slice(0, 19).replace("T", " ") }));
      return calculateEmployeeShiftDays({ employee, shifts: [{ ...morning, id: "morning" }, { ...night, id: "night" }],
        shiftDate: date, prayers, events, now });
    });
    assert.equal(summarizePeriodAttendance(days, 60).totalLateMinutes, expected);
    assert.equal(days.length, 2 * dateKeysInMonth(2026, 8).filter((date) => isWorkingDay(employee, date)).length);
  }
});
