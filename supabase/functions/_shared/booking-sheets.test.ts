import { assertEquals } from "jsr:@std/assert@1";
import { driveLink, driveLinkKind, driveLinkProblem, DRIVE_LINK_MAX } from "./booking-sheets.ts";

const SHEET = "https://docs.google.com/spreadsheets/d/1AbC-dEf_123/edit?usp=sharing";

Deno.test("booking sheets: Google Drive links are kept as pasted", () => {
  assertEquals(driveLink(SHEET), SHEET);
  assertEquals(driveLink(`  ${SHEET}\n`), SHEET);
  assertEquals(driveLink("https://drive.google.com/file/d/1xYz/view?usp=drive_link"), "https://drive.google.com/file/d/1xYz/view?usp=drive_link");
  assertEquals(driveLink("https://drive.google.com/drive/folders/1Folder"), "https://drive.google.com/drive/folders/1Folder");
  assertEquals(driveLink("https://DRIVE.google.com/open?id=1xYz"), "https://drive.google.com/open?id=1xYz");
  // Pasted without the https:// still works.
  assertEquals(driveLink("docs.google.com/spreadsheets/d/1AbC/edit"), "https://docs.google.com/spreadsheets/d/1AbC/edit");
});

Deno.test("booking sheets: anything that isn't a Google Drive link is refused", () => {
  for (const bad of [
    "",
    "   ",
    "not a link",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "http://docs.google.com/spreadsheets/d/1AbC/edit",
    "https://drive.google.com",
    "https://drive.google.com/",
    "https://drive.google.com.evil.example/file/d/1",
    "https://evil.example/?u=https://drive.google.com/file/d/1",
    "https://user:pw@drive.google.com/file/d/1",
    "https://drive.google.com:8443/file/d/1",
    "https://onedrive.live.com/edit.aspx?resid=1",
    "https://dropbox.com/s/abc/sheet.xlsx",
    `https://drive.google.com/file/d/${"x".repeat(DRIVE_LINK_MAX)}`,
  ]) assertEquals(driveLink(bad), null, bad);
});

Deno.test("booking sheets: problems read like instructions", () => {
  assertEquals(driveLinkProblem(SHEET), null);
  assertEquals(driveLinkProblem(""), "Paste the Google Drive link");
  assertEquals(driveLinkProblem("https://dropbox.com/s/abc"), "That isn't a Google Drive link. Copy it from Drive with Share > Copy link");
  assertEquals(driveLinkProblem(`https://drive.google.com/${"x".repeat(DRIVE_LINK_MAX)}`), "That link is too long");
});

Deno.test("booking sheets: the admin names the link by what it points at", () => {
  assertEquals(driveLinkKind(SHEET), "Google Sheet");
  assertEquals(driveLinkKind("https://sheets.google.com/abc"), "Google Sheet");
  assertEquals(driveLinkKind("https://docs.google.com/document/d/1/edit"), "Google Doc");
  assertEquals(driveLinkKind("https://docs.google.com/presentation/d/1/edit"), "Google Slides");
  assertEquals(driveLinkKind("https://drive.google.com/drive/folders/1"), "Drive folder");
  assertEquals(driveLinkKind("https://drive.google.com/drive/u/0/folders/1"), "Drive folder");
  assertEquals(driveLinkKind("https://drive.google.com/file/d/1/view"), "Drive file");
  assertEquals(driveLinkKind("https://drive.google.com/open?id=1"), "Drive file");
  assertEquals(driveLinkKind("https://drive.google.com/drive/my-drive"), "Google Drive link");
  assertEquals(driveLinkKind("nonsense"), "Google Drive link");
});
