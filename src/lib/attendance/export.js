import { timeLabel } from "./calculations.js";

// Export the same calculated rows displayed by the report; never recalculate payroll here.
export async function createAttendanceWorkbook({ rows, events, range, locale, t }) {
  const ExcelJS = (await import("exceljs")).default;
  const book = new ExcelJS.Workbook();
  const sheet = (name, headers) => {
    const result = book.addWorksheet(name, { views: [{ rightToLeft: locale === "ar", state: "frozen", ySplit: 1 }] });
    result.addRow(headers);
    result.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    result.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF8A776F" } };
    result.columns.forEach((column) => { column.width = 23; });
    result.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
    return result;
  };
  const fields = ["workingDays", "scheduledShifts", "presentShifts", "absentShifts", "lateShifts", "totalLateMinutes", "deductibleMinutes"];
  const summary = sheet(t.exportSummary, [t.employee, t.zkUserId, ...fields.map((field) => t[field]), t.monthlyLateThreshold, t.deductionStatus]);
  const details = sheet(t.exportRecords, [t.employee, t.selectedDate, t.assignedShift, t.expectedStart, t.ends, t.firstPunch, t.lastPunch, t.attendanceStatus, t.rawLateMinutes, t.totalLateMinutes, t.waivedMinutes, t.adjustmentReason]);
  const punches = sheet(t.exportPunches, [t.employee, t.zkUserId, t.punchTime, t.punchSource]);
  for (const { employee, summary: totals, days } of rows) {
    summary.addRow([employee.displayName, String(employee.zkUserId ?? ""), ...fields.map((field) => totals[field]), totals.thresholdMinutes, totals.deductionApplies ? t.deductionApplies : t.noDeduction]);
    for (const day of days) {
      details.addRow([employee.displayName, day.shiftDate, locale === "ar" ? day.shift?.nameAr : day.shift?.nameEn, timeLabel(day.expectedStart), timeLabel(day.expectedEnd), timeLabel(day.firstPunch), timeLabel(day.lastPunch), t[day.status] || day.status, day.rawLateMinutes ?? day.lateMinutes, day.lateMinutes, day.override?.waivedLateMinutes || 0, day.override?.reason || ""]);
    }
    const linked = new Set(days.flatMap((day) => day.punches || []).map((event) => event.id || event.eventTimeRaw));
    for (const event of events.filter((event) => employee.zkUserId != null && String(event.zkUserId) === String(employee.zkUserId) &&
      ((event.eventTimeRaw?.slice(0, 10) >= range.start && event.eventTimeRaw?.slice(0, 10) <= range.end) || linked.has(event.id || event.eventTimeRaw)))) {
      punches.addRow([employee.displayName, String(employee.zkUserId), event.eventTimeRaw, event.source || ""]);
    }
  }
  summary.addRow([t.summaryTotal, "", ...fields.map((field) => rows.reduce((sum, row) => sum + row.summary[field], 0)), "", ""]).font = { bold: true };
  const filters = sheet(t.exportFilters, [t.reportFilter, t.reportValue]);
  filters.addRows([[t.reportStartDate, range.start], [t.reportEndDate, range.end], [t.reportEmployees, rows.map((row) => row.employee.displayName).join("، ")], [t.exportDeductionNote, t.deductionMinutesOnly], [t.completedWorkingDaysOnly, true]]);
  return book;
}

export async function downloadAttendanceReport(input) {
  const book = await createAttendanceWorkbook(input);
  const buffer = await book.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `attendance-${input.range.start}-${input.range.end}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
