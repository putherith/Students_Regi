const SHEET_NAME = "Students";
const DASHBOARD_SHEET_NAME = "Dashboard";
const BY_CLASS_SHEET_NAME = "By Class";
const CLASS_SHEET_PREFIX = "Class - ";

const HEADERS = [
  "id",
  "studentCode",
  "studentName",
  "gender",
  "dob",
  "className",
  "fromSchool",
  "pobVillage",
  "pobCommune",
  "pobDistrict",
  "pobProvince",
  "contact",
  "fatherName",
  "motherName",
  "currentVillage",
  "currentCommune",
  "currentDistrict",
  "currentProvince",
  "photo",
  "createdAt",
  "updatedAt"
];

const HEADER_LABELS = {
  id: "លេខក្នុងប្រព័ន្ធ",
  studentCode: "អត្តលេខ",
  studentName: "គោត្តនាម-នាម",
  gender: "ភេទ",
  dob: "ថ្ងៃខែឆ្នាំកំណើត",
  className: "ថ្នាក់",
  fromSchool: "សាលា",
  pobVillage: "ភូមិកំណើត",
  pobCommune: "ឃុំ/សង្កាត់កំណើត",
  pobDistrict: "ស្រុក/ខណ្ឌកំណើត",
  pobProvince: "ខេត្ត/ក្រុងកំណើត",
  contact: "លេខទូរស័ព្ទ",
  fatherName: "ឈ្មោះឪពុក",
  motherName: "ឈ្មោះម្តាយ",
  currentVillage: "ភូមិបច្ចុប្បន្ន",
  currentCommune: "ឃុំ/សង្កាត់បច្ចុប្បន្ន",
  currentDistrict: "ស្រុក/ខណ្ឌបច្ចុប្បន្ន",
  currentProvince: "ខេត្ត/ក្រុងបច្ចុប្បន្ន",
  photo: "រូបថត",
  createdAt: "បង្កើតនៅ",
  updatedAt: "កែចុងក្រោយ"
};

const VIEW_FIELDS = [
  "studentCode",
  "studentName",
  "gender",
  "dob",
  "className",
  "fromSchool",
  "contact",
  "fatherName",
  "motherName",
  "pobVillage",
  "pobCommune",
  "pobDistrict",
  "pobProvince",
  "currentVillage",
  "currentCommune",
  "currentDistrict",
  "currentProvince",
  "photo"
];

const HEADER_ROW = HEADERS.map(function(key) { return HEADER_LABELS[key] || key; });
const VIEW_HEADER_ROW = VIEW_FIELDS.map(function(key) { return HEADER_LABELS[key] || key; });

const STUDENT_COLUMN_WIDTHS = [90, 95, 170, 60, 105, 80, 165, 115, 135, 135, 135, 120, 130, 130, 125, 150, 150, 150, 100, 145, 145];
const VIEW_COLUMN_WIDTHS = [95, 170, 60, 105, 80, 165, 120, 130, 130, 115, 135, 135, 135, 125, 150, 150, 150, 100];
const CLASS_TAB_COLORS = ["#0f766e", "#2563eb", "#7c3aed", "#15803d", "#b45309", "#be123c", "#0891b2", "#4f46e5"];

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || "list").toLowerCase();
  if (action === "list") {
    return output_({
      ok: true,
      students: readStudents_(),
      updatedAt: new Date().toISOString()
    }, e);
  }
  if (action === "setup" || action === "design" || action === "format") {
    const students = readStudents_();
    refreshWorkbookDesign_(students);
    return output_({ ok: true, action: action, count: students.length }, e);
  }
  return output_({ ok: false, error: "Unknown action" }, e);
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const action = String(body.action || "").toLowerCase();
    if (action === "backup") {
      const rows = Array.isArray(body.students) ? body.students : [];
      replaceStudents_(rows.map(normalizeIncomingStudent_));
      return output_({ ok: true, action: action, count: rows.length }, e);
    }
    if (action === "upsert") {
      const student = normalizeIncomingStudent_(body);
      upsertStudent_(student);
      return output_({ ok: true, action: action, studentId: student.studentCode || student.id }, e);
    }
    if (action === "delete") {
      const key = String(body.studentId || (body.student && (body.student.studentCode || body.student.id)) || "").trim();
      deleteStudent_(key);
      return output_({ ok: true, action: action, studentId: key }, e);
    }
    if (action === "setup" || action === "design" || action === "format") {
      const students = readStudents_();
      refreshWorkbookDesign_(students);
      return output_({ ok: true, action: action, count: students.length }, e);
    }
    return output_({ ok: false, error: "Unknown action" }, e);
  } catch (err) {
    return output_({ ok: false, error: String((err && err.message) || err) }, e);
  }
}

