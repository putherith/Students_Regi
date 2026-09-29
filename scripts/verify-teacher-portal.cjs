const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');

class FakeSheet {
  constructor(rows) { this.rows = rows.map(row => [...row]); }
  getLastRow() { return this.rows.length; }
  getMaxRows() { return Math.max(this.rows.length, 100); }
  insertRowsAfter() {}
  getRange(row, col, height = 1, width = 1) {
    const read = () => Array.from({length: height}, (_, y) => Array.from({length: width}, (_, x) => this.rows[row - 1 + y]?.[col - 1 + x] ?? ''));
    return {
      getValues: read,
      getDisplayValues: () => read().map(line => line.map(String)),
      setValues: values => { values.forEach((line, y) => { const at = row - 1 + y; this.rows[at] ||= []; line.forEach((value, x) => { this.rows[at][col - 1 + x] = value; }); }); return this; },
      setBackground() { return this; }, setFontColor() { return this; }, setFontWeight() { return this; }
    };
  }
  setFrozenRows() {}
  hideSheet() {}
}

const cache = new Map();
const properties = new Map();
const sheets = {};
let uuid = 0;
const context = vm.createContext({
  console, Date, Set, Map,
  SpreadsheetApp: { getActiveSpreadsheet: () => ({
    getSheetByName: name => sheets[name] || null,
    insertSheet: name => (sheets[name] = new FakeSheet([]))
  }) },
  Utilities: {
    getUuid: () => `${(++uuid).toString(16).padStart(8, '0')}-1234-4234-9234-abcdefabcdef`,
    computeDigest: (_algorithm, input) => [...crypto.createHash('sha256').update(input).digest()].map(x => x > 127 ? x - 256 : x),
    DigestAlgorithm: {SHA_256: 'SHA_256'}, Charset: {UTF_8: 'UTF_8'}
  },
  CacheService: {getScriptCache: () => ({get: key => cache.get(key) || null, put: (key, value) => cache.set(key, value), remove: key => cache.delete(key)})},
  LockService: {getScriptLock: () => ({waitLock() {}, releaseLock() {}})},
  PropertiesService: {getScriptProperties: () => ({getProperty: key => properties.get(key) || '', setProperty: (key, value) => properties.set(key, value)})}
});
vm.runInContext(fs.readFileSync('google-sheet-backend.gs', 'utf8'), context);
vm.runInContext(fs.readFileSync('teacher-portal.gs', 'utf8'), context);
vm.runInContext('getStudentsSheet_ = () => SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Students")', context);

