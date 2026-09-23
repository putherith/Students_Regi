/* Reference artwork coordinates, scaled only at the outer print boundary. */
(function () {
    const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    const khmer = value => String(value).replace(/\d/g, d => "០១២៣៤៥៦៧៨៩"[Number(d)]);
    const months = ["មករា","កុម្ភៈ","មីនា","មេសា","ឧសភា","មិថុនា","កក្កដា","សីហា","កញ្ញា","តុលា","វិច្ឆិកា","ធ្នូ"];
    function birthDate(value) {
        const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
        return match && Number(match[2]) >= 1 && Number(match[2]) <= 12
            ? `${khmer(Number(match[3]))}-${months[Number(match[2])-1]}-${khmer(match[1])}` : value || "";
    }
    function address(student, prefix) {
        return ["Village","Commune","District","Province"].map(part => student[prefix + part]).filter(Boolean).join(" ");
    }
    const blank = "........................";
    function render(students, settings, logoUrl, academicYear) {
        const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(settings.issueDate || "");
        const artworkScaleX = 74.24 * 96 / 25.4 / 584;
        const artworkScaleY = 99.24 * 96 / 25.4 / 608;
        const dateDay = date ? khmer(Number(date[3])) : "................";
        const dateMonth = date ? khmer(Number(date[2])) : "................";
        const dateYear = date ? khmer(date[1]) : "................";
        const cards = students.map(s => `<article class="certificate-student-card" aria-label="កាតសិស្ស ${escape(s.studentName)}">
          <div class="reference-artwork">
            <img class="card-watermark" src="${escape(logoUrl)}" alt="">
            <img class="card-logo" src="${escape(logoUrl)}" alt="ក្រសួងអប់រំ យុវជន និងកីឡា">
            <div class="card-school-heading">
              <div>ក្រសួងអប់រំ យុវជន និងកីឡា</div>
              <div>មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តតាកែវ</div>
              <div>វិទ្យាល័យសុខអានព្រៃមេលង</div>
            </div>
            <div class="card-kingdom"><div>ព្រះរាជាណាចក្រកម្ពុជា</div><div>ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
              <svg class="kingdom-ornament" viewBox="0 0 170 12" aria-hidden="true"><path d="M4 6h162M45 4h80M45 8h80"/><path d="m63 6 5-3 5 3-5 3Zm12 0 5-4 5 4-5 4Zm12 0 5-4 5 4-5 4Zm12 0 5-3 5 3-5 3Z"/></svg>
            </div>
            <div class="reference-card-title" data-card-fit>ប័ណ្ណសម្គាល់ខ្លួនសិស្ស ឆ្នាំសិក្សា ${escape(academicYear)}</div>
            <div class="card-line identity-line"><span>គោត្តនាម និងនាម</span><strong data-card-fit>${escape(s.studentName || blank)}</strong><span>ភេទ</span><strong data-card-fit>${escape(s.gender || blank)}</strong></div>
            <div class="card-line birth-line"><span>ថ្ងៃខែឆ្នាំកំណើត</span><strong class="latin-value" data-card-fit>${escape(birthDate(s.dob) || blank)}</strong><span>ថ្នាក់ទី</span><strong class="latin-value" data-card-fit>${escape(s.className || blank)}</strong></div>
            <div class="card-line address-line birth-address"><span>ទីកន្លែងកំណើត</span><strong data-card-fit>${escape(address(s,"pob") || blank)}</strong></div>
            <div class="card-line address-line current-address"><span>អាសយដ្ឋានបច្ចុប្បន្ន</span><strong data-card-fit>${escape(address(s,"current") || blank)}</strong></div>
            <div class="card-line contacts-line"><span>លេខទូរសព្ទនាយក</span><strong class="latin-value" data-card-fit>${escape(settings.principalPhone || blank)}</strong><span>លេខទូរសព្ទ ICT</span><strong class="latin-value" data-card-fit>${escape(settings.ictPhone || blank)}</strong></div>
            <div class="reference-photo-box"><div class="card-id-code" data-card-fit>${escape(s.studentCode || s.studentId || "")}</div><div class="card-photo-slot">${s.photo ? `<img src="${escape(s.photo)}" alt="រូបថតសិស្ស" data-card-photo>` : "<span>3X4</span>"}</div></div>
            <div class="family-line father-line"><strong data-card-fit>ឪពុក៖ ${escape(s.fatherName || blank)}</strong><span>លេខទូរសព្ទ៖</span><strong class="latin-value" data-card-fit>${escape(s.fatherPhone || blank)}</strong></div>
            <div class="family-line mother-line"><strong data-card-fit>ម្តាយ៖ ${escape(s.motherName || blank)}</strong><span>លេខទូរសព្ទ៖</span><strong class="latin-value" data-card-fit>${escape(s.motherPhone || blank)}</strong></div>
            <div class="reference-lunar-date" data-card-fit><span>${escape(settings.cardLunarDate || "....................ខែ....................ឆ្នាំ....................ព.ស............")}</span></div>
            <div class="reference-solar-date">ថ្ងៃទី<span>${dateDay}</span>ខែ<span>${dateMonth}</span>ឆ្នាំ${dateYear}<span>............</span></div>
            <div class="reference-principal"><div>នាយក</div>${settings.principalName ? `<strong data-card-fit>${escape(settings.principalName)}</strong>` : ""}</div>
          </div>
        </article>`).join("");
        return `<style>
          @page { size:A4 landscape; margin:4mm; }
          body { background:#fff; }
          .cards-grid { display:grid; grid-template-columns:repeat(3,75mm); gap:2mm; justify-content:center; align-items:start; }
          .certificate-student-card { position:relative; width:75mm; height:100mm; border:.38mm solid #1717ff; background:#fff; box-sizing:border-box; overflow:hidden; break-inside:avoid; page-break-inside:avoid; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
          .reference-artwork { --card-body:"Khmer OS Siemreap","KhmerOSSiemreap","Siemreap",sans-serif; --card-heading:"Khmer OS Muol Light","Khmer OS Moul","Moul",serif; position:relative; width:584px; height:608px; transform-origin:top left; transform:scale(${artworkScaleX.toFixed(9)},${artworkScaleY.toFixed(9)}); color:#102932; font:18px/1.65 var(--card-body); }
          .reference-artwork * { box-sizing:border-box; }
          .reference-artwork strong { color:#1111ff; font-weight:400; }
          .card-watermark { position:absolute; left:78px; top:90px; width:410px; height:420px; object-fit:fill; opacity:.13; }
          .card-logo { position:absolute; left:96px; top:15px; width:54px; height:73px; object-fit:contain; }
          .card-school-heading { position:absolute; left:22px; top:86px; width:325px; font:16.5px/2.02 var(--card-heading); white-space:nowrap; }
          .card-kingdom { position:absolute; left:331px; top:15px; width:226px; text-align:center; font:16.5px/2.02 var(--card-heading); white-space:nowrap; }
          .kingdom-ornament { display:block; width:158px; height:12px; margin:13px auto 0; fill:none; stroke:#637b85; stroke-width:1; }
          .reference-card-title { position:absolute; left:24px; top:183px; width:536px; height:41px; text-align:center; font:20px/1.9 var(--card-heading); color:#b96900; white-space:nowrap; }
          .card-line { position:absolute; left:22px; width:542px; display:grid; align-items:center; column-gap:8px; min-height:32px; grid-template-columns:132px 188px 74px 124px; }
          .card-line > *, .family-line > * { min-width:0; white-space:nowrap; }
          .card-line strong { font-size:18px; }
          .identity-line { top:222px; }
          .birth-line { top:257px; }
          .identity-line > :last-child, .birth-line > :last-child { text-align:center; }
          .address-line { grid-template-columns:132px 402px; }
          .birth-address { top:291px; }
          .current-address { top:325px; }
          .contacts-line { top:359px; grid-template-columns:153px 120px 146px 99px; }
          .latin-value { font-family:Arial,sans-serif; font-size:16px !important; font-weight:700 !important; }
          .reference-photo-box { position:absolute; left:17px; top:388px; width:142px; height:180px; border:2px solid #5585ff; display:grid; grid-template-rows:33px minmax(0,1fr); }
          .card-id-code { border-bottom:2px solid #5585ff; color:#152932; text-align:center; font:bold 16px/31px "Times New Roman",serif; white-space:nowrap; }
          .card-photo-slot { position:relative; min-height:0; display:grid; place-items:center; overflow:hidden; background:#3b86ee; color:#111; font:16px Arial,sans-serif; }
          .card-photo-slot img { position:absolute; inset:0; display:block; width:100%; height:100%; object-fit:contain; object-position:center bottom; }
          .family-line { position:absolute; left:163px; width:410px; display:grid; grid-template-columns:138px 126px 130px; column-gap:8px; align-items:center; min-height:32px; }
          .father-line { top:393px; }
          .mother-line { top:428px; }
          .reference-lunar-date { position:absolute; left:163px; top:462px; width:412px; white-space:nowrap; font-size:17px; text-align:center; }
          .reference-solar-date { position:absolute; left:236px; top:497px; width:339px; display:flex; white-space:nowrap; align-items:baseline; font-size:17px; }
          .reference-solar-date span { flex:1; text-align:center; border-bottom:1px dotted #263238; }
          .reference-principal { position:absolute; top:537px; left:274px; width:188px; text-align:center; font:18px/1.7 var(--card-heading); }
          .reference-principal strong { display:block; font:18px/1.7 var(--card-body); white-space:nowrap; }
          @media print { .cards-grid { gap:2mm; } }
        </style><div class="cards-grid">${cards}</div>`;
    }
    function photoBackgroundSample(ctx, width, height) {
        const size = Math.max(3, Math.round(Math.min(width, height) * 0.025));
        const image = ctx.getImageData(0, 0, width, Math.min(height, size)).data;
        let red = 0, green = 0, blue = 0, count = 0;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                for (const px of [x, width - 1 - x]) {
                    const offset = ((y * width + px) * 4);
                    red += image[offset]; green += image[offset + 1]; blue += image[offset + 2]; count++;
                }
            }
        }
        return { red:red / count, green:green / count, blue:blue / count };
    }

    async function reframeBluePhoto(img, doc) {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        if (!width || !height || !String(img.currentSrc || img.src).startsWith("data:image/")) return;
        const sourceCanvas = doc.createElement("canvas");
        sourceCanvas.width = width;
        sourceCanvas.height = height;
        const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently:true });
        sourceCtx.drawImage(img, 0, 0, width, height);
        const background = photoBackgroundSample(sourceCtx, width, height);
        // Only touch photos that were already composed on the app's blue ID background.
        if (!(background.blue > 175 && background.blue > background.green + 45 && background.green > background.red + 35)) return;

        const pixels = sourceCtx.getImageData(0, 0, width, height).data;
        const rowHits = new Uint32Array(height);
        const columnHits = new Uint32Array(width);
        const threshold = 48 * 48;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const offset = ((y * width + x) * 4);
                const dr = pixels[offset] - background.red;
                const dg = pixels[offset + 1] - background.green;
                const db = pixels[offset + 2] - background.blue;
                if ((dr * dr) + (dg * dg) + (db * db) > threshold) {
                    rowHits[y]++;
                    columnHits[x]++;
                }
            }
        }
        const rowMinimum = Math.max(3, Math.round(width * 0.012));
        const columnMinimum = Math.max(3, Math.round(height * 0.01));
        const minX = columnHits.findIndex(value => value >= columnMinimum);
        const minY = rowHits.findIndex(value => value >= rowMinimum);
        let maxX = -1, maxY = -1;
        for (let x = width - 1; x >= 0; x--) if (columnHits[x] >= columnMinimum) { maxX = x; break; }
        for (let y = height - 1; y >= 0; y--) if (rowHits[y] >= rowMinimum) { maxY = y; break; }
        if (minX < 0 || minY < 0 || maxX <= minX || maxY <= minY) return;

        // Reframe only older photos with an empty strip below the subject. Newly
        // composed portraits already have deliberate headroom and a filled bottom.
        if (maxY >= height * 0.985 && minY >= height * 0.04 && minY <= height * 0.20) return;
        if (minY <= height * 0.035 && maxY >= height * 0.95) return;
        const subjectWidth = maxX - minX + 1;
        const subjectHeight = maxY - minY + 1;
        const padX = Math.round(subjectWidth * 0.05);
        const padTop = Math.round(subjectHeight * 0.008);
        const padBottom = 0;
        const sx = Math.max(0, minX - padX);
        const sy = Math.max(0, minY - padTop);
        const sw = Math.min(width - sx, subjectWidth + (padX * 2));
        const sh = Math.min(height - sy, subjectHeight + padTop + padBottom);
        const output = doc.createElement("canvas");
        output.width = 315;
        output.height = 400;
        const ctx = output.getContext("2d");
        ctx.fillStyle = `rgb(${Math.round(background.red)},${Math.round(background.green)},${Math.round(background.blue)})`;
        ctx.fillRect(0, 0, output.width, output.height);
        const scale = Math.min((output.width * 0.94) / sw, (output.height * 0.99) / sh);
        const drawWidth = sw * scale;
        const drawHeight = sh * scale;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        // Keep the shoulders at the lower edge; any unused blue background belongs above the head.
        ctx.drawImage(sourceCanvas, sx, sy, sw, sh, (output.width - drawWidth) / 2, output.height - drawHeight, drawWidth, drawHeight);
        img.src = output.toDataURL("image/jpeg", .88);
        try { await img.decode(); } catch {}
    }

    async function fitText(doc) {
        doc.querySelectorAll("[data-card-fit], .card-line > span, .family-line > span").forEach(el => {
            // Fit long real student data without ellipses or truncating the record.
            const size = parseFloat(doc.defaultView.getComputedStyle(el).fontSize);
            let current = size;
            while (el.scrollWidth > el.clientWidth + 1 && current > 9) {
                current -= .25;
                el.style.setProperty("font-size", `${current}px`, "important");
            }
        });
        await Promise.all(Array.from(doc.querySelectorAll("img[data-card-photo]"), img => reframeBluePhoto(img, doc)));
    }
    globalThis.StudentCardTemplate = Object.freeze({ render, fitText });
})();
