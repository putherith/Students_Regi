/* Read-only, five-column class list for A4 printing. */
(function () {
    "use strict";

    const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    })[char]);
    const perPage = 40;

    function printHtml({ className, academicYear, students, schoolName="វិទ្យាល័យសុខអានព្រៃមេលង" }) {
        const name = String(className || "").trim();
        if (!name || !Array.isArray(students)) throw new Error("សូមជ្រើសថ្នាក់សម្រាប់បោះពុម្ព");
        const totalPages = Math.max(1, Math.ceil(students.length / perPage));
        const male = students.filter(student => student.gender === "ប្រុស").length;
        const female = students.filter(student => student.gender === "ស្រី").length;
        const pages = Array.from({length:totalPages}, (_, page) => {
            const offset = page * perPage;
            const rows = students.slice(offset, offset + perPage).map((student, index) =>
                `<tr><td class="number">${offset + index + 1}</td><td class="roster-fit-cell name"><span class="roster-fit-text">${escape(student.name)}</span></td><td class="gender">${escape(student.gender)}</td><td class="dob">${escape(student.dob)}</td><td class="contact">${escape(student.contact)}</td></tr>`
            ).join("");
            return `<section class="school-roster-page simple-roster-page">
                <header class="simple-roster-header"><div>ក្រសួងអប់រំ យុវជន និងកីឡា<br>មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តតាកែវ<br><strong>${escape(schoolName)}</strong></div><div class="kingdom">ព្រះរាជាណាចក្រកម្ពុជា<br>ជាតិ សាសនា ព្រះមហាក្សត្រ</div></header>
                <h1>បញ្ជីឈ្មោះសិស្សថ្នាក់ ${escape(name)}</h1>
                <p class="simple-roster-year">ឆ្នាំសិក្សា ${escape(academicYear || "—")}</p>
                <table class="simple-roster-table"><colgroup><col style="width:7%"><col style="width:45%"><col style="width:9%"><col style="width:20%"><col style="width:19%"></colgroup><thead><tr><th>ល.រ</th><th>ឈ្មោះសិស្ស</th><th>ភេទ</th><th>ថ្ងៃខែឆ្នាំកំណើត</th><th>លេខទំនាក់ទំនង</th></tr></thead><tbody>${rows}</tbody></table>
                <footer>សរុប ${students.length} នាក់ · ប្រុស ${male} · ស្រី ${female}<span>ទំព័រ ${page + 1} / ${totalPages}</span></footer>
            </section>`;
        });
        return `<style>
            @page{size:A4 portrait;margin:8mm}
            .simple-roster-page{width:194mm;max-width:none;min-width:0;min-height:0;margin:0;padding:0;color:#172331;background:#fff;box-shadow:none;break-after:page;page-break-after:always;break-inside:avoid;font-family:"Khmer OS Siemreap","Siemreap",sans-serif}
            .simple-roster-page:last-child{break-after:auto;page-break-after:auto}
            .simple-roster-header{display:grid;grid-template-columns:1fr 1fr;gap:8mm;min-height:23mm;font-size:9pt;line-height:1.55}
            .simple-roster-header .kingdom{text-align:center;font-weight:700}
            .simple-roster-page h1{margin:0;text-align:center;font-size:12pt;line-height:1.45}
            .simple-roster-year{margin:0 0 4mm;text-align:center;font-size:9pt}
            .simple-roster-table{width:100%;table-layout:fixed;border-collapse:collapse}
            .simple-roster-table th,.simple-roster-table td{height:5.4mm;padding:.35mm 1.2mm;border:.2mm solid #34465b;background:#fff;color:#172331;font-size:9pt;line-height:1.2;vertical-align:middle;overflow:hidden;white-space:nowrap}
            .simple-roster-table td.name .roster-fit-text{font-size:12px;font-weight:600}
            .simple-roster-table th{height:8mm;text-align:center;font-weight:700;white-space:normal;background:#e9f2f6}
            .simple-roster-table .number,.simple-roster-table .gender,.simple-roster-table .dob,.simple-roster-table .contact{text-align:center}
            .simple-roster-table .roster-fit-text{display:inline-block;white-space:nowrap;transform-origin:left center}
            .simple-roster-page footer{display:flex;justify-content:space-between;gap:10mm;margin-top:3mm;font-size:8pt}
            @media screen{body{background:#eaf0f5}.simple-roster-page{width:210mm;min-height:297mm;margin:0 auto 14px;padding:8mm;box-shadow:0 5px 20px #14263822}}
        </style>${pages.join("")}`;
    }

    window.StudentSimpleClassRoster = Object.freeze({ printHtml, perPage });
})();

