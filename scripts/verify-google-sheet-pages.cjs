// Exercise the Apps Script read endpoints without touching the live spreadsheet.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'google-sheet-backend.gs'), 'utf8');
const context = {
    ContentService: {
        MimeType:{ JSON:'json', JAVASCRIPT:'javascript' },
        createTextOutput(text) { return { text, setMimeType() { return this; } }; }
    },
    PropertiesService:{ getScriptProperties:() => ({ getProperty:() => '' }) }
};
vm.createContext(context);
vm.runInContext(source, context);

const keys = Array.from(context.HEADERS || vm.runInContext('HEADERS', context));
const rows = Array.from({ length:3 }, (_, index) => {
    const values = keys.map(() => '');
    values[keys.indexOf('id')] = `id-${index + 1}`;
    values[keys.indexOf('studentCode')] = `STU-${index + 1}`;
    values[keys.indexOf('studentName')] = `សិស្ស ${index + 1}`;
    values[keys.indexOf('photo')] = 'data:image/png;base64,example';
    return values;
});
context.getStudentsSheet_ = () => ({
    getLastRow:() => rows.length + 1,
    getRange(row, column, count, width) {
        const values = rows.slice(row - 2, row - 2 + count).map(record => record.slice(column - 1, column - 1 + width));
        return { getValues:() => values, getDisplayValues:() => values };
    }
});
context.readAppSettings_ = () => ({ principalName:'Test' });
context.getRevision_ = () => 'revision-1';

const get = params => JSON.parse(context.doGet({ parameter:params }).text);
const first = get({ action:'listpage', offset:'0', limit:'2' });
const last = get({ action:'listpage', offset:'2', limit:'2' });
const identities = get({ action:'identities' });
assert.equal(first.ok, true);
assert.equal(first.total, 3);
assert.equal(first.students.length, 2);
assert.equal(first.students[0].photo, 'data:image/png;base64,example');
assert.equal(first.settings.principalName, 'Test');
assert.equal(last.students.length, 1);
assert.equal(last.settings, undefined);
assert.equal(identities.students.length, 3);
assert.equal(identities.students[0].photo, undefined);
console.log('Paged Sheet reads and lightweight identities passed');