function output_(payload, e) {
  const callback = e && e.parameter && e.parameter.callback;
  const json = JSON.stringify(payload);
  if (callback) {
    return ContentService
      .createTextOutput(callback + "(" + json + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function getStudentsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME, 0);
  ensureColumns_(sheet, HEADERS.length);

  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getDisplayValues()[0];
  const hasHeader = firstRow.some(function(value) { return String(value || "").trim() !== ""; });
  const isTechnicalHeader = HEADERS.every(function(key, i) { return firstRow[i] === key; });
  const isDesignedHeader = HEADER_ROW.every(function(label, i) { return firstRow[i] === label; });
  if (!hasHeader || isTechnicalHeader || !isDesignedHeader) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADER_ROW]);
  }

  formatStudentsSheet_(sheet);
  return sheet;
}

function readStudents_() {
  const sheet = getStudentsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return values
    .filter(function(row) {
      return row.some(function(cell) { return String(cell || "").trim() !== ""; });
    })
    .map(function(row) {
      const student = {};
      HEADERS.forEach(function(key, i) {
        student[key] = row[i] instanceof Date
          ? Utilities.formatDate(row[i], Session.getScriptTimeZone(), "yyyy-MM-dd")
          : row[i];
      });
      return student;
    });
}

function replaceStudents_(students) {
  writeStudents_(students);
}

function upsertStudent_(student) {
  const key = String(student.studentCode || student.id || "").trim();
  const students = readStudents_();
  let updated = false;
  for (let i = 0; i < students.length; i++) {
    if (studentMatchesKey_(students[i], key)) {
      const merged = Object.assign({}, students[i], student);
      if (!student.createdAt && students[i].createdAt) merged.createdAt = students[i].createdAt;
      students[i] = merged;
      updated = true;
      break;
    }
  }
  if (!updated) students.push(student);
  writeStudents_(students);
}

function deleteStudent_(key) {
  const wanted = String(key || "").trim();
  const students = readStudents_().filter(function(student) {
    return !studentMatchesKey_(student, wanted);
  });
  writeStudents_(students);
}

function writeStudents_(students) {
  const sheet = getStudentsSheet_();
  const sorted = sortStudents_(students.map(normalizeIncomingStudent_));
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).clearContent();
  }
  if (sorted.length) {
    sheet.getRange(2, 1, sorted.length, HEADERS.length).setValues(sorted.map(studentToRow_));
  }
  formatStudentsSheet_(sheet);
  refreshWorkbookDesign_(sorted);
}

function normalizeIncomingStudent_(item) {
  item = item || {};
  const student = item.student && typeof item.student === "object" ? item.student : item;
  const now = new Date().toISOString();
  const normalized = {};
  HEADERS.forEach(function(key) { normalized[key] = cell_(student[key]); });
  normalized.id = cell_(student.recordId || student.id || student.studentCode || item.studentId);
  normalized.studentCode = cell_(student.studentCode || item.studentId || student.studentId);
  normalized.createdAt = student.createdAt || now;
  normalized.updatedAt = now;
  return normalized;
}

function studentToRow_(student) {
  return HEADERS.map(function(key) { return cell_(student[key]); });
}

function viewRow_(student) {
  return VIEW_FIELDS.map(function(key) { return cell_(student[key]); });
}

function cell_(value) {
  return value === null || value === undefined ? "" : value;
}

function studentMatchesKey_(student, key) {
  if (!key) return false;
  const id = String(student.id || "").trim();
  const code = String(student.studentCode || student.studentId || "").trim();
  return id === key || code === key;
}

