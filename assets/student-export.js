/* Browser-side, uncompressed ZIP export. JPEG/PNG bytes are kept exactly as stored. */
(function () {
    const encoder = new TextEncoder();
    const crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let value = n;
        for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
        crcTable[n] = value >>> 0;
    }

    function crc32(bytes) {
        let value = 0xffffffff;
        for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
        return (value ^ 0xffffffff) >>> 0;
    }

    function cleanName(value) {
        return String(value || "").normalize("NFC")
            .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
            .replace(/[. ]+$/g, "").trim().slice(0, 100) || "សិស្ស";
    }

    function zipFiles(entries) {
        if (entries.length > 65535) throw new Error("Too many photos for one ZIP file");
        const parts = [], directory = [];
        let offset = 0, directorySize = 0;
        const now = new Date();
        const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
        const dosDate = (Math.max(1980, now.getFullYear()) - 1980) << 9 | ((now.getMonth() + 1) << 5) | now.getDate();
        for (const entry of entries) {
            const name = encoder.encode(entry.name);
            const bytes = entry.bytes;
            const checksum = crc32(bytes);
            const local = new Uint8Array(30);
            const l = new DataView(local.buffer);
            l.setUint32(0, 0x04034b50, true);
            l.setUint16(4, 20, true);
            l.setUint16(6, 0x0800, true); // UTF-8 filenames (including Khmer).
            l.setUint16(10, dosTime, true);
            l.setUint16(12, dosDate, true);
            l.setUint32(14, checksum, true);
            l.setUint32(18, bytes.length, true);
            l.setUint32(22, bytes.length, true);
            l.setUint16(26, name.length, true);
            parts.push(local, name, bytes);

            const central = new Uint8Array(46);
            const c = new DataView(central.buffer);
            c.setUint32(0, 0x02014b50, true);
            c.setUint16(4, 20, true);
            c.setUint16(6, 20, true);
            c.setUint16(8, 0x0800, true);
            c.setUint16(12, dosTime, true);
            c.setUint16(14, dosDate, true);
            c.setUint32(16, checksum, true);
            c.setUint32(20, bytes.length, true);
            c.setUint32(24, bytes.length, true);
            c.setUint16(28, name.length, true);
            c.setUint32(42, offset, true);
            directory.push(central, name);
            offset += local.length + name.length + bytes.length;
            directorySize += central.length + name.length;
        }
        const end = new Uint8Array(22);
        const e = new DataView(end.buffer);
        e.setUint32(0, 0x06054b50, true);
        e.setUint16(8, entries.length, true);
        e.setUint16(10, entries.length, true);
        e.setUint32(12, directorySize, true);
        e.setUint32(16, offset, true);
        return new Blob([...parts, ...directory, end], { type:"application/zip" });
    }

    function xml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
    }

    function columnName(index) {
        let name = "";
        for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
            name = String.fromCharCode(65 + (n - 1) % 26) + name;
        }
        return name;
    }

    function safeSheetName(value, used) {
        const base = String(value || "បញ្ជីសិស្ស").replace(/[\\/?*\[\]:]/g, "-").trim().slice(0, 31) || "Sheet";
        let name = base;
        for (let suffix = 2; used.has(name); suffix++) {
            const tail = `-${suffix}`;
            name = `${base.slice(0, 31 - tail.length)}${tail}`;
        }
        used.add(name);
        return name;
    }

    function excelDateSerial(value) {
        if (value instanceof Date && Number.isFinite(value.getTime())) {
            return value.getTime() / 86400000 + 25569;
        }
        const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;
        return Date.UTC(+match[1], +match[2] - 1, +match[3]) / 86400000 + 25569;
    }

    function inlineCell(reference, value, style) {
        const text = String(value ?? "");
        const preserve = /^\s|\s$|\n/.test(text) ? ' xml:space="preserve"' : "";
        return `<c r="${reference}" t="inlineStr" s="${style}"><is><t${preserve}>${xml(text)}</t></is></c>`;
    }

    function dataCell(reference, value, column) {
        if (column.type === "integer" && Number.isFinite(Number(value))) {
            return `<c r="${reference}" s="8"><v>${Number(value)}</v></c>`;
        }
        if (column.type === "date") {
            const serial = excelDateSerial(value);
            if (serial !== null) return `<c r="${reference}" s="7"><v>${serial}</v></c>`;
        }
        const style = column.align === "center" || column.type === "code" ? 6 : 5;
        return inlineCell(reference, value, style);
    }

    const workbookStyles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>
  <fonts count="6">
    <font><sz val="10"/><name val="Khmer OS Siemreap"/><family val="2"/></font>
    <font><color rgb="FF000000"/><sz val="13"/><name val="Khmer OS Muol Light"/></font>
    <font><b/><color rgb="FF000000"/><sz val="11"/><name val="Khmer OS Siemreap"/></font>
    <font><color rgb="FF404040"/><sz val="9"/><name val="Khmer OS Siemreap"/></font>
    <font><b/><color rgb="FF000000"/><sz val="10"/><name val="Khmer OS Siemreap"/></font>
    <font><color rgb="FF000000"/><sz val="11"/><name val="Khmer OS Muol Light"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE6E6E6"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="11">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;

    // Ministry header rows (kingdom, nation, ornament, department, school).
    const OFFICIAL_LINES = ["ព្រះរាជាណាចក្រកម្ពុជា", "ជាតិ សាសនា ព្រះមហាក្សត្រ", "✥✥✥",
        "មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តតាកែវ", "វិទ្យាល័យសុខអានព្រៃមេលង"];
    const TABLE_HEADER_ROW = 10;

    function worksheetXml(sheet, sheetIndex) {
        const columns = sheet.columns;
        const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
        const lastColumn = columnName(columns.length - 1);
        const tableHeaderRow = TABLE_HEADER_ROW;
        const firstDataRow = tableHeaderRow + 1;
        const lastRow = Math.max(firstDataRow, tableHeaderRow + rows.length);
        const columnXml = columns.map((column, index) =>
            `<col min="${index + 1}" max="${index + 1}" width="${Math.max(4, Math.min(42, Number(column.width) || 12))}" customWidth="1"/>`
        ).join("");
        const headerCells = columns.map((column, index) =>
            inlineCell(`${columnName(index)}${tableHeaderRow}`, column.header, 4)
        ).join("");
        const dataRows = rows.length ? rows.map((row, rowIndex) => {
            const excelRow = firstDataRow + rowIndex;
            const cells = columns.map((column, columnIndex) =>
                dataCell(`${columnName(columnIndex)}${excelRow}`, row[columnIndex], column)
            ).join("");
            return `<row r="${excelRow}" ht="23" customHeight="1">${cells}</row>`;
        }).join("") : `<row r="${firstDataRow}" ht="23" customHeight="1">${columns.map((column, index) => dataCell(`${columnName(index)}${firstDataRow}`, "", column)).join("")}</row>`;
        // Kingdom, nation, ornament and the title lines span the sheet; the
        // department and school lines stay left-aligned like ministry workbooks.
        const mergedRows = [1, 2, 3, 6, 7, 8];
        const merges = mergedRows.map(row => `<mergeCell ref="A${row}:${lastColumn}${row}"/>`).join("");
        const official = OFFICIAL_LINES;
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="${tableHeaderRow}" topLeftCell="A${firstDataRow}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>${columnXml}</cols>
  <sheetData>
    <row r="1" ht="22" customHeight="1">${inlineCell("A1", official[0], 9)}</row>
    <row r="2" ht="22" customHeight="1">${inlineCell("A2", official[1], 9)}</row>
    <row r="3" ht="16" customHeight="1">${inlineCell("A3", official[2], 9)}</row>
    <row r="4" ht="22" customHeight="1">${inlineCell("A4", official[3], 10)}</row>
    <row r="5" ht="22" customHeight="1">${inlineCell("A5", official[4], 10)}</row>
    <row r="6" ht="30" customHeight="1">${inlineCell("A6", sheet.title || "បញ្ជីសិស្ស", 1)}</row>
    <row r="7" ht="22" customHeight="1">${inlineCell("A7", sheet.subtitle || "", 2)}</row>
    <row r="8" ht="20" customHeight="1">${inlineCell("A8", sheet.meta || "", 3)}</row>
    <row r="9" ht="8" customHeight="1"/>
    <row r="${tableHeaderRow}" ht="34" customHeight="1">${headerCells}</row>
    ${dataRows}
  </sheetData>
  <mergeCells count="${mergedRows.length}">${merges}</mergeCells>
  <pageMargins left="0.25" right="0.25" top="0.45" bottom="0.45" header="0.2" footer="0.2"/>
  <pageSetup paperSize="${Number(sheet.paperSize) || 9}" orientation="landscape" fitToWidth="${Math.max(1, Number(sheet.fitToWidth) || 1)}" fitToHeight="0"/>
  <headerFooter><oddFooter>&amp;Lវិទ្យាល័យសុខអានព្រៃមេលង&amp;Rទំព័រ &amp;P / &amp;N</oddFooter></headerFooter>
  <tableParts count="1"><tablePart r:id="rId1"/></tableParts>
</worksheet>`;
    }

    function tableXml(sheet, tableIndex) {
        const columns = sheet.columns;
        const rowCount = Math.max(1, (sheet.rows || []).length);
        const reference = `A${TABLE_HEADER_ROW}:${columnName(columns.length - 1)}${TABLE_HEADER_ROW + rowCount}`;
        const tableColumns = columns.map((column, index) =>
            `<tableColumn id="${index + 1}" name="${xml(column.header)}"/>`
        ).join("");
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="${tableIndex}" name="StudentTable${tableIndex}" displayName="StudentTable${tableIndex}" ref="${reference}" totalsRowShown="0">
  <autoFilter ref="${reference}"/>
  <tableColumns count="${columns.length}">${tableColumns}</tableColumns>
  <tableStyleInfo name="TableStyleLight1" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/>
</table>`;
    }

    function styledWorkbook(spec={}) {
        const usedNames = new Set();
        const sheets = (spec.sheets || []).filter(sheet => Array.isArray(sheet.columns) && sheet.columns.length)
            .map(sheet => ({ ...sheet, name:safeSheetName(sheet.name, usedNames) }));
        if (!sheets.length) throw new Error("Workbook needs at least one sheet");
        const createdAt = new Date().toISOString();
        const entries = [];
        const addText = (name, value) => entries.push({ name, bytes:encoder.encode(value) });
        addText("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/tables/table${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>`).join("")}
</Types>`);
        addText("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
        addText("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(spec.title || "បញ្ជីសិស្ស")}</dc:title><dc:creator>វិទ្យាល័យសុខអានព្រៃមេលង</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:modified></cp:coreProperties>`);
        addText("docProps/app.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Student Registration App</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><Company>វិទ្យាល័យសុខអានព្រៃមេលង</Company><AppVersion>2.1</AppVersion></Properties>`);
        const definedNames = sheets.map((sheet, i) => {
            const quoted = `'${sheet.name.replace(/'/g, "''")}'`;
            const lastColumn = columnName(sheet.columns.length - 1);
            const lastRow = 5 + Math.max(1, (sheet.rows || []).length);
            return `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${quoted}!$1:$5</definedName><definedName name="_xlnm.Print_Area" localSheetId="${i}">${quoted}!$A$1:$${lastColumn}$${lastRow}</definedName>`;
        }).join("");
        addText("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews><sheets>${sheets.map((sheet, i) => `<sheet name="${xml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets><definedNames>${definedNames}</definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`);
        addText("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
        addText("xl/styles.xml", workbookStyles);
        sheets.forEach((sheet, i) => {
            addText(`xl/worksheets/sheet${i + 1}.xml`, worksheetXml(sheet, i + 1));
            addText(`xl/worksheets/_rels/sheet${i + 1}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table${i + 1}.xml"/></Relationships>`);
            addText(`xl/tables/table${i + 1}.xml`, tableXml(sheet, i + 1));
        });
        return new Blob([zipFiles(entries)], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    }

    async function photoFile(student, studentName) {
        const source = String(student.photo || "").trim();
        if (!/^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(source) && !/^https:\/\//i.test(source)) return null;
        const response = await fetch(source);
        if (!response.ok) throw new Error("Photo could not be fetched");
        const blob = await response.blob();
        const type = blob.type.toLowerCase().split(";")[0];
        const extension = { "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp" }[type];
        if (!extension || !blob.size) throw new Error("Unsupported or empty photo");
        return { name:cleanName(studentName), extension, bytes:new Uint8Array(await blob.arrayBuffer()) };
    }

    async function photosZip(students, nameForStudent, onProgress=()=>{}) {
        const files = [], usedNames = new Map(), skipped = [];
        for (let index = 0; index < students.length; index++) {
            const student = students[index];
            try {
                const file = await photoFile(student, nameForStudent(student));
                if (!file) {
                    skipped.push(student);
                } else {
                    const count = (usedNames.get(file.name) || 0) + 1;
                    usedNames.set(file.name, count);
                    files.push({ name:`${file.name}${count > 1 ? ` (${count})` : ""}.${file.extension}`, bytes:file.bytes });
                }
            } catch {
                skipped.push(student);
            }
            onProgress(index + 1, students.length);
        }
        return { blob:files.length ? zipFiles(files) : null, count:files.length, skipped };
    }

    window.StudentExport = Object.freeze({ photosZip, cleanName, styledWorkbook });
})();
