/* Read-only, five-column class list for A4 printing. */
(function () {
    "use strict";

    const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    })[char]);
    const perPage = 34; // rows on a page with the standard header only
    const lastPageRows = 28; // rows that still leave room for the signature block

    function printHtml({ className, academicYear, students, teacher="", principal="", year=new Date().getFullYear() }) {
        const name = String(className || "").trim();
        if (!name || !Array.isArray(students)) throw new Error("សូមជ្រើសថ្នាក់សម្រាប់បោះពុម្ព");
        // The last page also carries the signatures, so it holds fewer rows.
        const chunks = [];
        for (let rest = students.length; rest > lastPageRows;) {
            const take = rest > perPage + lastPageRows ? perPage : Math.max(rest - lastPageRows, Math.ceil(rest / 2));
            chunks.push(take);
            rest -= take;
        }
        chunks.push(students.length - chunks.reduce((sum, size) => sum + size, 0));
        const totalPages = chunks.length;
        const male = students.filter(student => student.gender === "ប្រុស").length;
        const female = students.filter(student => student.gender === "ស្រី").length;
        const pages = chunks.map((size, page) => {
            const offset = chunks.slice(0, page).reduce((sum, value) => sum + value, 0);
            const rows = students.slice(offset, offset + size).map((student, index) =>
                `<tr><td class="number">${offset + index + 1}</td><td class="roster-fit-cell name"><span class="roster-fit-text">${escape(student.name)}</span></td><td class="gender">${escape(student.gender)}</td><td class="dob">${escape(student.dob)}</td><td class="contact">${escape(student.contact)}</td></tr>`
            ).join("");
            const doc = window.SchoolDocument;
            const khmer = doc.khmerDigits;
            const last = page === totalPages - 1;
            return `<section class="school-roster-page simple-roster-page">
                ${doc.header({ title:`បញ្ជីឈ្មោះសិស្សថ្នាក់ ${name}`, subtitle:`ឆ្នាំសិក្សា ${academicYear || "—"}` })}
                <table class="simple-roster-table sd-table"><colgroup><col style="width:7%"><col style="width:45%"><col style="width:9%"><col style="width:20%"><col style="width:19%"></colgroup><thead><tr><th>ល.រ</th><th>ឈ្មោះសិស្ស</th><th>ភេទ</th><th>ថ្ងៃខែឆ្នាំកំណើត</th><th>លេខទំនាក់ទំនង</th></tr></thead><tbody>${rows}</tbody></table>
                ${doc.footer({
                    note:`* សរុប ${khmer(students.length)} នាក់ · ប្រុស ${khmer(male)} · ស្រី ${khmer(female)}${totalPages > 1 ? ` · ទំព័រ ${khmer(page + 1)}/${khmer(totalPages)}` : ""}`,
                    year,
                    signatures:last ? [
                        { lines:["បានឃើញ និងឯកភាព", "នាយកសាលា"], name:principal },
                        { lines:["គ្រូបន្ទុកថ្នាក់"], name:teacher, dated:true }
                    ] : []
                })}
            </section>`;
        });
        return `<style>
            @page{size:A4 portrait;margin:8mm}
            .simple-roster-page{width:194mm;max-width:none;min-width:0;min-height:0;margin:0;padding:0;color:#172331;background:#fff;box-shadow:none;break-after:page;page-break-after:always;break-inside:avoid;font-family:"Khmer OS Siemreap","Siemreap",sans-serif}
            .simple-roster-page:last-child{break-after:auto;page-break-after:auto}
            ${window.SchoolDocument.css()}
            .simple-roster-page{display:flex;flex-direction:column;min-height:281mm}
            .simple-roster-page .sd-footer{margin-top:auto}
            .simple-roster-table{width:100%;table-layout:fixed;border-collapse:collapse}
            .simple-roster-table th,.simple-roster-table td{height:5.4mm;padding:.35mm 1.2mm;border:.25mm solid #000;background:#fff;color:#000;font-size:9pt;line-height:1.2;vertical-align:middle;overflow:hidden;white-space:nowrap}
            .simple-roster-table td.name{text-align:left}
            .simple-roster-table td.name .roster-fit-text{font-size:12px;font-weight:600}
            .simple-roster-table th{height:8mm;text-align:center;font-weight:700;white-space:normal;background:#e6e6e6;print-color-adjust:exact;-webkit-print-color-adjust:exact}
            .simple-roster-table .number,.simple-roster-table .gender,.simple-roster-table .dob,.simple-roster-table .contact{text-align:center}
            .simple-roster-table .roster-fit-text{display:inline-block;white-space:nowrap;transform-origin:left center}
            @media screen{body{background:#eaf0f5}.simple-roster-page{width:210mm;min-height:297mm;margin:0 auto 14px;padding:8mm;box-shadow:0 5px 20px #14263822}}
        </style>${pages.join("")}`;
    }

    window.StudentSimpleClassRoster = Object.freeze({ printHtml, perPage });
})();

