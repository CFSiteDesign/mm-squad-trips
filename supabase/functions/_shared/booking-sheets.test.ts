import { assertEquals } from "jsr:@std/assert@1";
import { sheetExtension, sheetFolder, sheetPath, sheetPathBelongsTo, sheetProblem, SHEET_MAX_BYTES } from "./booking-sheets.ts";

Deno.test("booking sheets: Excel, CSV and PDF only", () => {
  assertEquals(sheetExtension("GRP-CAM-001 endorsement.XLSX"), "xlsx");
  assertEquals(sheetExtension("sheet.xls"), "xls");
  assertEquals(sheetExtension("sheet.xlsm"), "xlsm");
  assertEquals(sheetExtension("sheet.csv"), "csv");
  assertEquals(sheetExtension("sheet.pdf"), "pdf");
  assertEquals(sheetExtension("photo.png"), null);
  assertEquals(sheetExtension("no-extension"), null);
  assertEquals(sheetExtension("evil.xlsx.exe"), null);
});

Deno.test("booking sheets: size and type problems", () => {
  assertEquals(sheetProblem("a.xlsx", 2048), null);
  assertEquals(sheetProblem("a.xlsx", 0), "That file is empty");
  assertEquals(sheetProblem("a.xlsx", SHEET_MAX_BYTES + 1), "That file is over 10 MB");
  assertEquals(sheetProblem("a.docx", 2048), "Attach an Excel file (.xlsx, .xls, .xlsm), a .csv or a .pdf");
});

Deno.test("booking sheets: one folder per booking ref, clean file names", () => {
  assertEquals(sheetFolder("GRP-CAM-001"), "GRP-CAM-001");
  assertEquals(sheetFolder("TB/ABC 12"), "TB_ABC_12");
  assertEquals(sheetPath("SOL-THA-001", "Booking Endorsement (Nov).xlsx", "1"), "SOL-THA-001/1-Booking_Endorsement_Nov.xlsx");
  assertEquals(sheetPath("SOL-THA-001", "....xlsx", "1"), "SOL-THA-001/1-booking-sheet.xlsx");
});

Deno.test("booking sheets: a saved path must be inside its own booking's folder", () => {
  const p = sheetPath("SOL-THA-001", "sheet.xlsx", "1");
  assertEquals(sheetPathBelongsTo(p, "SOL-THA-001"), true);
  assertEquals(sheetPathBelongsTo(p, "SOL-THA-002"), false);
  assertEquals(sheetPathBelongsTo("SOL-THA-001/../SOL-THA-002/x.xlsx", "SOL-THA-001"), false);
  assertEquals(sheetPathBelongsTo("SOL-THA-001/sub/x.xlsx", "SOL-THA-001"), false);
  assertEquals(sheetPathBelongsTo("SOL-THA-001/.hidden", "SOL-THA-001"), false);
  assertEquals(sheetPathBelongsTo("x.xlsx", ""), false);
});
