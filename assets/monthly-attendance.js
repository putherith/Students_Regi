/* Blank monthly register: generated from the in-memory class roster; never writes attendance data. */
(function () {
    "use strict";
    const months = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
    const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);

    function validate(year, month) {
        const y = Number(year), m = Number(month);
        if (!Number.isInteger(y) || y < 2000 || y > 2100 || !Number.isInteger(m) || m < 1 || m > 12) {
            throw new Error("សូមជ្រើសខែ និងឆ្នាំត្រឹមត្រូវ");
        }
        return { year:y, month:m, days:new Date(y, m, 0).getDate() };
    }

    function excelSpec({ className, year, month, teacher="", students=[] }) {
        const period = validate(year, month);
        const columns = [
            {header:"ល.រ", width:6, type:"integer"},
            {header:"អត្តលេខ", width:16, type:"code", align:"center"},
            {header:"គោត្តនាម និងនាម", width:25},
            {header:"ភេទ", width:8, align:"center"},
            ...Array.from({length:31}, (_, index) => ({header:String(index + 1), width:5, align:"center"}))
        ];
        const rows = students.map((student, index) => [
            index + 1, String(student.code || ""), String(student.name || ""), String(student.gender || ""),
            ...Array.from({length:31}, (_, day) => day + 1 > period.days ? "—" : "")
        ]);
        return {
            title:`តារាងវត្តមានប្រចាំខែ ${months[period.month - 1]} ${period.year}`,
            sheets:[{
                name:`វត្តមាន ${className} ${period.month}-${period.year}`,
                title:`តារាងវត្តមានប្រចាំខែ ${months[period.month - 1]} ${period.year}`,
                subtitle:`វិទ្យាល័យសុខអានព្រៃមេលង · ថ្នាក់ ${className}`,
                meta:`គ្រូបន្ទុកថ្នាក់ ${teacher || "........................"} · សិស្ស ${students.length} នាក់ · ថ្ងៃទី ១–៣១ (ថ្ងៃមិនមានក្នុងខែសម្គាល់ —)`,
                columns, rows, paperSize:8, fitToWidth:2
            }]
        };
    }

    function printHtml({ className, year, month, teacher="", students=[] }) {
        const period = validate(year, month);
        const perPage = 24;
        const chunks = Math.max(1, Math.ceil(students.length / perPage));
        const halves = [[1,16],[17,31]];
        const pages = [];
        for (let chunk = 0; chunk < chunks; chunk++) {
            const batch = students.slice(chunk * perPage, (chunk + 1) * perPage);
            for (const [first,last] of halves) {
                const pageNumber = pages.length + 1;
                const days = Array.from({length:last - first + 1}, (_, index) => first + index);
                const head = days.map(day => `<th class="attendance-day${day > period.days ? " unavailable" : ""}">${day}</th>`).join("");
                const body = batch.map((student, index) => `<tr><td class="number">${chunk * perPage + index + 1}</td><td class="code">${escape(student.code)}</td><td class="name">${escape(student.name)}</td><td class="gender">${escape(student.gender)}</td>${days.map(day => `<td class="mark${day > period.days ? " unavailable" : ""}">${day > period.days ? "—" : ""}</td>`).join("")}</tr>`).join("");
                pages.push(`<section class="attendance-page">
                    <header><div>មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តតាកែវ<br><strong>វិទ្យាល័យសុខអានព្រៃមេលង</strong></div><div class="kingdom">ព្រះរាជាណាចក្រកម្ពុជា<br>ជាតិ សាសនា ព្រះមហាក្សត្រ</div></header>
                    <h1>តារាងវត្តមានសិស្សប្រចាំខែ ${escape(months[period.month - 1])} ឆ្នាំ ${period.year}</h1>
                    <div class="attendance-meta"><span>ថ្នាក់ ${escape(className)} · គ្រូបន្ទុក ${escape(teacher || "........................")}</span><span>ថ្ងៃទី ${first}–${last} · ទំព័រ ${pageNumber}/${chunks * 2}</span></div>
                    <table><colgroup><col class="number-col"><col class="code-col"><col class="name-col"><col class="gender-col">${days.map(() => "<col>").join("")}</colgroup><thead><tr><th>ល.រ</th><th>អត្តលេខ</th><th>គោត្តនាម និងនាម</th><th>ភេទ</th>${head}</tr></thead><tbody>${body || `<tr><td colspan="${days.length + 4}">មិនមានសិស្សក្នុងថ្នាក់នេះ</td></tr>`}</tbody></table>
                    <footer><span>សិស្សសរុប ${students.length} នាក់ · ថ្ងៃគ្មានក្នុងខែសម្គាល់ —</span><span>គ្រូបន្ទុកថ្នាក់៖ .................................</span></footer>
                </section>`);
            }
        }
        return `<style>
            @page{size:A4 landscape;margin:8mm}
            .attendance-page{width:100%;min-height:184mm;break-after:page;page-break-after:always;color:#14263a;font:10px/1.4 "Khmer OS Siemreap","Siemreap",sans-serif}
            .attendance-page:last-child{break-after:auto;page-break-after:auto}
            .attendance-page header{display:flex;justify-content:space-between;gap:20mm;min-height:17mm;font-size:10px}
            .attendance-page .kingdom{text-align:center;font-weight:700}
            .attendance-page h1{margin:1mm 0 2mm;text-align:center;font-size:15px}
            .attendance-meta{display:flex;justify-content:space-between;gap:10mm;margin:0 0 2mm;font-weight:700}
            .attendance-page table{width:100%;table-layout:fixed;border-collapse:collapse}
            .attendance-page col.number-col{width:3.5%}.attendance-page col.code-col{width:10%}.attendance-page col.name-col{width:20.5%}.attendance-page col.gender-col{width:4%}
            .attendance-page th,.attendance-page td{height:5.6mm;padding:0 .6mm;border:1px solid #6b7f91;text-align:center;vertical-align:middle;font-size:9px;line-height:1.2}
            .attendance-page th{background:#e8f1f8;font-weight:700}.attendance-page td.name{text-align:left;padding-left:1.3mm;white-space:nowrap}
            .attendance-page .unavailable{background:#e9edf0;color:#8796a2}
            .attendance-page footer{display:flex;justify-content:space-between;gap:10mm;margin-top:3mm;font-size:9px}
            @media screen{.attendance-page{width:281mm;min-height:194mm;margin:0 auto 20px;padding:4mm;background:#fff;box-shadow:0 5px 20px #10243e22}}
            @media print{.attendance-page{min-height:0}.attendance-page th{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
        </style>${pages.join("")}`;
    }

    window.StudentMonthlyAttendance = Object.freeze({ months, validate, excelSpec, printHtml });
})();
