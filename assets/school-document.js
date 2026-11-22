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

    window.SchoolDocument = Object.freeze({ DEPARTMENT, SCHOOL, PLACE, header, footer, css, excelHeaderLines, khmerDigits });

    // On-screen previews (e.g. the class roster in Reports) use the same styles.
    if (typeof document !== "undefined" && document.head && !document.getElementById("school-document-style")) {
        const style = document.createElement("style");
        style.id = "school-document-style";
        style.textContent = css();
        document.head.append(style);
    }
})();