function sortStudents_(students) {
  return students.slice().sort(function(a, b) {
    return className_(a).localeCompare(className_(b), "km-KH")
      || String(a.studentName || "").localeCompare(String(b.studentName || ""), "km-KH")
      || String(a.studentCode || "").localeCompare(String(b.studentCode || ""), "km-KH");
  });
}

function className_(student) {
  return String((student && student.className) || "មិនទាន់មានថ្នាក់").trim() || "មិនទាន់មានថ្នាក់";
}

function groupStudentsByClass_(students) {
  const groups = {};
  sortStudents_(students).forEach(function(student) {
    const cls = className_(student);
    if (!groups[cls]) groups[cls] = [];
    groups[cls].push(student);
  });
  return Object.keys(groups).sort(function(a, b) {
    return a.localeCompare(b, "km-KH");
  }).map(function(cls) {
    return [cls, groups[cls]];
  });
}

function refreshWorkbookDesign_(students) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sorted = sortStudents_(students || []);
  rebuildDashboard_(ss, sorted);
  rebuildByClassSheet_(ss, sorted);
  rebuildClassSheets_(ss, sorted);
}

function rebuildDashboard_(ss, students) {
  const sheet = getOrCreateSheet_(ss, DASHBOARD_SHEET_NAME);
  resetSheet_(sheet);
  sheet.setTabColor("#0f766e");
  sheet.setHiddenGridlines(true);

  const groups = groupStudentsByClass_(students);
  const male = students.filter(function(s) { return s.gender === "ប្រុស"; }).length;
  const female = students.filter(function(s) { return s.gender === "ស្រី"; }).length;
  const schools = countUnique_(students, "fromSchool");
  const updatedText = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");

  sheet.getRange(1, 1, 1, 8).merge()
    .setValue("ផ្ទាំងសង្ខេបសិស្ស")
    .setBackground("#0f766e")
    .setFontColor("#ffffff")
    .setFontSize(18)
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
  sheet.getRange(2, 1, 1, 8).merge()
    .setValue("ធ្វើបច្ចុប្បន្នភាព: " + updatedText)
    .setBackground("#ccfbf1")
    .setFontColor("#115e59")
    .setHorizontalAlignment("center");

  sheet.getRange(4, 1, 1, 8).setValues([[
    "សរុប", students.length,
    "ប្រុស", male,
    "ស្រី", female,
    "ថ្នាក់", groups.length
  ]]);
  sheet.getRange(4, 1, 1, 8)
    .setBackground("#f8fafc")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRangeList(["B4", "D4", "F4", "H4"]).setFontSize(18).setFontColor("#0f766e");

  sheet.getRange(6, 1, 1, 8).setValues([[
    "ថ្នាក់", "សរុប", "ប្រុស", "ស្រី", "សាលា", "មានទូរស័ព្ទ", "មានរូបថត", "សម្គាល់"
  ]]);
  styleHeader_(sheet.getRange(6, 1, 1, 8));

  const rows = groups.map(function(group) {
    const cls = group[0];
    const items = group[1];
    return [
      cls,
      items.length,
      items.filter(function(s) { return s.gender === "ប្រុស"; }).length,
      items.filter(function(s) { return s.gender === "ស្រី"; }).length,
      countUnique_(items, "fromSchool"),
      items.filter(function(s) { return String(s.contact || "").trim() !== ""; }).length,
      items.filter(function(s) { return String(s.photo || "").trim() !== ""; }).length,
      ""
    ];
  });
  if (rows.length) {
    sheet.getRange(7, 1, rows.length, 8).setValues(rows);
    styleBody_(sheet.getRange(7, 1, rows.length, 8));
  } else {
    sheet.getRange(7, 1, 1, 8).merge().setValue("មិនទាន់មានទិន្នន័យ").setHorizontalAlignment("center");
  }

  sheet.setFrozenRows(6);
  sheet.setColumnWidths(1, 8, 115);
  sheet.setRowHeights(1, Math.max(sheet.getLastRow(), 7), 32);
  sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 7), 8).setFontFamily("Arial").setVerticalAlignment("middle");
}

