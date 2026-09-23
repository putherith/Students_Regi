const SHEET_NAME = "Students";
const DASHBOARD_SHEET_NAME = "Dashboard";
const BY_CLASS_SHEET_NAME = "By Class";
const CLASS_SHEET_PREFIX = "Class - ";
const SETTINGS_SHEET_NAME = "_App Settings";
const ACCESS_KEY_PROPERTY = "STUDENT_APP_ACCESS_KEY";
const DATA_REVISION_PROPERTY = "STUDENT_DATA_REVISION";
const SETTINGS_REVISION_PROPERTY = "STUDENT_SETTINGS_REVISION";
const WRITE_LOCK_TIMEOUT_MS = 30000;

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
  "updatedAt",
  "studentSurname",
  "studentGivenName",
  "fatherOccupation",
  "motherOccupation",
  "guardianName",
  "applicationNumber",
  "fatherPhone",
  "motherPhone",
  "fatherDob",
  "motherDob",
  "guardianDob"
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
  fatherDob: "ថ្ងៃខែឆ្នាំកំណើតឪពុក",
  motherName: "ឈ្មោះម្តាយ",
  motherDob: "ថ្ងៃខែឆ្នាំកំណើតម្តាយ",
  currentVillage: "ភូមិបច្ចុប្បន្ន",
  currentCommune: "ឃុំ/សង្កាត់បច្ចុប្បន្ន",
  currentDistrict: "ស្រុក/ខណ្ឌបច្ចុប្បន្ន",
  currentProvince: "ខេត្ត/ក្រុងបច្ចុប្បន្ន",
  photo: "រូបថត",
  createdAt: "បង្កើតនៅ",
  updatedAt: "កែចុងក្រោយ",
  studentSurname: "គោត្តនាម",
  studentGivenName: "នាមខ្លួន",
  fatherOccupation: "មុខរបរឪពុក",
  motherOccupation: "មុខរបរម្តាយ",
  guardianName: "ឈ្មោះអាណាព្យាបាល",
  guardianDob: "ថ្ងៃខែឆ្នាំកំណើតអាណាព្យាបាល",
  applicationNumber: "លេខពាក្យ",
  fatherPhone: "លេខទូរសព្ទឪពុក",
  motherPhone: "លេខទូរសព្ទម្តាយ"
};

const VIEW_FIELDS = [
  "studentCode",
  "studentSurname",
  "studentGivenName",
  "gender",
  "dob",
  "className",
  "fromSchool",
  "contact",
  "fatherName",
  "fatherDob",
  "fatherOccupation",
  "motherName",
  "motherDob",
  "motherOccupation",
  "guardianName",
  "guardianDob",
  "pobVillage",
  "pobCommune",
  "pobDistrict",
  "pobProvince",
  "currentVillage",
  "currentCommune",
  "currentDistrict",
  "currentProvince",
  "photo",
  "fatherPhone",
  "motherPhone",
  "applicationNumber"
];

const HEADER_ROW = HEADERS.map(function(key) { return HEADER_LABELS[key] || key; });
const VIEW_HEADER_ROW = VIEW_FIELDS.map(function(key) { return HEADER_LABELS[key] || key; });

const STUDENT_COLUMN_WIDTHS = [90, 95, 170, 60, 105, 80, 165, 115, 135, 135, 135, 120, 130, 130, 125, 150, 150, 150, 100, 145, 145, 120, 120, 125, 125, 145, 105, 125, 125, 135, 135, 150];
const VIEW_COLUMN_WIDTHS = [95, 120, 120, 60, 105, 80, 165, 120, 130, 135, 125, 130, 135, 125, 145, 150, 115, 135, 135, 135, 125, 150, 150, 150, 100, 125, 125, 105];
const CLASS_TAB_COLORS = ["#0f766e", "#2563eb", "#7c3aed", "#15803d", "#b45309", "#be123c", "#0891b2", "#4f46e5"];