const headers = vm.runInContext('HEADERS', context);
const student = (id, cls, code, name) => headers.map(key => ({id, className: cls, studentCode: code, studentName: name, studentSurname: name.split(' ')[0], studentGivenName: name.split(' ')[1], photo: `data:image/jpeg;base64,${id}`, updatedAt: '2026-09-29T00:00:00.000Z'})[key] || '');
sheets.Students = new FakeSheet([headers, student('id-a', '7A', '9022607001', 'សុខ ដារ៉ា'), student('id-b', '8A', '9022508001', 'សុខ មករា')]);
const hash = (salt, pin) => crypto.createHash('sha256').update(`${salt}:${pin}`).digest('hex');
sheets['_Portal Access'] = new FakeSheet([
  ['scope', 'className', 'salt', 'pinHash', 'teacherName', 'enabled', 'updatedAt'],
  ['admin', '', 'admin-salt', hash('admin-salt', 'admin-secret'), 'រដ្ឋបាល', true, 'now'],
  ['class', '7A', 'salt-a', hash('salt-a', '123456789012'), 'គ្រូ 7A', true, 'now'],
  ['class', '8A', 'salt-b', hash('salt-b', '987654321098'), 'គ្រូ 8A', true, 'now']
]);
const call = (name, ...args) => context[name](...args);
const teacher = call('teacherPortalLogin', '7A', '123456789012');
assert.equal(teacher.role, 'class');
assert.equal(call('teacherPortalRoster', teacher.token, '7A').students.length, 1);
assert.throws(() => call('teacherPortalRoster', teacher.token, '8A'), /សិទ្ធិ/);
assert.throws(() => call('teacherPortalSaveAttendance', teacher.token, '7A', '2026-09-29', 'ព្រឹក', [{studentId:'id-b',status:'អវត្តមាន'}]), /សិស្ស/);
assert.throws(() => call('teacherPortalSaveScores', teacher.token, '8A', 'Math', 'Monthly', '2026-09-29', 100, []), /សិទ្ធិ/);
assert.throws(() => call('teacherPortalUpdateStudent', teacher.token, '7A', 'id-b', {contact:'1'}, '2026-09-29T00:00:00.000Z'), /សិស្ស/);
assert.throws(() => call('teacherPortalUpdateStudent', teacher.token, '7A', 'id-a', {contact:'1'}, 'stale'), /ផ្លាស់ប្តូរ/);
assert.throws(() => call('teacherPortalLogin', '7A', 'wrong'), /PIN/);
assert.throws(() => call('portalDate_', '2026-02-30'), /កាលបរិច្ឆេទ/);
call('teacherPortalSaveAttendance', teacher.token, '7A', '2026-09-29', 'ព្រឹក', [{studentId:'id-a',status:'អវត្តមាន',reason:'ឈឺ'}]);
assert.equal(call('teacherPortalAttendance', teacher.token, '7A', '2026-09-29', 'ព្រឹក')[0].reason, 'ឈឺ');
call('teacherPortalSaveScores', teacher.token, '7A', 'គណិត', 'ប្រចាំខែ', '2026-09-29', 100, [{studentId:'id-a',score:87}]);
assert.equal(call('teacherPortalScores', teacher.token, '7A', 'គណិត', 'ប្រចាំខែ', '2026-09-29')[0].score, '87');
call('teacherPortalSaveActivity', teacher.token, '7A', {date:'2026-09-29',title:'សម្អាតថ្នាក់',details:'រួមគ្នា'});
assert.equal(call('teacherPortalActivities', teacher.token, '7A')[0].title, 'សម្អាតថ្នាក់');
const beforePhoto = sheets.Students.rows[1][headers.indexOf('photo')];
call('teacherPortalUpdateStudent', teacher.token, '7A', 'id-a', {contact:'012345678'}, '2026-09-29T00:00:00.000Z');
assert.equal(sheets.Students.rows[1][headers.indexOf('photo')], beforePhoto);
assert.equal(sheets.Students.rows[1][headers.indexOf('studentCode')], '9022607001');
assert.equal(sheets.Students.rows[1][headers.indexOf('contact')], '012345678');
const admin = call('teacherPortalLogin', '__admin__', 'admin-secret');
assert.throws(() => call('assertAuthorized_', {parameter:{}}, null), /Unauthorized/);
assert.doesNotThrow(() => call('assertAuthorized_', {parameter:{key:'admin-secret'}}, null));
assert.equal(call('teacherPortalAdminOverview', admin.token).length, 2);
assert.throws(() => call('teacherPortalAdminOverview', teacher.token), /រដ្ឋបាល/);
assert.throws(() => call('teacherPortalIssueClassPin', teacher.token, '8A', 'x'), /រដ្ឋបាល/);
const rotated = call('teacherPortalIssueClassPin', admin.token, '7A', 'គ្រូថ្មី');
assert.equal(rotated.pin.length, 12);
assert.throws(() => call('teacherPortalRoster', teacher.token, '7A'), /សិទ្ធិ/);
assert.equal(call('teacherPortalLogin', '7A', rotated.pin).teacherName, 'គ្រូថ្មី');
const accessBackup = sheets['_Portal Access'];
delete sheets['_Portal Access'];
assert.throws(() => call('assertAuthorized_', {parameter:{key:'admin-secret'}}, null), /credential is unavailable/);
sheets['_Portal Access'] = accessBackup;
const html = fs.readFileSync('teacher-portal.html', 'utf8');
vm.compileFunction(html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>')));
const appHtml = fs.readFileSync('index.html', 'utf8');
const inlineScripts = [...appHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).filter(source => source.trim());
inlineScripts.forEach((source, index) => new vm.Script(source, {filename:`index-inline-${index}.js`}));
console.log('Teacher portal access, conflict, photo preservation and PIN tests passed');
