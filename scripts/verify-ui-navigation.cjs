const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const sidebar = html.match(/<nav class="topbar-actions"[\s\S]*?<\/nav>/)?.[0];
const mobileMenu = html.match(/<div id="mobile-actions-sheet"[\s\S]*?<dialog id="card-export-dialog"/)?.[0];
const settings = html.match(/<div id="app-settings-modal"[\s\S]*?<div id="sheet-modal"/)?.[0];
assert.ok(sidebar && mobileMenu && settings, 'Navigation and settings sections exist');

assert.equal((sidebar.match(/data-sidebar-view="(?:form|list|classes|report)"/g) || []).length, 4);
assert.equal((sidebar.match(/<details class="action-group advanced-actions"/g) || []).length, 1);
assert.equal((mobileMenu.match(/<details class="mobile-action-group"/g) || []).length, 2);
assert.match(settings, /<section class="settings-section" aria-labelledby="settings-card-heading"/);
assert.match(settings, /<section class="settings-section" aria-labelledby="settings-contact-heading"/);
assert.match(settings, /<details id="teacher-settings-section" class="settings-collapsible">[\s\S]*?<input id="teacher-settings-search"[\s\S]*?<div id="teacher-settings-list"/);
assert.doesNotMatch(html, /class="admin-overview-actions"/, 'Duplicate dashboard shortcuts removed');
assert.doesNotMatch(html, /id="(?:m-)?print-name-list-btn"/, 'Class roster shortcut is not duplicated outside Reports');
assert.match(html, /function setSidebarActiveView\(view\)/);
assert.match(html, /@media \(min-width: 861px\) \{[\s\S]*?\.main-layout\.show-list \.form-panel,\s*\.main-layout\.show-form \.list-panel \{ display:none; \}/,
    'Desktop shows one primary work panel at a time');
const editSource = html.slice(html.indexOf('    async function loadStudentIntoForm(id) {'), html.indexOf('    function setSaving(', html.indexOf('    async function loadStudentIntoForm(id) {')));
assert.match(editSource, /if \(isMobileView\(\)\) \{\s*openMobileEditPanel\(\);\s*\} else \{\s*setActiveTab\("form", \{ scroll:false \}\)/,
    'Editing from desktop list opens the form view');
const submitSource = html.slice(html.indexOf('    async function handleFormSubmit(e) {'), html.indexOf('    function openDeleteModal(', html.indexOf('    async function handleFormSubmit(e) {')));
assert.match(submitSource, /if \(isMobileView\(\) \|\| editingId\) setActiveTab\("list", \{ scroll: !editingId \}\)/,
    'Editing returns to the list after save');

for (const id of [
    'app-settings-btn', 'sheet-settings-btn', 'load-sheet-btn', 'backup-now-btn',
    'recover-photos-btn', 'download-template-btn', 'import-file-btn',
    'print-list-btn', 'print-photo-list-btn',
    'print-card-list-btn', 'download-photos-btn', 'download-csv-btn', 'delete-all-btn'
]) {
    assert.equal((sidebar.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `${id} remains available once`);
}

const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(match => match[1]).filter(Boolean);
assert.ok(scripts.length, 'Inline app script exists');
scripts.forEach((source, index) => new vm.Script(source, { filename:`inline-${index}.js` }));

const filterSource = html.slice(html.indexOf('    function filterTeacherSettings() {'), html.indexOf('    function openAppSettings() {'));
const saveSource = html.slice(html.indexOf('    async function saveAppSettings() {'), html.indexOf('    // ===================== STATUS', html.indexOf('    async function saveAppSettings() {')));
assert.match(saveSource, /querySelectorAll\("input\[data-class-name\]"\)/, 'Saving reads every teacher input, including search-hidden rows');
assert.doesNotMatch(saveSource, /querySelectorAll\("input\[data-class-name\]:not\(\[hidden\]\)"\)/);
const rows = [
    { hidden:false, querySelector:() => ({ dataset:{ className:'7A' }, value:'គ្រូ សុខ' }) },
    { hidden:false, querySelector:() => ({ dataset:{ className:'8B' }, value:'គ្រូ ស្រី' }) }
];
const els = {
    teacherSettingsSearch:{ value:'8B' },
    teacherSettingsList:{ querySelectorAll:() => rows },
    teacherSettingsNoResults:{ hidden:true }
};
vm.runInNewContext(`${filterSource}\nfilterTeacherSettings()`, { els });
assert.deepEqual(rows.map(row => row.hidden), [true, false]);
els.teacherSettingsSearch.value = '';
vm.runInNewContext(`${filterSource}\nfilterTeacherSettings()`, { els });
assert.deepEqual(rows.map(row => row.hidden), [false, false]);
console.log('Navigation and Settings: focused desktop views, grouped controls, searchable teachers without dropping saved rows, scripts parse');
