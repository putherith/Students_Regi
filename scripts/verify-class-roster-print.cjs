const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('    function reportShortDate(value) {');
const end = html.indexOf('    function renderClassReport() {', start);
assert.ok(start >= 0 && end > start, 'Roster functions exist');

const khmer = value => String(value).replace(/\d/g, digit => '០១២៣៤៥៦៧៨៩'[Number(digit)]);
const context = {
    appSettings:{ academicYearStart:2026, issueDate:'2026-10-20', principalName:'ហ៊យ សូត្រា', classTeachers:{ '7A':'ឈូក ស្រីមុំ' } },
    normDate:value => value,
    compareKhmer:(a, b) => String(a).localeCompare(String(b), 'en', { numeric:true }),
    studentVisibleId:student => student.studentCode,
    studentFullName:student => student.name,
    toKhmerDigits:khmer,
    window:{},
    esc:value => String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]),
    Date
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'school-document.js'), 'utf8'), context);
vm.runInContext(html.slice(start, end), context);

const makeGroup = (count, key = 'class:7A', name = '7A') => ({
    key, name, male:count - 21, female:21,
    students:Array.from({ length:count }, (_, index) => ({
        studentCode:`9022607${String(index + 1).padStart(3, '0')}`,
        name:`សិស្ស ${index + 1}`,
        gender:index < 21 ? 'ស្រី' : 'ប្រុស',
        dob:'2014-08-26', className:name, guardianName:index === 4 ? 'ឡុង កែវ' : '', contact:index === 4 ? '11992971' : index === 14 ? '0' : ''
    }))
});

// The school's class-list form (Digital Class print): see README / the PDF sample.
const list = context.classRosterDocumentHtml(makeGroup(42));
assert.equal((list.match(/class="sl-page"/g) || []).length, 1, 'one flowing document; the header row repeats on each printed page');
assert.match(list, /<div class="sl-office"><div>មន្ទីរអប់រំ យុវជន និងកីឡា ខេត្តតាកែវ<\/div><div>ការិយាល័យអប់រំ យុវជន និងកីឡា ស្រុកកោះអណ្តែត<\/div><div>វិទ្យាល័យ សុខអាន ព្រៃមេលង<\/div><\/div>/, 'offices on the left');
assert.match(list, /<div class="sl-kingdom"><div>ព្រះរាជាណាចក្រកម្ពុជា<\/div><div>ជាតិ សាសនា ព្រះមហាក្សត្រ<\/div><div class="sl-ornament">❖ ❖ ❖<\/div><\/div>/, 'kingdom on the right');
assert.match(list, /<h1 class="sl-title">បញ្ជីឈ្មោះសិស្ស<\/h1>/);
assert.match(list, /<p class="sl-subtitle">ថ្នាក់ទី 7A · ឆ្នាំសិក្សា ២០២៦-២០២៧<\/p>/);
const headers = [...list.matchAll(/<th>([^<]+)<\/th>/g)].map(match => match[1]);
assert.deepEqual(headers, ['ល.រ', 'គោត្តនាម និងនាម', 'ភេទ', 'ថ្ងៃខែឆ្នាំកំណើត', 'អាណាព្យាបាល', 'ទូរស័ព្ទ', 'ផ្សេងៗ']);
assert.equal((list.match(/<tr>/g) || []).length, 43, 'one header row and 42 students');
assert.match(list, /<td class="sl-center">១<\/td><td class="sl-left">សិស្ស 1<\/td><td class="sl-center">ស្រី<\/td><td class="sl-center">26\/08\/2014<\/td>/, 'Khmer row number, Latin-digit date of birth');
assert.doesNotMatch(list, /២៦\/០៨\/២០១៤/, 'dates of birth are never in Khmer digits');
assert.match(list, /<td class="sl-left">ឡុង កែវ<\/td><td class="sl-left">11992971<\/td>/, 'guardian and phone');
assert.doesNotMatch(list, /<td class="sl-left">0<\/td>/, 'a placeholder 0 phone is left blank');
assert.match(list, /<tr class="sl-total"><td colspan="2" class="sl-center">សរុប<\/td><td colspan="5" class="sl-center">៤២ នាក់<\/td><\/tr>/);
assert.match(list, /ក្នុងនោះ ស្រី ២១ នាក់ · ប្រុស ២១ នាក់/);
assert.match(list, /បានឃើញ និងឯកភាព<\/div><div>នាយកសាលា<\/div><div class="sl-sign-name">ហ៊យ សូត្រា<\/div>/);
assert.match(list, /ធ្វើនៅព្រៃមេលង, ថ្ងៃទី [០-៩]{2} ខែ(មករា|កុម្ភៈ|មីនា|មេសា|ឧសភា|មិថុនា|កក្កដា|សីហា|កញ្ញា|តុលា|វិច្ឆិកា|ធ្នូ) ឆ្នាំ[០-៩]{4}<\/div><div>គ្រូបន្ទុកថ្នាក់<\/div><div class="sl-sign-name">ឈូក ស្រីមុំ<\/div>/);
assert.equal(context.window.SchoolDocument.listDateLine(new Date(2026, 10, 27)), 'ធ្វើនៅព្រៃមេលង, ថ្ងៃទី ២៧ ខែវិច្ឆិកា ឆ្នាំ២០២៦');
assert.doesNotMatch(list, /ព\.ស\./, 'no lunar date line on the class list');

