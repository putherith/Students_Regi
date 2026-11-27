const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'student-export.js'), 'utf8');
const context = { window:{}, TextEncoder, Uint32Array, Uint8Array, DataView, Blob, fetch };
vm.runInNewContext(source, context);

function localZipEntries(bytes) {
    const entries = new Map();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 0;
    while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
        const compressedSize = view.getUint32(offset + 18, true);
        const nameLength = view.getUint16(offset + 26, true);
        const extraLength = view.getUint16(offset + 28, true);
        const nameStart = offset + 30;
        const dataStart = nameStart + nameLength + extraLength;
        const name = new TextDecoder().decode(bytes.subarray(nameStart, nameStart + nameLength));
        entries.set(name, bytes.slice(dataStart, dataStart + compressedSize));
        offset = dataStart + compressedSize;
    }
    return entries;
}

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

    const workbook = context.window.StudentExport.styledWorkbook({
        title:'បញ្ជីសិស្ស',
        sheets:[{
            name:'ថ្នាក់ 7A',
            title:'បញ្ជីឈ្មោះសិស្សថ្នាក់ 7A',
            subtitle:'វិទ្យាល័យសុខអានព្រៃមេលង',
            meta:'សរុប ២ នាក់',
            columns:[
                { header:'ល.រ', width:6, type:'integer' },
                { header:'អត្តលេខ', width:16, type:'code', align:'center' },
                { header:'គោត្តនាម និងនាម', width:24 },
                { header:'ថ្ងៃខែឆ្នាំកំណើត', width:15, type:'date' }
            ],
            rows:[[1, '9022607001', 'សុខ ស្រីនីត', '2012-06-23'], [2, '9022607002', 'សុខ ដារ៉ា', '2011-12-05']]
        }, {
            name:'ថ្នាក់ 8B',
            title:'បញ្ជីឈ្មោះសិស្សថ្នាក់ 8B',
            subtitle:'វិទ្យាល័យសុខអានព្រៃមេលង',
            meta:'សរុប ១ នាក់',
            columns:[
                { header:'ល.រ', width:6, type:'integer' },
                { header:'អត្តលេខ', width:16, type:'code', align:'center' },
                { header:'គោត្តនាម និងនាម', width:24 },
                { header:'ថ្ងៃខែឆ្នាំកំណើត', width:15, type:'date' }
            ],
            rows:[[1, '9022508001', 'ចាន់ វិសាល', '2011-01-15']]
        }]
    });
    assert.equal(workbook.type, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const workbookBytes = new Uint8Array(await workbook.arrayBuffer());
    if (process.env.SAVE_XLSX) {
        fs.mkdirSync(path.dirname(process.env.SAVE_XLSX), { recursive:true });
        fs.writeFileSync(process.env.SAVE_XLSX, workbookBytes);
    }
    const entries = localZipEntries(workbookBytes);
    for (const required of [
        '[Content_Types].xml', 'xl/workbook.xml', 'xl/styles.xml',
        'xl/worksheets/sheet1.xml', 'xl/worksheets/_rels/sheet1.xml.rels', 'xl/tables/table1.xml',
        'xl/worksheets/sheet2.xml', 'xl/worksheets/_rels/sheet2.xml.rels', 'xl/tables/table2.xml'
    ]) assert.ok(entries.has(required), `Missing ${required}`);
    const sheet = new TextDecoder().decode(entries.get('xl/worksheets/sheet1.xml'));
    const table = new TextDecoder().decode(entries.get('xl/tables/table1.xml'));
    const styles = new TextDecoder().decode(entries.get('xl/styles.xml'));
    assert.match(sheet, /state="frozen"/);
    assert.ok(sheet.indexOf('<sheetPr>') < sheet.indexOf('<dimension '), 'sheetPr must precede dimension for Excel');
    assert.match(sheet, /fitToPage="1"/);
    assert.match(sheet, /paperSize="9" orientation="landscape" fitToWidth="1"/);
    assert.match(sheet, /width="24" customWidth="1"/);
    assert.match(sheet, /សុខ ស្រីនីត/);
    assert.match(sheet, /<c r="D11" s="7"><v>\d+<\/v><\/c>/);
    assert.match(table, /<autoFilter ref="A10:D12"\/>/);
    assert.match(table, /showRowStripes="1"/);
    assert.match(styles, /formatCode="dd\/mm\/yyyy"/);
    assert.match(styles, /Khmer OS Siemreap/);
    assert.equal(new DataView(workbookBytes.buffer).getUint32(workbookBytes.length - 22, true), 0x06054b50);
    assert.notEqual(new DataView(workbookBytes.buffer).getUint16(12, true), 0, 'ZIP date must be valid for Microsoft Excel');
    const workbookXml = new TextDecoder().decode(entries.get('xl/workbook.xml'));
    assert.match(workbookXml, /_xlnm\.Print_Titles" localSheetId="0">'[^']+'!\$10:\$10</, 'the table header repeats on printed pages');

    // The school class-list form (same as the printed roster): no Excel table, white header, total and signatures.
    const listBook = context.window.StudentExport.styledWorkbook({ title:'បញ្ជីឈ្មោះសិស្ស', sheets:[{
        name:'7A', layout:'student-list', title:'បញ្ជីឈ្មោះសិស្ស', subtitle:'ថ្នាក់ទី 7A · ឆ្នាំសិក្សា ២០២៦-២០២៧',
        columns:[
            { header:'ល.រ', width:5.7, align:'center' }, { header:'គោត្តនាម និងនាម', width:24.1, align:'left' },
            { header:'ភេទ', width:7.6, align:'center' }, { header:'ថ្ងៃខែឆ្នាំកំណើត', width:21.1, align:'center' },
            { header:'អាណាព្យាបាល', width:17.2, align:'left' }, { header:'ទូរស័ព្ទ', width:15.3, align:'left' }, { header:'ផ្សេងៗ', width:9, align:'left' }
        ],
        rows:[['១', 'កន រដ្ឋា', 'ប្រុស', '26/08/2014', '', '', ''], ['២', 'កែវ ណាន់តាន់', 'ស្រី', '17/07/2014', 'ឡុង កែវ', '11992971', '']],
        footer:{ total:2, female:1, male:1, dateLine:'ធ្វើនៅព្រៃមេលង, ថ្ងៃទី ២៧ ខែវិច្ឆិកា ឆ្នាំ២០២៦', principal:'ហ៊យ សូត្រា', teacherTitle:'គ្រូបន្ទុកថ្នាក់', teacher:'ឈូក ស្រីមុំ' }
    }] });
    const listEntries = localZipEntries(new Uint8Array(await listBook.arrayBuffer()));
    assert.ok(!listEntries.has('xl/tables/table1.xml'), 'class-list sheet has no Excel table or filter');
    const list = new TextDecoder().decode(listEntries.get('xl/worksheets/sheet1.xml'));
    const listTypes = new TextDecoder().decode(listEntries.get('[Content_Types].xml'));
    assert.doesNotMatch(listTypes, /table1\.xml/);
    assert.match(list, /<c r="A1" t="inlineStr" s="11"><is><t>មន្ទីរអប់រំ យុវជន និងកីឡា ខេត្តតាកែវ<\/t>/, 'offices on the left');
    assert.match(list, /<c r="E1" t="inlineStr" s="9"><is><t>ព្រះរាជាណាចក្រកម្ពុជា<\/t>/, 'kingdom on the right');
    assert.match(list, /<c r="E3" t="inlineStr" s="11"><is><t>❖ ❖ ❖<\/t>/);
    assert.match(list, /<c r="A8" t="inlineStr" s="6"><is><t>ល\.រ<\/t>/, 'white, non-bold header row 8');
    assert.match(list, /<c r="D9" t="inlineStr" s="6"><is><t>26\/08\/2014<\/t>/, 'date of birth stays as Latin-digit text');
    assert.match(list, /<c r="A11" t="inlineStr" s="6"><is><t>សរុប<\/t>/);
    assert.match(list, /<c r="C11" t="inlineStr" s="6"><is><t>២ នាក់<\/t>/);
    assert.match(list, /ក្នុងនោះ ស្រី ១ នាក់ · ប្រុស ១ នាក់/);
    assert.match(list, /ធ្វើនៅព្រៃមេលង, ថ្ងៃទី ២៧ ខែវិច្ឆិកា ឆ្នាំ២០២៦/);
    assert.match(list, /ហ៊យ សូត្រា/);
    assert.match(list, /ឈូក ស្រីមុំ/);
    assert.match(list, /<mergeCell ref="A11:B11"\/><mergeCell ref="C11:G11"\/>/);
    assert.match(list, /paperSize="9" orientation="portrait" fitToWidth="1"/);
    assert.match(new TextDecoder().decode(listEntries.get('xl/workbook.xml')), /'7A'!\$8:\$8</, 'list header row 8 repeats on printed pages');
    console.log('Photo ZIP, styled Excel workbook and class-list Excel exports passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