function doGet(e) {
  try {
    assertAuthorized_(e, null);
    const action = String((e && e.parameter && e.parameter.action) || "list").toLowerCase();
    if (action === "status") {
      return output_({
        ok: true,
        revision: getRevision_(DATA_REVISION_PROPERTY),
        settingsRevision: getRevision_(SETTINGS_REVISION_PROPERTY)
      }, e);
    }
    if (action === "photostatus") {
      const sheet = getStudentsSheet_();
      const total = Math.max(0, sheet.getLastRow() - 1);
      const photos = total ? sheet.getRange(2, HEADERS.indexOf("photo") + 1, total, 1).getValues() : [];
      const codes = total ? sheet.getRange(2, HEADERS.indexOf("studentCode") + 1, total, 1).getDisplayValues() : [];
      const missingCodes = photos.map(function(row, index) {
        return !String(row[0] || "").trim() ? String(codes[index][0] || "").trim() : "";
      }).filter(Boolean);
      return output_({
        ok: true,
        total: total,
        missing: photos.filter(function(row) { return !String(row[0] || "").trim(); }).length,
        missingCodes: missingCodes,
        revision: getRevision_(DATA_REVISION_PROPERTY)
      }, e);
    }
    if (action === "studentstatus") {
      const key = String((e && e.parameter && e.parameter.studentId) || "").trim();
      const sheet = getStudentsSheet_();
      const lastRow = sheet.getLastRow();
      let rowNumber = 0;
      if (key && lastRow >= 2) {
        const ids = sheet.getRange(2, 1, lastRow - 1, 2).getDisplayValues();
        const index = ids.findIndex(function(row) { return row[0] === key || row[1] === key; });
        if (index >= 0) rowNumber = index + 2;
      }
      const photo = rowNumber ? String(sheet.getRange(rowNumber, HEADERS.indexOf("photo") + 1).getValue() || "") : "";
      return output_({ ok: true, found: !!rowNumber, hasPhoto: !!photo.trim(), photoLength: photo.length }, e);
    }
    if (action === "list") {
      return output_({
        ok: true,
        students: readStudents_(),
        settings: readAppSettings_(),
        revision: getRevision_(DATA_REVISION_PROPERTY),
        settingsRevision: getRevision_(SETTINGS_REVISION_PROPERTY)
      }, e);
    }
    if (action === "setup" || action === "design" || action === "format") {
      const count = withWriteLock_(function() {
        const students = readStudents_();
        refreshWorkbookDesign_(students);
        return students.length;
      });
      return output_({ ok: true, action: action, count: count }, e);
    }
    return output_({ ok: false, error: "Unknown action" }, e);
  } catch (err) {
    return output_({ ok: false, error: String((err && err.message) || err) }, e);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    assertAuthorized_(e, body);
    const action = String(body.action || "").toLowerCase();
    if (action === "backup") {
      const rows = Array.isArray(body.students) ? body.students : [];
      const count = withWriteLock_(function() {
        const mergedCount = mergeStudents_(rows.map(normalizeIncomingStudent_));
        touchRevision_(DATA_REVISION_PROPERTY);
        return mergedCount;
      });
      return output_({ ok: true, action: action, mode: "merge", count: count }, e);
    }
    if (action === "replace") {
      const rows = Array.isArray(body.students) ? body.students : [];
      withWriteLock_(function() {
        replaceStudents_(rows.map(normalizeIncomingStudent_));
        touchRevision_(DATA_REVISION_PROPERTY);
      });
      return output_({ ok: true, action: action, mode: "replace", count: rows.length }, e);
    }
    if (action === "upsert") {
      const student = normalizeIncomingStudent_(body);
      withWriteLock_(function() {
        upsertStudent_(student);
        touchRevision_(DATA_REVISION_PROPERTY);
      });
      return output_({ ok: true, action: action, studentId: student.studentCode || student.id }, e);
    }
    if (action === "upsertmany") {
      const rows = Array.isArray(body.students) ? body.students : [];
      const count = withWriteLock_(function() {
        const mergedCount = mergeStudents_(rows.map(normalizeIncomingStudent_));
        touchRevision_(DATA_REVISION_PROPERTY);
        return mergedCount;
      });
      return output_({ ok: true, action: action, mode: "merge", count: count }, e);
    }
    if (action === "recoverphotos") {
      const candidates = Array.isArray(body.students) ? body.students : [];
      const result = withWriteLock_(function() {
        const restored = restoreMissingPhotos_(candidates);
        if (restored) touchRevision_(DATA_REVISION_PROPERTY);
        return restored;
      });
      return output_({ ok: true, action: action, restored: result }, e);
    }
    if (action === "delete") {
      const key = String(body.studentId || (body.student && (body.student.studentCode || body.student.id)) || "").trim();
      withWriteLock_(function() {
        deleteStudent_(key);
        touchRevision_(DATA_REVISION_PROPERTY);
      });
      return output_({ ok: true, action: action, studentId: key }, e);
    }
    if (action === "settings") {
      const settings = body.settings && typeof body.settings === "object" ? body.settings : {};
      withWriteLock_(function() {
        writeAppSettings_(settings);
        touchRevision_(SETTINGS_REVISION_PROPERTY);
      });
      return output_({ ok: true, action: action }, e);
    }
    if (action === "setup" || action === "design" || action === "format") {
      const count = withWriteLock_(function() {
        const students = readStudents_();
        refreshWorkbookDesign_(students);
        return students.length;
      });
      return output_({ ok: true, action: action, count: count }, e);
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

function assertAuthorized_(e, body) {
  const expected = String(PropertiesService.getScriptProperties().getProperty(ACCESS_KEY_PROPERTY) || "").trim();
  if (!expected) return;
  const queryKey = e && e.parameter ? e.parameter.key : "";
  const supplied = String((body && body.accessKey) || queryKey || "").trim();
  if (supplied !== expected) throw new Error("Unauthorized: access key is missing or incorrect");
}

function withWriteLock_(work) {
  const lock = LockService.getScriptLock();
  lock.waitLock(WRITE_LOCK_TIMEOUT_MS);
  try {
    return work();
  } finally {
    lock.releaseLock();
  }
}

function getRevision_(propertyName) {
  return String(PropertiesService.getScriptProperties().getProperty(propertyName) || "0");
}

function touchRevision_(propertyName) {
  const revision = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty(propertyName, revision);
  return revision;
}

function getSettingsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  const created = !sheet;
  if (created) sheet = ss.insertSheet(SETTINGS_SHEET_NAME);
  const header = sheet.getRange(1, 1, 1, 2).getDisplayValues()[0];
  if (created || header[0] !== "key" || header[1] !== "value") {
    sheet.getRange(1, 1, 1, 2).setValues([["key", "value"]]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#d9f3ef");
    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(2, 420);
    try { sheet.hideSheet(); } catch (err) {}
  }
  return sheet;
}

function readAppSettings_() {
  const sheet = getSettingsSheet_();
  const settings = { issueDate: "", principalName: "", studentCodePrefix: "STU", studentCodeDigits: 4, classTeachers: {} };
  if (sheet.getLastRow() < 2) return settings;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues();
  values.forEach(function(row) {
    const key = String(row[0] || "").trim();
    if (["issueDate", "cardLunarDate", "principalName", "principalPhone", "ictPhone", "studentCodePrefix"].indexOf(key) !== -1) settings[key] = String(row[1] || "").trim();
    if (key === "studentCodeDigits") settings.studentCodeDigits = Number(row[1]) || 4;
    if (key === "classTeachers") {
      try {
        const parsed = JSON.parse(row[1] || "{}");
        settings.classTeachers = parsed && typeof parsed === "object" ? parsed : {};
      } catch (err) {
        settings.classTeachers = {};
      }
    }
  });
  return settings;
}

function writeAppSettings_(settings) {
  const sheet = getSettingsSheet_();
  const safeTeachers = settings.classTeachers && typeof settings.classTeachers === "object" ? settings.classTeachers : {};
  const rows = [
    ["issueDate", String(settings.issueDate || "").trim()],
    ["principalName", String(settings.principalName || "").trim()],
    ["principalPhone", String(settings.principalPhone || "").trim()],
    ["cardLunarDate", String(settings.cardLunarDate || "").trim()],
    ["ictPhone", String(settings.ictPhone || "").trim()],
    ["studentCodePrefix", String(settings.studentCodePrefix || "STU").trim()],
    ["studentCodeDigits", Math.min(8, Math.max(2, Number(settings.studentCodeDigits) || 4))],
    ["classTeachers", JSON.stringify(safeTeachers)]
  ];
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).clearContent();
  sheet.getRange(2, 1, rows.length, 2).setValues(rows);
}

function getStudentsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  const created = !sheet;
  if (created) sheet = ss.insertSheet(SHEET_NAME, 0);
  ensureColumns_(sheet, HEADERS.length);

  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getDisplayValues()[0];
  const hasHeader = firstRow.some(function(value) { return String(value || "").trim() !== ""; });
  const isTechnicalHeader = HEADERS.every(function(key, i) { return firstRow[i] === key; });
  const isDesignedHeader = HEADER_ROW.every(function(label, i) { return firstRow[i] === label; });
  if (!hasHeader || isTechnicalHeader || !isDesignedHeader) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADER_ROW]);
    formatStudentsSheet_(sheet);
  }
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
    .map(rowToStudent_);
}