// Grade lists add a class column; the preview shows only the first printed page.
const grade = context.classRosterDocumentHtml(makeGroup(60, 'grade:7', 'ថ្នាក់ទី៧'));
assert.deepEqual([...grade.matchAll(/<th>([^<]+)<\/th>/g)].map(match => match[1]),
    ['ល.រ', 'គោត្តនាម និងនាម', 'ភេទ', 'ថ្ងៃខែឆ្នាំកំណើត', 'ថ្នាក់', 'អាណាព្យាបាល', 'ទូរស័ព្ទ', 'ផ្សេងៗ']);
assert.match(grade, /អ្នករៀបចំបញ្ជី/);
assert.equal((context.classRosterDocumentHtml(makeGroup(60, 'grade:7', 'ថ្នាក់ទី៧'), true).match(/<tr>/g) || []).length, 29, 'preview: header + 28 rows');

const css = context.classRosterPrintCss();
assert.match(css, /size:A4 portrait; margin:15mm 15mm 12mm/);
assert.match(css, /\.sl-table thead \{ display:table-header-group; \}/, 'header row repeats on each page');
assert.match(css, /\.sl-table th, \.sl-table td \{[^}]*background:#fff;[^}]*font-weight:400;/, 'plain white header, not grey or bold');
assert.match(html, /data-sidebar-view="report"/, 'Roster is reached through the Reports navigation');
assert.match(html, /id="report-mode-class"/, 'Class mode remains available in Reports');
assert.match(html, /id="download-class-roster-btn"/);
assert.match(html, /querySelector\("\.school-roster-page, \.sl-page"\)/, 'print window treats the list as a roster');

const downloadStart = html.indexOf('    function rosterDownloadName(groups, extension) {');
const downloadEnd = html.indexOf('    // ===================== FILTERS', downloadStart);
assert.ok(downloadStart >= 0 && downloadEnd > downloadStart, 'Roster export functions exist');
vm.runInContext(html.slice(downloadStart, downloadEnd), context);
let workbookSpec;
context.window.StudentExport = { styledWorkbook:spec => { workbookSpec = spec; return { size:1 }; } };
context.showToast = () => {};
context.addressText = () => '';
context.document = { body:{ append:() => {} }, createElement:() => ({ click:() => {}, remove:() => {} }) };
context.URL = { createObjectURL:() => 'blob:test', revokeObjectURL:() => {} };
context.setTimeout = () => {};
vm.runInContext('downloadWorkbookFile = (blob, name) => { globalThis.__name = name; };', context);
context.downloadClassRosterExcel([makeGroup(42)]);
const sheet = workbookSpec.sheets[0];
assert.equal(sheet.layout, 'student-list', 'Excel uses the same class-list form');
assert.equal(sheet.rows.length, 42);
assert.deepEqual(Array.from(sheet.rows[4]), ['៥', 'សិស្ស 5', 'ស្រី', '26/08/2014', 'ឡុង កែវ', '11992971', '']);
assert.equal(sheet.subtitle, 'ថ្នាក់ទី 7A · ឆ្នាំសិក្សា ២០២៦-២០២៧');
assert.equal(sheet.footer.total, 42);
assert.match(sheet.footer.dateLine, /^ធ្វើនៅព្រៃមេលង, ថ្ងៃទី /);
assert.match(context.__name, /\.xlsx$/);

let downloadedBlob;
context.selectedClassReport = () => ({ selected:makeGroup(42), rows:[makeGroup(42)] });
context.reportMode = 'class';
context.URL = { createObjectURL:blob => { downloadedBlob = blob; return 'blob:test'; }, revokeObjectURL:() => {} };
context.document = { body:{ append:() => {} }, createElement:() => ({ click:() => {}, remove:() => {} }) };
context.Blob = Blob;
context.setTimeout = () => {};
context.downloadClassRosterHtml();
downloadedBlob.text().then(downloadedHtml => {
    assert.match(downloadedHtml, /<html lang="km">/);
    assert.match(downloadedHtml, /<table class="sl-table">/);
    assert.match(downloadedHtml, /size:A4 portrait/);
    assert.equal((downloadedHtml.match(/class="sl-page"/g) || []).length, 1);
    const downloadedScript = downloadedHtml.match(/<script>([\s\S]*?)<\/script>/);
    assert.ok(downloadedScript);
    new vm.Script(downloadedScript[1]);
    if (process.argv.includes('--preview')) {
        const output = path.join(__dirname, '..', 'tmp', 'roster-preview.html');
        fs.mkdirSync(path.dirname(output), { recursive:true });
        fs.writeFileSync(output, downloadedHtml);
        console.log(`Local visual fixture: ${output}`);
    }
    console.log('Class roster: school class-list form (offices left, kingdom right, 7 columns, total, dated signatures) for print, HTML and Excel');
}).catch(error => { console.error(error); process.exitCode = 1; });