function rebuildByClassSheet_(ss, students) {
  const sheet = getOrCreateSheet_(ss, BY_CLASS_SHEET_NAME);
  resetSheet_(sheet);
  sheet.setTabColor("#2563eb");
  sheet.setHiddenGridlines(true);

  const colCount = VIEW_FIELDS.length;
  const groups = groupStudentsByClass_(students);
  sheet.getRange(1, 1, 1, colCount).merge()
    .setValue("បញ្ជីសិស្សតាមថ្នាក់")
    .setBackground("#2563eb")
    .setFontColor("#ffffff")
    .setFontSize(16)
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  let row = 3;
  if (!groups.length) {
    sheet.getRange(row, 1, 1, colCount).merge().setValue("មិនទាន់មានទិន្នន័យ").setHorizontalAlignment("center");
  }
  groups.forEach(function(group) {
    const cls = group[0];
    const items = group[1];
    sheet.getRange(row, 1, 1, colCount).merge()
      .setValue("ថ្នាក់ " + cls + " - " + items.length + " នាក់")
      .setBackground("#ccfbf1")
      .setFontColor("#115e59")
      .setFontWeight("bold")
      .setFontSize(12);
    row++;
    sheet.getRange(row, 1, 1, colCount).setValues([VIEW_HEADER_ROW]);
    styleHeader_(sheet.getRange(row, 1, 1, colCount));
    row++;
    if (items.length) {
      sheet.getRange(row, 1, items.length, colCount).setValues(items.map(viewRow_));
      styleBody_(sheet.getRange(row, 1, items.length, colCount));
      row += items.length;
    }
    row++;
  });

  formatViewSheet_(sheet, colCount, 1);
}

function rebuildClassSheets_(ss, students) {
  ss.getSheets().forEach(function(sheet) {
    if (sheet.getName().indexOf(CLASS_SHEET_PREFIX) === 0) ss.deleteSheet(sheet);
  });

  const groups = groupStudentsByClass_(students);
  const usedNames = {};
  groups.forEach(function(group, index) {
    const cls = group[0];
    const items = group[1];
    const sheetName = uniqueSheetName_(ss, CLASS_SHEET_PREFIX + sanitizeSheetName_(cls), usedNames);
    const sheet = ss.insertSheet(sheetName);
    resetSheet_(sheet);
    sheet.setTabColor(CLASS_TAB_COLORS[index % CLASS_TAB_COLORS.length]);
    sheet.setHiddenGridlines(true);

    const colCount = VIEW_FIELDS.length;
    sheet.getRange(1, 1, 1, colCount).merge()
      .setValue("ថ្នាក់ " + cls)
      .setBackground(CLASS_TAB_COLORS[index % CLASS_TAB_COLORS.length])
      .setFontColor("#ffffff")
      .setFontSize(16)
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
    sheet.getRange(2, 1, 1, colCount).merge()
      .setValue("សរុប " + items.length + " នាក់")
      .setBackground("#f8fafc")
      .setFontColor("#475569")
      .setHorizontalAlignment("center");
    sheet.getRange(4, 1, 1, colCount).setValues([VIEW_HEADER_ROW]);
    styleHeader_(sheet.getRange(4, 1, 1, colCount));
    if (items.length) {
      sheet.getRange(5, 1, items.length, colCount).setValues(items.map(viewRow_));
      styleBody_(sheet.getRange(5, 1, items.length, colCount));
    }
    sheet.setFrozenRows(4);
    formatViewSheet_(sheet, colCount, 4);
  });
}

function formatStudentsSheet_(sheet) {
  ensureColumns_(sheet, HEADERS.length);
  const lastRow = Math.max(sheet.getLastRow(), 1);
  sheet.setTabColor("#0f766e");
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);
  sheet.setHiddenGridlines(true);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADER_ROW]);
  styleHeader_(sheet.getRange(1, 1, 1, HEADERS.length));
  sheet.setRowHeight(1, 42);
  STUDENT_COLUMN_WIDTHS.forEach(function(width, index) {
    sheet.setColumnWidth(index + 1, width);
  });
  if (lastRow > 1) {
    const body = sheet.getRange(2, 1, lastRow - 1, HEADERS.length);
    styleBody_(body);
    sheet.getRange(2, 2, lastRow - 1, 1).setNumberFormat("@");
    sheet.getRange(2, 5, lastRow - 1, 1).setNumberFormat("yyyy-mm-dd");
    sheet.getRange(2, 12, lastRow - 1, 1).setNumberFormat("@");
  }
  applyBanding_(sheet, 1, 1, Math.max(lastRow, 2), HEADERS.length);
  recreateFilter_(sheet, 1, 1, Math.max(lastRow, 2), HEADERS.length);
  sheet.showColumns(1, HEADERS.length);
  sheet.hideColumns(1);
  sheet.hideColumns(20, 2);
}