function rowToStudent_(row) {
  const student = {};
  HEADERS.forEach(function(key, i) {
    student[key] = row[i] instanceof Date
      ? Utilities.formatDate(row[i], Session.getScriptTimeZone(), "yyyy-MM-dd")
      : row[i];
  });
  if (!student.studentName) {
    student.studentName = [student.studentSurname, student.studentGivenName].filter(Boolean).join(" ");
  }
  if (!student.studentSurname && !student.studentGivenName && student.studentName) {
    const parts = String(student.studentName).trim().split(/\s+/).filter(Boolean);
    student.studentSurname = parts.shift() || "";
    student.studentGivenName = parts.join(" ");
  }
  return student;
}

function replaceStudents_(students) {
  // A nonempty replacement is an import, not a request to erase existing photos.
  if (!students.length) return writeStudents_([]);
  const oldByKey = {};
  readStudents_().forEach(function(student) {
    [student.id, student.studentCode].filter(Boolean).forEach(function(key) { oldByKey[String(key).trim()] = student; });
  });
  writeStudents_(students.map(function(student) {
    const previous = oldByKey[String(student.id || "").trim()] || oldByKey[String(student.studentCode || "").trim()];
    return previous ? mergeStudentRecord_(previous, student) : student;
  }));
}

function mergeStudents_(incomingStudents) {
  const students = readStudents_();
  incomingStudents.forEach(function(incoming) {
    const student = normalizeIncomingStudent_(incoming);
    const key = String(student.id || student.studentCode || "").trim();
    const keyIndex = students.findIndex(function(existing) {
      return studentMatchesKey_(existing, key);
    });
    if (keyIndex >= 0) {
      const createdAt = students[keyIndex].createdAt;
      students[keyIndex] = mergeStudentRecord_(students[keyIndex], student);
      if (createdAt) students[keyIndex].createdAt = createdAt;
      return;
    }
    // A different record with the same normalized Khmer name is a duplicate.
    if (students.some(function(existing) { return sameStudentName_(existing, student); })) return;
    students.push(student);
  });
  writeStudents_(students);
  return incomingStudents.length;
}

