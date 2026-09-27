const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'student-export.js'), 'utf8');
const context = { window:{}, TextEncoder, Uint32Array, Uint8Array, DataView, Blob, fetch };
vm.runInNewContext(source, context);

(async () => {
    const image = 'data:image/png;base64,iVBORw0KGgo=';
    const students = [
        { name:'សុខ ស្រីនីត', photo:image },
        { name:'សុខ ស្រីនីត', photo:image },
        { name:'គ្មានរូប', photo:'' }
    ];
    const result = await context.window.StudentExport.photosZip(students, student => student.name);
    assert.equal(result.count, 2);
    assert.equal(result.skipped.length, 1);
    const bytes = new Uint8Array(await result.blob.arrayBuffer());
    const view = new DataView(bytes.buffer);
    assert.equal(view.getUint32(0, true), 0x04034b50);
    assert.equal(view.getUint16(6, true), 0x0800);
    const names = new TextDecoder().decode(bytes);
    assert.match(names, /សុខ ស្រីនីត\.png/);
    assert.match(names, /សុខ ស្រីនីត \(2\)\.png/);
    assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50);
    console.log('Photo ZIP keeps source bytes and Khmer student filenames');
})().catch(error => { console.error(error); process.exitCode = 1; });
