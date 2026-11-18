// Live registration checks: similar-student matching, birth-date sanity, and
// the task home wiring. Runs the real functions from index.html in a VM.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]).filter(Boolean);
scripts.forEach((source, index) => new vm.Script(source, { filename: `inline-${index}.js` }));

const start = html.indexOf('    // ----- Live checks while registering -----');
const end = html.indexOf('    let registrationCheckTimer');
assert.ok(start > 0 && end > start, 'live check functions exist');
const context = vm.createContext({
  appSettings: { academicYearStart: 2026 },
  Date,
  normText: value => String(value || '').normalize('NFC').replace(/[​-‍⁠﻿]/g, '').trim().toLowerCase().replace(/[\s ]+/g, ''),
  normGender: value => String(value || ''),
  normDate: value => String(value || ''),
  studentFullName: student => student.studentName || [student.studentSurname, student.studentGivenName].filter(Boolean).join(' '),
  classGrade: className => { const match = String(className || '').match(/^(1[0-2]|[7-9])(?=\D|$)/); return match ? Number(match[1]) : null; }
});
vm.runInContext(html.slice(start, end), context);

const source = [
  { id: 'a', studentName: 'គឿន ស្រីកា', gender: 'ស្រី', dob: '2014-06-21', className: '8A' },
  { id: 'b', studentName: 'ទី លីហួរ', gender: 'ស្រី', dob: '2014-02-06', className: '7C' },
  { id: 'c', studentName: 'សុខ ដារ៉ា', gender: 'ប្រុស', dob: '2012-01-01', className: '9A' }
];
const similar = (draft, ignore = '') => Array.from(context.findSimilarStudents(draft, ignore, source), match => [match.student.id, match.strong]);

// The spelling variant from the 2026 promotion import is caught as a likely duplicate.
assert.deepEqual(similar({ studentName: 'គឺន សុកា', gender: 'ស្រី', dob: '2014-06-21' }), [['a', true]]);
// A near-identical name with a different birth date is shown, but not as certain.
assert.deepEqual(similar({ studentName: 'ទី លីហួ', gender: 'ស្រី', dob: '2014-02-16' }), [['b', false]]);
// The same full name is always a strong match, whatever the birth date.
assert.deepEqual(similar({ studentName: 'សុខ ដារ៉ា', gender: 'ប្រុស', dob: '2013-05-05' }), [['c', true]]);
// Unrelated names, short input and the record being edited produce nothing.
assert.deepEqual(similar({ studentName: 'ចាន់ សុភា', gender: 'ស្រី', dob: '2013-01-01' }), []);
assert.deepEqual(similar({ studentName: 'សុ', gender: 'ប្រុស' }), []);
assert.deepEqual(similar({ studentName: 'សុខ ដារ៉ា', gender: 'ប្រុស' }, 'c'), []);

const level = (dob, className) => context.dobCheck(dob, className).level;
assert.equal(level('2024-01-01', '8D'), 'error', 'a two-year-old cannot be in grade 8');
assert.equal(level('2099-01-01', '7A'), 'error', 'future birth dates are rejected');
assert.equal(level('2001-05-05', '8B'), 'warning', '25-year-old in grade 8 asks for confirmation');
assert.equal(level('2012-03-03', '8B'), '', 'a 14-year-old in grade 8 is normal');
assert.equal(level('2014-06-21', '7B'), '', 'a 12-year-old in grade 7 is normal');
assert.equal(level('', ''), '', 'blank birth date is left to the required-field check');
assert.equal(level('2010-01-01', ''), '', 'no class: 16 is within the general range');

// Save-time guard runs before anything is written, and the task home reuses navigation.
const submit = html.slice(html.indexOf('    async function handleFormSubmit(e) {'), html.indexOf('        studentSaveInProgress = true;', html.indexOf('    async function handleFormSubmit(e) {')));
assert.match(submit, /const dateCheck = dobCheck\(payload\.dob, payload\.className\);/);
assert.match(submit, /if \(dateCheck\.level === "error"\) \{[\s\S]*?return;/);
assert.match(submit, /findSimilarStudents\(payload, "", allStudents\)\.filter\(match => match\.strong\)/);
for (const task of ['form', 'search', 'classes', 'report']) assert.match(html, new RegExp(`class="task-card[^"]*" type="button" data-task="${task}"`));
assert.match(html, /#app-actions \[data-sidebar-view="\$\{task\}"\]/);
assert.match(html, /<div id="similar-students" class="similar-students field-full" role="status" aria-live="polite" hidden><\/div>/);

console.log(`Registration checks: ${scripts.length} inline scripts parse; similar-student matching, birth-date sanity and task home verified`);
