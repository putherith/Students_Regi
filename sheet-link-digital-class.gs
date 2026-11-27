/**
 * ភ្ជាប់ Google Sheet «ចុះឈ្មោះសិស្សV3» ជាមួយ «ថ្នាក់ឌីជីថល»
 *
 * ពេលមាននរណាកែ សន្លឹក Students (បន្ថែម កែ ឬលុបសិស្ស) កូដនេះផ្ញើតែអ្វីដែលបានកែ ទៅ app។
 * App មិនប្តូរអ្វីដោយខ្លួនឯងទេ៖ គណៈគ្រប់គ្រងទទួលបាន 🔔 ហើយពិនិត្យ «អនុម័ត» ឬ «បដិសេធ»
 * ក្នុងម៉ឺនុយ «សំណើកែប្រែ / ប្តូរថ្នាក់»។
 *
 * Linking the «ចុះឈ្មោះសិស្សV3» Sheet to Digital Class: edits to the Students tab are compared
 * with the copy seen last time (hidden tab «_DC Sync») and only the differences are sent.
 * Written in plain ES5 so it also runs on the Sheet's legacy (Rhino) script runtime, and every
 * name starts with shl / SHL_ so it can sit next to the Sheet's existing code.
 */
var SHL_API = 'https://br-morning-glade-aoy0pbd4-studentsapi.compute.c-2.ap-southeast-1.aws.neon.tech/';
// The real key lives only in the deployed Apps Script project; never commit it.
var SHL_KEY = 'SET_IN_APPS_SCRIPT_ONLY';
var SHL_SHEET = 'Students';
var SHL_STATE = '_DC Sync';
// Column order of the Students tab (same as the registration app).
var SHL_HEADERS = ['id', 'studentCode', 'studentName', 'gender', 'dob', 'className', 'fromSchool',
  'pobVillage', 'pobCommune', 'pobDistrict', 'pobProvince', 'contact', 'fatherName', 'motherName',
  'currentVillage', 'currentCommune', 'currentDistrict', 'currentProvince', 'photo', 'createdAt', 'updatedAt',
  'studentSurname', 'studentGivenName', 'fatherOccupation', 'motherOccupation', 'guardianName',
  'applicationNumber', 'fatherPhone', 'motherPhone', 'fatherDob', 'motherDob', 'guardianDob',
  'classTrack', 'studentLatinName'];
var SHL_SKIP = { photo: 1, createdAt: 1, updatedAt: 1 };

// Menu shown when the Sheet opens (installed by shlSetup as its own trigger, so an existing onOpen is untouched).
function shlMenu() {
  SpreadsheetApp.getUi().createMenu('ថ្នាក់ឌីជីថល')
    .addItem('១. ភ្ជាប់ (ចុចតែម្តង)', 'shlSetup')
    .addItem('ផ្ញើការកែឥឡូវនេះ', 'shlSendNow')
    .addItem('ផ្ទៀងផ្ទាត់ថ្នាក់សិស្សទាំងអស់ (ម្តង)', 'shlCheckClasses')
    .addToUi();
}

/** ចុចតែម្តង៖ បង្កើតការត្រួតពិនិត្យស្វ័យប្រវត្តិ ហើយចងចាំ Sheet បច្ចុប្បន្នជាចំណុចចាប់ផ្តើម។ */
function shlSetup() {
  // Only this link's own triggers are replaced; any other code in the Sheet keeps its triggers.
  var mine = { shlOnEdit: 1, shlSend: 1, shlMenu: 1 };
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) if (mine[triggers[i].getHandlerFunction()]) ScriptApp.deleteTrigger(triggers[i]);
  var ss = SpreadsheetApp.getActive();
  ScriptApp.newTrigger('shlMenu').forSpreadsheet(ss).onOpen().create();
  ScriptApp.newTrigger('shlOnEdit').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('shlOnEdit').forSpreadsheet(ss).onChange().create();
  ScriptApp.newTrigger('shlSend').timeBased().everyMinutes(10).create();
  var r = shlSend(true);
  shlToast_('✅ បានភ្ជាប់រួចហើយ · ចងចាំសិស្ស ' + r.rows + ' នាក់ជាចំណុចចាប់ផ្តើម');
  return r;
}

function shlSendNow() {
  var r = shlSend(false);
  shlToast_(r.sent ? '✅ បានផ្ញើការកែ ' + r.sent + ' ទៅ ថ្នាក់ឌីជីថល' : 'មិនមានការកែថ្មីទេ');
  return r;
}

/**
 * ម្តងម្កាល៖ ផ្ញើថ្នាក់របស់សិស្សគ្រប់គ្នា។ App បង្កើតសំណើប្តូរថ្នាក់ សម្រាប់តែសិស្សដែលថ្នាក់ក្នុង Sheet
 * ខុសពីក្នុង app (ឧ. ផ្លាស់ទៅ 12F មុនពេលភ្ជាប់)។ មិនប៉ះព័ត៌មានផ្សេងទេ។
 * One-off catch-up: sends every student's class; the app raises transfer requests only where it differs.
 */
