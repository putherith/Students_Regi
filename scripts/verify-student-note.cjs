// Offline Apps Script regression for the note field: synthetic rows only, never touches a Sheet.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'google-sheet-backend.gs'), 'utf8');
const context = vm.createContext({ console, Date, Set });
vm.runInContext(source, context);
context.readAppSettings_ = () => ({ academicYearStart:2026 });
context.photoForStoredRecord_ = (_incoming, existing) => String((existing && existing.photo) || '');
context.savePhotoToDrive_ = photo => photo || '';
const headers = Array.from(vm.runInContext('HEADERS', context));
assert.equal(headers[headers.length - 1], 'note', 'note is the last column, so no existing column moves');
assert.equal(vm.runInContext('HEADER_LABELS.note', context), 'កំណត់សម្គាល់');
assert.equal(vm.runInContext('STUDENT_COLUMN_WIDTHS.length', context), headers.length);
assert.equal(vm.runInContext('VIEW_COLUMN_WIDTHS.length', context), vm.runInContext('VIEW_FIELDS.length', context));

const col = key => headers.indexOf(key);
const row = fields => headers.map(key => fields[key] || '');
const rows = [
    row({ id:'s1', studentCode:'9022607001', className:'7A', studentName:'សិស្ស មួយ', studentSurname:'សិស្ស', studentGivenName:'មួយ', fatherName:'ឪពុក', updatedAt:'2026-09-28T00:00:00.000Z' }),
    row({ id:'s2', studentCode:'9022508001', className:'8A', studentName:'សិស្ស ពីរ', studentSurname:'សិស្ស', studentGivenName:'ពីរ', studentLatinName:'SEUS PI', updatedAt:'2026-09-28T00:00:00.000Z' })
];
const sheet = {
    getLastRow:() => rows.length + 1,
    getMaxRows:() => 999,
    insertRowsAfter:() => {},
    getRange(firstRow, firstColumn, count=1, width=1) {
        const read = () => Array.from({length:count}, (_, n) =>
            Array.from({length:width}, (_, k) => rows[firstRow - 2 + n]?.[firstColumn - 1 + k] ?? ''));
        return {
            getValues:read, getDisplayValues:read,
            setValues(values) {
                values.forEach((cells, n) => cells.forEach((cell, k) => { rows[firstRow - 2 + n][firstColumn - 1 + k] = cell; }));
            }
        };
    }
};
context.getStudentsSheet_ = () => sheet;
// patchfields records the previous values in the audit sheet before writing.
const audit = [];
context.studentAuditSheet_ = () => ({ getLastRow:() => audit.length + 1, getRange:row => ({ setValues:values => { audit[row - 2] = values[0]; }, setValue:() => {} }) });
context.Utilities = { getUuid:() => 'uuid-1' };
context.auditAppliedStudentChange_ = row => { audit[row - 2][3] = 'applied'; };
const before = JSON.stringify(rows);

// patchfields writes only note / Latin name, never other cells or updatedAt.
let result = context.patchStudentFields_([
    { id:'s1', note:'ជាប់មធ្យមភាគប្រចាំឆ្នាំ', studentLatinName:'SEUS MUOY', onlyIfEmpty:['studentLatinName'] },
    { id:'s2', studentLatinName:'OVERWRITE', onlyIfEmpty:['studentLatinName'], fatherName:'hacked' },
    { id:'missing', note:'x' }
]);
assert.deepEqual({ ...result }, { changed:2, missing:1, skipped:1 });
assert.equal(rows[0][col('note')], 'ជាប់មធ្យមភាគប្រចាំឆ្នាំ');
assert.equal(rows[0][col('studentLatinName')], 'SEUS MUOY');
assert.equal(rows[1][col('studentLatinName')], 'SEUS PI', 'onlyIfEmpty keeps an existing Latin name');
assert.equal(rows[1][col('fatherName')], '', 'fields outside the whitelist are ignored');
const changedCells = [];
JSON.parse(before).forEach((cells, r) => cells.forEach((cell, c) => { if (rows[r][c] !== cell) changedCells.push(headers[c]); }));
assert.deepEqual(changedCells.sort(), ['note', 'studentLatinName'], 'only note and Latin-name cells changed');
assert.equal(audit.length, 1, 'one audit row per patch request');
assert.equal(audit[0][2], 'patch-fields');
assert.equal(audit[0][3], 'applied');
assert.deepEqual(JSON.parse(audit[0][8]).previous, [['s1', 'note', ''], ['s1', 'studentLatinName', '']], 'audit keeps the previous values');

// An app version from before the note field (no "note" key) cannot erase it.
context.upsertStudent_({ id:'s1', studentCode:'9022607001', className:'7A', studentName:'សិស្ស មួយ', studentSurname:'សិស្ស', studentGivenName:'មួយ', fatherName:'ឪពុកថ្មី' });
assert.equal(rows[0][col('fatherName')], 'ឪពុកថ្មី');
assert.equal(rows[0][col('note')], 'ជាប់មធ្យមភាគប្រចាំឆ្នាំ', 'an old client keeps the stored note');

// A current client that sends a note can still change or clear it.
context.upsertStudent_({ id:'s1', studentCode:'9022607001', className:'7A', studentName:'សិស្ស មួយ', studentSurname:'សិស្ស', studentGivenName:'មួយ', note:'' });
assert.equal(rows[0][col('note')], '', 'an explicit empty note clears it');

// The app sends the note only when it has text or was edited.
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.match(html, /<textarea id="note" name="note"/);
assert.match(html, /getValue\("note"\) \|\| document\.getElementById\("note"\)\.dataset\.edited === "1" \? \{ note:getValue\("note"\) \} : \{\}/);
assert.match(html, /\{ header:"កំណត់សម្គាល់", width:30, value:student => student\.note \}/);
console.log('Student note: last column, patch writes only note/Latin name, old clients cannot erase notes');