function formatViewSheet_(sheet, colCount, frozenRows) {
  ensureColumns_(sheet, colCount);
  const lastRow = Math.max(sheet.getLastRow(), 1);
  VIEW_COLUMN_WIDTHS.forEach(function(width, index) {
    if (index < colCount) sheet.setColumnWidth(index + 1, width);
  });
  sheet.setFrozenRows(frozenRows || 1);
  sheet.getRange(1, 1, lastRow, colCount).setFontFamily("Arial").setVerticalAlignment("middle").setWrap(true);
  if (lastRow > 1) {
    const dobCol = VIEW_FIELDS.indexOf("dob") + 1;
    const phoneCol = VIEW_FIELDS.indexOf("contact") + 1;
    if (dobCol > 0) sheet.getRange(1, dobCol, lastRow, 1).setNumberFormat("yyyy-mm-dd");
    if (phoneCol > 0) sheet.getRange(1, phoneCol, lastRow, 1).setNumberFormat("@");
  }
  sheet.setRowHeights(1, lastRow, 30);
}

function styleHeader_(range) {
  range
    .setBackground("#0f766e")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true)
    .setBorder(true, true, true, true, true, true, "#0f766e", SpreadsheetApp.BorderStyle.SOLID);
}

function styleBody_(range) {
  range
    .setBackground("#ffffff")
    .setFontColor("#0f172a")
    .setVerticalAlignment("middle")
    .setWrap(true)
    .setBorder(true, true, true, true, true, true, "#dbe7e4", SpreadsheetApp.BorderStyle.SOLID);
}

function applyBanding_(sheet, row, col, numRows, numCols) {
  sheet.getBandings().forEach(function(banding) { banding.remove(); });
  if (numRows < 2) return;
  const banding = sheet.getRange(row, col, numRows, numCols).applyRowBanding();
  banding.setHeaderRowColor("#0f766e");
  banding.setFirstRowColor("#ffffff");
  banding.setSecondRowColor("#f0fdfa");
}

function recreateFilter_(sheet, row, col, numRows, numCols) {
  const filter = sheet.getFilter();
  if (filter) filter.remove();
  sheet.getRange(row, col, numRows, numCols).createFilter();
}

function resetSheet_(sheet) {
  ensureColumns_(sheet, Math.max(HEADERS.length, VIEW_FIELDS.length, 8));
  const range = sheet.getDataRange();
  range.breakApart();
  sheet.clear();
  sheet.clearConditionalFormatRules();
  sheet.getBandings().forEach(function(banding) { banding.remove(); });
  const filter = sheet.getFilter();
  if (filter) filter.remove();
  sheet.showColumns(1, sheet.getMaxColumns());
}

function getOrCreateSheet_(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function ensureColumns_(sheet, needed) {
  const current = sheet.getMaxColumns();
  if (current < needed) sheet.insertColumnsAfter(current, needed - current);
}

function countUnique_(students, key) {
  const seen = {};
  students.forEach(function(student) {
    const value = String(student[key] || "").trim();
    if (value) seen[value] = true;
  });
  return Object.keys(seen).length;
}

function sanitizeSheetName_(name) {
  const cleaned = String(name || "មិនទាន់មានថ្នាក់")
    .replace(/[\\\/\?\*\[\]\:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || "មិនទាន់មានថ្នាក់").slice(0, 88);
}

function uniqueSheetName_(ss, baseName, usedNames) {
  let base = String(baseName || CLASS_SHEET_PREFIX + "មិនទាន់មានថ្នាក់").slice(0, 99);
  let name = base;
  let n = 2;
  while (ss.getSheetByName(name) || usedNames[name]) {
    const suffix = " " + n;
    name = base.slice(0, 100 - suffix.length) + suffix;
    n++;
  }
  usedNames[name] = true;
  return name;
}
