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
assert.match(settings, /<details class="settings-collapsible">[\s\S]*?<div id="teacher-settings-list"/);
assert.doesNotMatch(html, /class="admin-overview-actions"/, 'Duplicate dashboard shortcuts removed');
assert.match(html, /function setSidebarActiveView\(view\)/);

for (const id of [
    'app-settings-btn', 'sheet-settings-btn', 'load-sheet-btn', 'backup-now-btn',
    'recover-photos-btn', 'download-template-btn', 'import-file-btn',
    'print-list-btn', 'print-photo-list-btn', 'print-name-list-btn',
    'print-card-list-btn', 'download-photos-btn', 'download-csv-btn', 'delete-all-btn'
]) {
    assert.equal((sidebar.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `${id} remains available once`);
}

const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(match => match[1]).filter(Boolean);
assert.ok(scripts.length, 'Inline app script exists');
scripts.forEach((source, index) => new vm.Script(source, { filename:`inline-${index}.js` }));
console.log('Navigation simplified: one primary sidebar, grouped mobile tools, accessible school settings, scripts parse');
