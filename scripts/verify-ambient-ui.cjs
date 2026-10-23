const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pages = [
  ['index.html', 'ambient-grid'],
  ['teacher-portal.html', 'portal-ambient'],
  ['script-release-2.1.64/TeacherPortal.html', 'portal-ambient']
];

for (const [file, layer] of pages) {
  const html = read(file);
  const style = html.match(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/i)?.[1];
  assert.ok(style, `${file}: inline CSS exists`);
  postcss.parse(style, { from: file });
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  assert.equal((markup.match(/<body\b/gi) || []).length, 1, `${file}: one body`);
  assert.equal((markup.match(/<main\b/gi) || []).length, 1, `${file}: one main`);
  assert.match(markup, new RegExp(`<div class="${layer}" aria-hidden="true"><\\/div>`), `${file}: decorative layer is hidden from assistive technology`);
  assert.match(style, /@keyframes ambient-grid-drift/);
  assert.match(style, /@keyframes ambient-orb-one/);
  assert.match(style, /@keyframes ambient-orb-two/);
  assert.match(style, /@media\s*\(?prefers-reduced-motion:\s*reduce\)?[\s\S]*?ambient-(?:grid|orb)/,
    `${file}: reduced-motion stops ambient animation`);
  assert.match(style, /@media\s*print[\s\S]*?ambient/, `${file}: print hides decoration`);
}

assert.equal(read('teacher-portal.html'), read('script-release-2.1.64/TeacherPortal.html'),
  'Local portal preview and Apps Script release template must be identical');
for (const file of ['index.html', 'teacher-portal.html']) {
  const output = path.join(root, 'dist', file);
  if (fs.existsSync(output)) assert.equal(read(file), fs.readFileSync(output, 'utf8'), `${file}: built preview is current`);
}
console.log('Ambient UI: CSS parsed, markup checked, reduced motion and print covered, Apps Script/preview synced');
