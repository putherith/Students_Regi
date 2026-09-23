const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'google-sheet-backend.gs'), 'utf8');
const context = vm.createContext({ console });
vm.runInContext(source, context);
const headers = Array.from(vm.runInContext('HEADERS', context));
const viewFields = Array.from(vm.runInContext('VIEW_FIELDS', context));
const photoA = 'data:image/png;base64,AAAA';
const photoB = 'data:image/png;base64,BBBB';

function row(fields, columns) {
  return columns.map(key => fields[key] || '');
}

function sheet(name, rows) {
  return {
    getName: () => name,
    getLastRow: () => rows.length + 1,
    getRange(firstRow, firstColumn, height = 1, width = 1) {
      return {
        getValues: () => rows.slice(firstRow - 2, firstRow - 2 + height)
          .map(item => item.slice(firstColumn - 1, firstColumn - 1 + width)),
        setValue: value => { rows[firstRow - 2][firstColumn - 1] = value; }
      };
    }
  };
}

const masterRows = [
  row({ id:'id-1', studentCode:'STU-1', studentName:'សុខ ដារ៉ា', studentSurname:'សុខ', studentGivenName:'ដារ៉ា' }, headers),
  row({ id:'id-2', studentCode:'STU-2', studentName:'សុខ មុនី', photo:photoB }, headers)
];
const master = sheet('Students', masterRows);
const classRows = [row({ studentCode:'STU-1', studentSurname:'សុខ', studentGivenName:'ដារ៉ា', photo:photoA }, viewFields)];
const classSheet = sheet('Class - 7A', classRows);
context.testSheet = master;
context.testViews = [classSheet];
context.SpreadsheetApp = { getActiveSpreadsheet: () => ({ getSheets: () => context.testViews }) };
vm.runInContext('getStudentsSheet_ = function() { return testSheet; }', context);

assert.equal(vm.runInContext('restoreMissingPhotos_([])', context), 1);
assert.equal(masterRows[0][headers.indexOf('photo')], photoA);
assert.equal(masterRows[1][headers.indexOf('photo')], photoB);

masterRows[0][headers.indexOf('photo')] = '';
context.testViews = [classSheet, sheet('By Class', [row({ studentCode:'STU-1', studentSurname:'សុខ', studentGivenName:'ដារ៉ា', photo:photoB }, viewFields)])];
assert.equal(vm.runInContext('restoreMissingPhotos_([])', context), 0, 'conflicting photos must not be guessed');
assert.equal(masterRows[0][headers.indexOf('photo')], '');

context.testViews = [];
context.captured = null;
vm.runInContext('readStudents_ = function() { return [{id:"id-1",studentCode:"STU-1",photo:"data:image/png;base64,OLD"}]; }; writeStudents_ = function(rows) { captured = rows; }', context);
vm.runInContext('replaceStudents_([{id:"id-1",studentCode:"STU-1",photo:""}])', context);
assert.equal(context.captured[0].photo, 'data:image/png;base64,OLD');

console.log('Photo recovery checks passed');
