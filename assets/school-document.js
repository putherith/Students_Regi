/* Ministry/school standard layout shared by every printed list and report.
   Header: kingdom motto centred with the traditional ornament; department and
   school on the left. Footer: lunar and solar date above the preparer's
   signature on the right, the principal's approval on the left. Black and
   white with a light grey table header so it prints and copies cleanly. */
(function () {
    "use strict";

    const DEPARTMENT = "មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តតាកែវ";
    const SCHOOL = "វិទ្យាល័យសុខអានព្រៃមេលង";
    const PLACE = "ព្រៃមេលង";
    const KINGDOM = "ព្រះរាជាណាចក្រកម្ពុជា";
    const NATION = "ជាតិ សាសនា ព្រះមហាក្សត្រ";
    const LUNAR_BLANK = "ថ្ងៃ............ ខែ............ ឆ្នាំ............ ព.ស. ............";
    const BLANK_NAME = "................................";

    const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    })[char]);
    const khmerDigits = value => String(value ?? "").replace(/\d/g, digit => "០១២៣៤៥៦៧៨៩"[Number(digit)]);

    const ornament = `<svg class="sd-ornament" viewBox="0 0 170 12" aria-hidden="true"><path d="M4 6h162M45 4h80M45 8h80"/><path d="m63 6 5-3 5 3-5 3Zm12 0 5-4 5 4-5 4Zm12 0 5-4 5 4-5 4Zm12 0 5-3 5 3-5 3Z"/></svg>`;

    /* lines: extra left-block lines under the school (e.g. the class). */
    function header({ title, subtitle = "", lines = [] } = {}) {
        const extra = lines.filter(Boolean).map(line => `<div>${escape(line)}</div>`).join("");
        return `<header class="sd-header">
            <div class="sd-kingdom"><div>${KINGDOM}</div><div>${NATION}</div>${ornament}</div>
            <div class="sd-school"><div>${DEPARTMENT}</div><div>${SCHOOL}</div>${extra}</div>
        </header>
        ${title ? `<h1 class="sd-title">${escape(title)}</h1>` : ""}
        ${subtitle ? `<p class="sd-subtitle">${escape(subtitle)}</p>` : ""}`;
    }

    /* signatures: [{ lines:["បានឃើញ និងឯកភាព","នាយកសាលា"], name }, { lines:[...], name, dated:true }]
       The dated signature (the preparer) gets the lunar and solar date above it. */
    function footer({ note = "", signatures = [], year = new Date().getFullYear(), lunar = "" } = {}) {
        const columns = signatures.length || 1;
        const cells = signatures.map(signature => `<div class="sd-signature${signature.dated ? " sd-dated" : ""}">
                ${signature.dated ? `<div class="sd-date"><div>${escape(lunar || LUNAR_BLANK)}</div><div>${PLACE}, ថ្ងៃទី........ ខែ.............. ឆ្នាំ${khmerDigits(year)}</div></div>` : `<div class="sd-date" aria-hidden="true"></div>`}
                <div class="sd-signature-title">${(signature.lines || []).map(line => `<div>${escape(line)}</div>`).join("")}</div>
                <div class="sd-signature-name">${escape(signature.name || BLANK_NAME)}</div>
            </div>`).join("");
        return `<footer class="sd-footer">
            ${note ? `<div class="sd-note">${note}</div>` : ""}
            ${signatures.length ? `<div class="sd-signatures" style="grid-template-columns:repeat(${columns},1fr)">${cells}</div>` : ""}
        </footer>`;
    }

    function css() {
        return `
            .sd-header { position:relative; min-height:17mm; margin:0 0 1.5mm; color:#000; }
            .sd-kingdom { width:62%; margin:0 auto; text-align:center; font:10.5pt/1.75 "Khmer OS Muol Light","Moul",serif; }
            .sd-ornament { display:block; width:30mm; height:2.4mm; margin:.4mm auto 0; fill:none; stroke:#000; stroke-width:.9; }
            .sd-school { position:absolute; left:0; top:5.8mm; text-align:center; font:9.5pt/1.75 "Khmer OS Muol Light","Moul",serif; }
            .sd-title { margin:1mm 0 .5mm; color:#000; text-align:center; font:12.5pt/1.7 "Khmer OS Muol Light","Moul",serif; font-weight:400; }
            .sd-subtitle { margin:0 0 2.5mm; color:#000; text-align:center; font:700 10pt/1.5 "Khmer OS Siemreap","Siemreap",sans-serif; }
            .sd-table { width:100%; border-collapse:collapse; table-layout:fixed; }
            .sd-table th, .sd-table td { border:.25mm solid #000; color:#000; vertical-align:middle; }
            .sd-table th { background:#e6e6e6; text-align:center; font-weight:700; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
            .sd-table thead { display:table-header-group; }
            .sd-table tr { break-inside:avoid; page-break-inside:avoid; }
            .sd-group-row td { background:#f2f2f2; font-weight:700; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
            .sd-footer { margin-top:3mm; color:#000; font:9.5pt/1.5 "Khmer OS Siemreap","Siemreap",sans-serif; break-inside:avoid; page-break-inside:avoid; }
            .sd-note { margin:0 0 2mm; }
            .sd-signatures { display:grid; gap:6mm; text-align:center; }
            .sd-date { min-height:10.5mm; font-size:9pt; line-height:1.6; }
            .sd-signature-title { font:9.5pt/1.75 "Khmer OS Muol Light","Moul",serif; }
            .sd-signature { display:flex; flex-direction:column; }
            .sd-signature-name { margin-top:auto; padding-top:14mm; font-weight:700; }
        `;
    }

    /* Top rows for Excel sheets, matching the ministry workbook layout. */
    function excelHeaderLines() {
        return [KINGDOM, NATION, "✥✥✥", DEPARTMENT, SCHOOL];
    }

    /* ---- Student list: the school's class-list form (see the Digital Class print) ----
       Offices on the left, kingdom on the right, one flowing table whose header repeats
       on every printed page, a total row, then the dated signatures. Khmer digits
       everywhere except the dates of birth and phone numbers. */
    const LIST_OFFICE_LINES = ["មន្ទីរអប់រំ យុវជន និងកីឡា ខេត្តតាកែវ", "ការិយាល័យអប់រំ យុវជន និងកីឡា ស្រុកកោះអណ្តែត", "វិទ្យាល័យ សុខអាន ព្រៃមេលង"];
    const LIST_KINGDOM_LINES = [KINGDOM, NATION, "❖ ❖ ❖"];
    const KHMER_MONTHS = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];

    /* "ធ្វើនៅព្រៃមេលង, ថ្ងៃទី ២៧ ខែវិច្ឆិកា ឆ្នាំ២០២៦" for the given date (default: today). */
    function listDateLine(date = new Date()) {
        const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
        return `ធ្វើនៅ${PLACE}, ថ្ងៃទី ${khmerDigits(String(d.getDate()).padStart(2, "0"))} ខែ${KHMER_MONTHS[d.getMonth()]} ឆ្នាំ${khmerDigits(d.getFullYear())}`;
    }

    /* columns: [{ header, width (%), align:"left"|"center" }]; rows: arrays of cell text (already formatted).
       The first column is the row number (pass Khmer digits); dates of birth stay as given. */
    function studentList({ title = "បញ្ជីឈ្មោះសិស្ស", subtitle = "", columns = [], rows = [], total = 0, female = 0, male = 0,
        principal = "", teacherTitle = "គ្រូបន្ទុកថ្នាក់", teacher = "", date = new Date(), emptyText = "មិនមានសិស្ស" } = {}) {
        const colgroup = `<colgroup>${columns.map(column => `<col style="width:${Number(column.width) || 10}%">`).join("")}</colgroup>`;
        const head = `<tr>${columns.map(column => `<th>${escape(column.header)}</th>`).join("")}</tr>`;
        const body = rows.length ? rows.map(cells => `<tr>${columns.map((column, index) =>
            `<td class="${column.align === "left" ? "sl-left" : "sl-center"}">${escape(cells[index] ?? "")}</td>`).join("")}</tr>`).join("")
            : `<tr><td class="sl-center" colspan="${columns.length}">${escape(emptyText)}</td></tr>`;
        const totalRow = `<tr class="sl-total"><td colspan="2" class="sl-center">សរុប</td><td colspan="${Math.max(1, columns.length - 2)}" class="sl-center">${khmerDigits(total)} នាក់</td></tr>`;
        return `<section class="sl-page">
            <header class="sl-head">
                <div class="sl-office">${LIST_OFFICE_LINES.map(line => `<div>${line}</div>`).join("")}</div>
                <div class="sl-kingdom">${LIST_KINGDOM_LINES.map((line, index) => `<div${index === 2 ? ' class="sl-ornament"' : ""}>${line}</div>`).join("")}</div>
            </header>
            <h1 class="sl-title">${escape(title)}</h1>
            ${subtitle ? `<p class="sl-subtitle">${escape(subtitle)}</p>` : ""}
            <table class="sl-table">${colgroup}<thead>${head}</thead><tbody>${body}${totalRow}</tbody></table>
            <p class="sl-breakdown">ក្នុងនោះ ស្រី ${khmerDigits(female)} នាក់ · ប្រុស ${khmerDigits(male)} នាក់</p>
            <div class="sl-signatures">
                <div class="sl-sign sl-sign-left"><div>បានឃើញ និងឯកភាព</div><div>នាយកសាលា</div><div class="sl-sign-name">${escape(principal)}</div></div>
                <div class="sl-sign"><div>${listDateLine(date)}</div><div>${escape(teacherTitle)}</div><div class="sl-sign-name">${escape(teacher)}</div></div>
            </div>
        </section>`;
    }

    function studentListCss() {
        return `
            .sl-page { color:#000; font:11pt/1.5 "Khmer OS Siemreap","Siemreap",sans-serif; break-after:page; page-break-after:always; }
            .sl-page:last-child { break-after:auto; page-break-after:auto; }
            .sl-head { display:flex; justify-content:space-between; align-items:flex-start; padding:3mm 22mm 0 11mm; }
            .sl-office { text-align:center; font-size:10.5pt; line-height:1.55; }
            .sl-kingdom { text-align:center; font:10.5pt/1.75 "Khmer OS Muol Light","Moul",serif; }
            .sl-kingdom .sl-ornament { font:10pt/1.8 "Khmer OS Siemreap","Siemreap",sans-serif; letter-spacing:.6mm; }
            .sl-title { margin:7mm 0 0; text-align:center; font:13pt/1.7 "Khmer OS Muol Light","Moul",serif; font-weight:400; }
            .sl-subtitle { margin:0 0 2mm; text-align:center; font-size:10.5pt; }
            .sl-table { width:100%; border-collapse:collapse; table-layout:fixed; }
            .sl-table thead { display:table-header-group; }
            .sl-table tr { break-inside:avoid; page-break-inside:avoid; }
            .sl-table th, .sl-table td { height:7.4mm; padding:0 1.6mm; border:.25mm solid #000; background:#fff; color:#000; font-size:10.5pt; font-weight:400; line-height:1.3; vertical-align:middle; overflow:hidden; white-space:nowrap; text-overflow:clip; }
            .sl-table th { text-align:center; }
            .sl-table .sl-left { text-align:left; }
            .sl-table .sl-center { text-align:center; }
            .sl-breakdown { margin:1mm 0 0; font-size:10.5pt; break-after:avoid; page-break-after:avoid; }
            .sl-signatures { display:grid; grid-template-columns:1fr 1fr; margin-top:6mm; text-align:center; font-size:10.5pt; line-height:1.6; break-inside:avoid; page-break-inside:avoid; }
            .sl-sign-left { padding-top:1.6em; }
            .sl-sign-name { margin-top:17mm; }
        `;
    }

    window.SchoolDocument = Object.freeze({ DEPARTMENT, SCHOOL, PLACE, header, footer, css, excelHeaderLines, khmerDigits,
        LIST_OFFICE_LINES, LIST_KINGDOM_LINES, listDateLine, studentList, studentListCss });

    // On-screen previews (e.g. the class roster in Reports) use the same styles.
    if (typeof document !== "undefined" && document.head && !document.getElementById("school-document-style")) {
        const style = document.createElement("style");
        style.id = "school-document-style";
        style.textContent = css() + studentListCss();
        document.head.append(style);
    }
})();
