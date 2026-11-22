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
    window:{},
    esc:value => String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]),
    Date
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'school-document.js'), 'utf8'), context);
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

const onePage = context.classRosterDocumentHtml(makeGroup(25));
assert.equal((onePage.match(/class="school-roster-page"/g) || []).length, 1);
assert.equal((onePage.match(/<tr>/g) || []).length, 26, 'One header and 25 rows per A4 page');
assert.match(onePage, /ព្រះរាជាណាចក្រកម្ពុជា/, 'Kingdom motto');
assert.match(onePage, /ជាតិ សាសនា ព្រះមហាក្សត្រ/);
assert.match(onePage, /មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តតាកែវ/, 'Department on the left');
assert.match(onePage, /វិទ្យាល័យសុខអានព្រៃមេលង/);
assert.match(onePage, /class="sd-title">បញ្ជីឈ្មោះសិស្ស ថ្នាក់ទី 8B/);
assert.match(onePage, /class="roster-table sd-table"/);
assert.match(onePage, /បញ្ជីនេះមានសិស្សសរុប 25 នាក់ ស្រី 18 នាក់/);
assert.match(onePage, /ព\.ស\./, 'Lunar date line');
assert.match(onePage, /ព្រៃមេលង, ថ្ងៃទី\.+ ខែ\.+ ឆ្នាំ២០២៦/, 'Solar date line');
assert.match(onePage, /គ្រូបន្ទុកថ្នាក់/);
assert.match(onePage, /បានឃើញ និងឯកភាព/);
assert.match(onePage, /នាយកសាលា/);
assert.match(onePage, /សិស្ស 25/);

const threePages = context.classRosterDocumentHtml(makeGroup(65));
assert.equal((threePages.match(/class="school-roster-page"/g) || []).length, 3);
assert.match(threePages, /សិស្ស 65/);
assert.match(threePages, /ទំព័រ 3\/3/);
assert.equal((threePages.match(/class="sd-signatures"/g) || []).length, 1, "Signatures only on the last page");
assert.match(context.classRosterPrintCss(), /size:A4 portrait/);
assert.match(context.classRosterPrintCss(), /\.sd-table th \{ background:#e6e6e6/, 'Light grey header');
assert.doesNotMatch(context.classRosterPrintCss(), /#173F78|#0F766E/i, 'Black and white only');
assert.match(html, /data-sidebar-view="report"/, 'Roster is reached through the Reports navigation');
assert.match(html, /id="report-mode-class"/, 'Class mode remains available in Reports');
assert.match(html, /id="class-report-select"/);
assert.match(html, /id="download-class-roster-btn"/);
assert.match(onePage, /width:36%/);
assert.match(html, /function fitRosterText\(root\)/);

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
context.downloadClassRosterExcel([makeGroup(91)]);
assert.equal(workbookSpec.sheets.length, 1);
assert.equal(workbookSpec.sheets[0].rows.length, 91);
assert.equal(workbookSpec.sheets[0].rows[90][0], 91);
assert.equal(workbookSpec.sheets[0].subtitle, 'ឆ្នាំសិក្សា 2026-2027');
assert.doesNotMatch(workbookSpec.sheets[0].subtitle, /វិទ្យាល័យ/, 'School is in the ministry rows, not repeated');
assert.match(context.__name, /\.xlsx$/);
let downloadedBlob;
context.selectedClassReport = () => ({ selected:makeGroup(65), rows:[makeGroup(65)] });
context.reportMode = 'class';
context.URL = { createObjectURL:blob => { downloadedBlob = blob; return 'blob:test'; }, revokeObjectURL:() => {} };
context.document = { body:{ append:() => {} }, createElement:() => ({ click:() => {}, remove:() => {} }) };
context.Blob = Blob;
context.setTimeout = () => {};
context.downloadClassRosterHtml();
downloadedBlob.text().then(downloadedHtml => {
    assert.match(downloadedHtml, /<html lang="km">/);
    assert.match(downloadedHtml, /<table class="roster-table sd-table">/);
    assert.match(downloadedHtml, /size:A4 portrait/);
    assert.match(downloadedHtml, /<script>function fitRosterText/);
    assert.equal((downloadedHtml.match(/class="school-roster-page"/g) || []).length, 3);
    const downloadedScript = downloadedHtml.match(/<script>([\s\S]*?)<\/script>/);
    assert.ok(downloadedScript);
    new vm.Script(downloadedScript[1]);
    if (process.argv.includes('--preview')) {
        const output = path.join(__dirname, '..', 'tmp', 'roster-preview.html');
        fs.mkdirSync(path.dirname(output), { recursive:true });
        fs.writeFileSync(output, downloadedHtml);
        console.log(`Local visual fixture: ${output}`);
    }
    console.log('Class roster print/export: ministry header, 25-row A4 pages, signatures and Excel spec');
}).catch(error => { console.error(error); process.exitCode = 1; });
