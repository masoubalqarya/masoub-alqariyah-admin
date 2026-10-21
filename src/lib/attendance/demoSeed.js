import { calculateShiftWindow, dateKeysInMonth, isWorkingDay } from "./calculations.js";

export const DEMO_SEED_ID = "attendance-demo-v1";
export const DEMO_NIGHT_SHIFT_ID = "attendance-demo-night-v1";
export const DEMO_EMPLOYEES = [
  { zkUserId: "2", displayName: "Demo Ahmed", shift: "morning", startOffsetMinutes: 0, endOffsetMinutes: 0, weeklyOffDays: [5] },
  { zkUserId: "3", displayName: "Demo Bilal", shift: "morning", startOffsetMinutes: 10, endOffsetMinutes: 0, weeklyOffDays: [5] },
  { zkUserId: "4", displayName: "Demo Omar", shift: "morning", startOffsetMinutes: -15, endOffsetMinutes: 0, weeklyOffDays: [5] },
  { zkUserId: "5", displayName: "Demo Youssef", shift: "morning", startOffsetMinutes: 0, endOffsetMinutes: -30, weeklyOffDays: [5] },
  { zkUserId: "6", displayName: "Demo Sami", shift: "morning", startOffsetMinutes: 20, endOffsetMinutes: 0, weeklyOffDays: [5, 6] },
  { zkUserId: "7", displayName: "Demo Khaled", shift: "morning", startOffsetMinutes: 0, endOffsetMinutes: 15, weeklyOffDays: [6] },
  { zkUserId: "8", displayName: "Demo Nasser", shift: "night", startOffsetMinutes: 0, endOffsetMinutes: 0, weeklyOffDays: [5] },
  { zkUserId: "9", displayName: "Demo Fahad", shift: "night", startOffsetMinutes: 10, endOffsetMinutes: 0, weeklyOffDays: [5] },
  { zkUserId: "10", displayName: "Demo Majed", shift: "night", startOffsetMinutes: -10, endOffsetMinutes: 20, weeklyOffDays: [6] },
];

export function demoEmployeeId(zkUserId) {
  return `attendance-demo-employee-${zkUserId}`;
}

export function demoDates(year, month, today) {
  return dateKeysInMonth(year, month).filter((date) => date <= today);
}

export function planDemoPunches({ employee, shift, date, prayers, workingIndex, now }) {
  if (!isWorkingDay(employee, date)) return [];
  const window = calculateShiftWindow(date, shift, employee, prayers);
  if (!window) throw new Error(`Shift or prayer time missing for ${date}`);
  if (workingIndex > 0 && ((employee.zkUserId === "7" && workingIndex % 9 === 0) ||
    (employee.zkUserId === "10" && workingIndex % 7 === 0) ||
    (employee.zkUserId === "2" && workingIndex % 17 === 0))) return [];

  // These monthly totals deliberately straddle the default 60-minute threshold.
  const thresholdCases = { "3": 59, "4": 60, "5": 78 };
  let lateMinutes = workingIndex === 0 ? thresholdCases[employee.zkUserId] || 0 : 0;
  if (employee.zkUserId === "9" && workingIndex === 0) lateMinutes = 25;
  if (employee.zkUserId === "8" && workingIndex % 8 === 4) lateMinutes = 12;
  const first = new Date(window.graceDeadline.getTime() + (lateMinutes || -4) * 60_000);
  if (first > now) return [];
  const punches = [first];
  if (employee.zkUserId === "6" && workingIndex % 6 === 2) return punches;
  const last = new Date(window.expectedEnd.getTime() - 5 * 60_000);
  if (last <= first || last > now) return punches;
  if (workingIndex % 5 === 0) {
    const middle = first.getTime() + (last.getTime() - first.getTime()) / 2;
    punches.push(new Date(middle - 20 * 60_000), new Date(middle + 20 * 60_000));
  }
  punches.push(last);
  return punches;
}