function upsertStudent_(student) {
  const key = String(student.id || student.studentCode || "").trim();
  const sheet = getStudentsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const range = sheet.getRange(2, 1, lastRow - 1, HEADERS.length);
    const rows = range.getValues();
    for (let i = 0; i < rows.length; i++) {
      const existing = rowToStudent_(rows[i]);
      if (studentMatchesKey_(existing, key)) {
        const merged = mergeStudentRecord_(existing, student);
        merged.createdAt = existing.createdAt || student.createdAt;
        sheet.getRange(i + 2, 1, 1, HEADERS.length).setValues([studentToRow_(merged)]);
        return;
      }
    }
    for (let i = 0; i < rows.length; i++) {
      if (sameStudentName_(rowToStudent_(rows[i]), student)) return;
    }
  }
  sheet.getRange(Math.max(2, lastRow + 1), 1, 1, HEADERS.length).setValues([studentToRow_(student)]);
}

function mergeStudentRecord_(existing, incoming) {
  const merged = Object.assign({}, existing || {}, incoming || {});
  // Never let a text-only edit or an offline retry with no cached image clear a photo
  // that already exists in the shared Sheet.
  ["studentName", "studentSurname", "studentGivenName", "photo"].forEach(function(field) {
    if (!String((incoming && incoming[field]) || "").trim() && String((existing && existing[field]) || "").trim()) {
      merged[field] = existing[field];
    }
  });
  if (!String(merged.studentName || "").trim()) {
    merged.studentName = [merged.studentSurname, merged.studentGivenName].filter(Boolean).join(" ");
  }
  return merged;
}

