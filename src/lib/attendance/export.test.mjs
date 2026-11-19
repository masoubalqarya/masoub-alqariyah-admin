import test from "node:test";
import assert from "node:assert/strict";
import { createAttendanceWorkbook } from "./export.js";
import en from "../i18n/en.js";
import { calculateDailyAttendance, summarizePeriodAttendance } from "./calculations.js";

test("XLSX exports the selected employees, existing calculations, date filters and safe text cells", async () => {
  const employee = { id: "one", displayName: "=NotAFormula", zkUserId: "1", isActive: true };
  const events = [{ id: "one", zkUserId: "1", eventTimeRaw: "2026-10-21 08:30:00" }, { id: "other", zkUserId: "2", eventTimeRaw: "2026-10-21 08:30:00" }, { id: "outside", zkUserId: "1", eventTimeRaw: "2026-10-20 08:30:00" }];
  const day = calculateDailyAttendance({ employee, shiftDate: "2026-10-21", shift: { id: "s", nameEn: "Morning", startType: "fixed", startTime: "08:00", endTime: "12:00", graceMinutes: 0 }, events });
  const summary = summarizePeriodAttendance([day], 10);
  const book = await createAttendanceWorkbook({ rows: [{ employee, days: [day], summary }], events, range: { start: "2026-10-21", end: "2026-10-21" }, locale: "ar", t: en });
  const buffer = await book.xlsx.writeBuffer();
  assert.equal(Buffer.from(buffer).subarray(0, 2).toString(), "PK");
  const ExcelJS = (await import("exceljs")).default;
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(buffer);
  const summarySheet = loaded.getWorksheet(en.exportSummary);
  assert.equal(summarySheet.getCell("A2").value, "=NotAFormula");
  assert.equal(summarySheet.getCell("A2").type, ExcelJS.ValueType.String);
  assert.equal(summarySheet.getCell("H2").value, summary.totalLateMinutes);
  assert.equal(summarySheet.getCell("I2").value, summary.deductibleMinutes);
  assert.equal(summarySheet.views[0].rightToLeft, true);
  assert.equal(loaded.getWorksheet(en.exportPunches).rowCount, 2);
  assert.equal(loaded.getWorksheet(en.exportFilters).getCell("B2").value, "2026-10-21");
});
