const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('    function reportShortDate(value) {');
const end = html.indexOf('    function renderClassReport() {', start);
assert.ok(start >= 0 && end > start, 'Roster functions exist');

const context = {
    appSettings:{ academicYearStart:2026, issueDate:'2026-10-20', principalName:'នាយក', classTeachers:{ '8B':'គ្រូ' } },
    normDate:value => value,
    compareKhmer:(a, b) => String(a).localeCompare(String(b), 'en', { numeric:true }),
    studentVisibleId:student => student.studentCode,
    studentFullName:student => student.name,
    toKhmerDigits:value => String(value),
    esc:value => String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]),
    Date
};
vm.createContext(context);
vm.runInContext(html.slice(start, end), context);

const makeGroup = count => ({
    key:'class:8B', name:'8B', male:count - 18, female:18,
    students:Array.from({ length:count }, (_, index) => ({
        studentCode:`9022508${String(index + 1).padStart(3, '0')}`,
        name:`សិស្ស ${index + 1}`,
        gender:index < 18 ? 'ស្រី' : 'ប្រុស',
        dob:'2011-02-25', fromSchool:'សាលាមុន'
    }))
});

const onePage = context.classRosterDocumentHtml(makeGroup(65));
assert.equal((onePage.match(/class="school-roster-page"/g) || []).length, 1);
assert.equal((onePage.match(/<tr>/g) || []).length, 46, 'One header and 45 mirrored rows');
assert.match(onePage, /បញ្ជីឈ្មោះសិស្ស ថ្នាក់ទី 8B/);
assert.match(onePage, /បញ្ជីនេះមានសិស្សសរុប 65 នាក់ ស្រី 18 នាក់/);
assert.match(onePage, /ថ្ងៃទី \.\.\.\.\.\.\.\. ខែ \.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\. ឆ្នាំ 2026/);
assert.match(onePage, /គ្រូបន្ទុកថ្នាក់/);
assert.match(onePage, /នាយកសាលា/);
assert.match(onePage, /សិស្ស 65/);

const twoPages = context.classRosterDocumentHtml(makeGroup(91));
assert.equal((twoPages.match(/class="school-roster-page"/g) || []).length, 2);
assert.match(twoPages, /សិស្ស 91/);
assert.match(twoPages, /ទំព័រ 2\/2/);
assert.match(context.classRosterPrintCss(), /size:A4 portrait/);
assert.match(html, /\(selected \? \[selected\] : rows\)\.map\(classRosterDocumentHtml\)/);
console.log('Class roster print: mirrored 45-row layout, all students retained across pages, A4 portrait');