function shlCheckClasses() {
  var rows = shlReadRows_(SpreadsheetApp.getActive().getSheetByName(SHL_SHEET).getDataRange().getDisplayValues());
  var keys = Object.keys(rows), changes = [];
  for (var i = 0; i < keys.length; i++) {
    var r = rows[keys[i]];
    if (!r.id && !r.studentCode) continue;
    changes.push({ kind: 'edit', prev: { id: r.id, studentCode: r.studentCode, className: '' }, row: { id: r.id, studentCode: r.studentCode, className: r.className } });
  }
  var transfers = 0;
  for (var j = 0; j < changes.length; j += 400) transfers += shlPost_(changes.slice(j, j + 400), 'classes').transfers || 0;
  shlToast_('✅ បានផ្ទៀងផ្ទាត់សិស្ស ' + changes.length + ' នាក់ · សំណើប្តូរថ្នាក់ ' + transfers);
  return { checked: changes.length, transfers: transfers };
}

function shlOnEdit(e) {
  if (e && e.range && e.range.getSheet().getName() !== SHL_SHEET) return;
  shlSend(false);
}

/** Compares the Students tab with the last copy and sends the differences. */
function shlSend(baselineOnly) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { sent: 0, rows: 0, busy: true }; // the 10-minute check will catch up
  try {
    var ss = SpreadsheetApp.getActive();
    var rows = shlReadRows_(ss.getSheetByName(SHL_SHEET).getDataRange().getDisplayValues());
    var state = ss.getSheetByName(SHL_STATE);
    var first = !state;
    if (!state) { state = ss.insertSheet(SHL_STATE); state.hideSheet(); }
    var before = {};
    if (!first && state.getLastRow() > 0) {
      var saved = state.getRange(1, 1, state.getLastRow(), 2).getValues();
      for (var i = 0; i < saved.length; i++) if (saved[i][0]) before[saved[i][0]] = saved[i][1];
    }
    var changes = baselineOnly || first ? [] : shlDiff_(rows, before);
    for (var j = 0; j < changes.length; j += 400) shlPost_(changes.slice(j, j + 400));
    // Remember what was sent (only after the app accepted it).
    state.clearContents();
    var keys = Object.keys(rows), out = [];
    for (var k = 0; k < keys.length; k++) out.push([keys[k], JSON.stringify(rows[keys[k]])]);
    if (out.length) state.getRange(1, 1, out.length, 2).setValues(out);
    return { sent: changes.length, rows: out.length };
  } finally { lock.releaseLock(); }
}

function shlReadRows_(values) {
  var rows = {};
  for (var i = 1; i < values.length; i++) {
    var v = values[i], row = {};
    for (var c = 0; c < SHL_HEADERS.length; c++) {
      var h = SHL_HEADERS[c];
      if (!SHL_SKIP[h]) row[h] = String(v[c] == null ? '' : v[c]).replace(/^\s+|\s+$/g, '');
    }
    if (!row.id && !row.studentName && !row.studentCode) continue; // empty line
    rows[row.id || row.studentCode || 'row' + (i + 1) + ':' + row.studentName] = row;
  }
  return rows;
}

function shlDiff_(rows, before) {
  var changes = [], keys = Object.keys(rows), k;
  for (var i = 0; i < keys.length; i++) {
    k = keys[i];
    var now = JSON.stringify(rows[k]);
    if (!(k in before)) changes.push({ kind: 'add', row: rows[k] });
    else if (before[k] !== now) changes.push({ kind: 'edit', prev: JSON.parse(before[k]), row: rows[k] });
  }
  var old = Object.keys(before);
  for (var j = 0; j < old.length; j++) if (!(old[j] in rows)) changes.push({ kind: 'remove', prev: JSON.parse(before[old[j]]) });
  return changes;
}

function shlPost_(changes, mode) {
  var nonce = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  UrlFetchApp.fetch(SHL_API, { method: 'post', contentType: 'text/plain;charset=utf-8', muteHttpExceptions: true,
    payload: JSON.stringify({ action: 'digitalclasssheetchanges', nonce: nonce, key: SHL_KEY, changes: changes, mode: mode || '' }) });
  var res = JSON.parse(UrlFetchApp.fetch(SHL_API + '?action=digitalclassclaim&nonce=' + nonce, { muteHttpExceptions: true }).getContentText());
  if (!res || res.ok !== true) throw new Error('ថ្នាក់ឌីជីថល មិនទទួល៖ ' + (res && res.error || 'unknown'));
  return res;
}

function shlToast_(msg) { try { SpreadsheetApp.getActive().toast(msg, 'ថ្នាក់ឌីជីថល', 8); } catch (e) {} }