function restoreMissingPhotos_(incomingStudents) {
  const sheet = getStudentsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const missing = rows.map(function(row, index) {
    return { student: rowToStudent_(row), rowNumber: index + 2 };
  }).filter(function(item) {
    return !String(item.student.photo || "").trim() && String(item.student.studentCode || "").trim();
  });
  if (!missing.length) return 0;

  const candidates = {};
  function addCandidate(student) {
    const code = String(student.studentCode || "").trim();
    const photo = String(student.photo || "").trim();
    if (!code || !/^(data:image\/(png|jpe?g|webp);base64,|https:\/\/)/i.test(photo)) return;
    if (!candidates[code]) candidates[code] = [];
    candidates[code].push({ name: studentNameKey_(student), photo: photo });
  }
  (incomingStudents || []).forEach(function(item) {
    addCandidate(item && item.student ? item.student : item || {});
  });

  // Class views may still contain a photo from before the Students row went blank.
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  (incomingStudents.length ? [] : ss.getSheets()).filter(function(view) {
    return view.getName() === BY_CLASS_SHEET_NAME || view.getName().indexOf(CLASS_SHEET_PREFIX) === 0;
  }).forEach(function(view) {
    if (view.getLastRow() < 2) return;
    const values = view.getRange(2, 1, view.getLastRow() - 1, VIEW_FIELDS.length).getValues();
    values.forEach(function(row) {
      const student = {};
      VIEW_FIELDS.forEach(function(field, index) { student[field] = row[index]; });
      addCandidate(student);
    });
  });

  let restored = 0;
  missing.forEach(function(item) {
    const code = String(item.student.studentCode || "").trim();
    const name = studentNameKey_(item.student);
    const matches = (candidates[code] || []).filter(function(candidate) {
      return !name || !candidate.name || candidate.name === name;
    });
    if (!matches.length) return;
    const uniquePhotos = Array.from(new Set(matches.map(function(candidate) { return candidate.photo; })));
    // Conflicting photos require human review; never guess which student photo is right.
    if (uniquePhotos.length !== 1) return;
    sheet.getRange(item.rowNumber, HEADERS.indexOf("photo") + 1).setValue(uniquePhotos[0]);
    restored++;
  });
  return restored;
}

function deleteStudent_(key) {
  const wanted = String(key || "").trim();
  if (!wanted) return;
  const sheet = getStudentsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  for (let i = rows.length - 1; i >= 0; i--) {
    if (studentMatchesKey_(rowToStudent_(rows[i]), wanted)) sheet.deleteRow(i + 2);
  }
}

function writeStudents_(students) {
  const sheet = getStudentsSheet_();
  const sorted = sortStudents_(dedupeStudentsByName_(students.map(normalizeIncomingStudent_)));
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
  normalized.studentSurname = cell_(student.studentSurname);
  normalized.studentGivenName = cell_(student.studentGivenName);
  normalized.studentName = cell_(student.studentName || [normalized.studentSurname, normalized.studentGivenName].filter(Boolean).join(" "));
  if ((!normalized.studentSurname || !normalized.studentGivenName) && normalized.studentName) {
    const parts = String(normalized.studentName).trim().split(/\s+/).filter(Boolean);
    if (!normalized.studentSurname && normalized.studentGivenName && normalized.studentName.endsWith(normalized.studentGivenName)) {
      normalized.studentSurname = normalized.studentName.slice(0, -normalized.studentGivenName.length).trim();
    }
    if (!normalized.studentGivenName && normalized.studentSurname && normalized.studentName.indexOf(normalized.studentSurname) === 0) {
      normalized.studentGivenName = normalized.studentName.slice(normalized.studentSurname.length).trim();
    }
    if (!normalized.studentSurname) normalized.studentSurname = parts[0] || "";
    if (!normalized.studentGivenName && parts.length > 1) normalized.studentGivenName = parts.slice(1).join(" ");
  }
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

function studentNameKey_(student) {
  const name = String((student && student.studentName) || [student && student.studentSurname, student && student.studentGivenName].filter(Boolean).join(" ") || "");
  return name
    .normalize("NFC")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .toLocaleLowerCase()
    .replace(/[\s\u00A0]+/g, "");
}

function sameStudentName_(left, right) {
  const leftName = studentNameKey_(left);
  return !!leftName && leftName === studentNameKey_(right);
}

function dedupeStudentsByName_(students) {
  const names = {};
  return students.filter(function(student) {
    const key = studentNameKey_(student);
    if (!key) return true;
    if (names[key]) return false;
    names[key] = true;
    return true;
  });
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
    sheet.getRange(2, 12, lastRow - 1, 1).setNumberFormat("@");
    ["dob", "fatherDob", "motherDob", "guardianDob"].forEach(function(field) {
      const column = HEADERS.indexOf(field) + 1;
      if (column > 0) sheet.getRange(2, column, lastRow - 1, 1).setNumberFormat("yyyy-mm-dd");
    });
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
    const phoneCol = VIEW_FIELDS.indexOf("contact") + 1;
    ["dob", "fatherDob", "motherDob", "guardianDob"].forEach(function(field) {
      const column = VIEW_FIELDS.indexOf(field) + 1;
      if (column > 0) sheet.getRange(1, column, lastRow, 1).setNumberFormat("yyyy-mm-dd");
    });
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
