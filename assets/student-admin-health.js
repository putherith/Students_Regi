(function (root) {
    "use strict";

    function clean(value) {
        return String(value == null ? "" : value).trim();
    }

    function normalizedName(value) {
        return clean(value).replace(/\s+/g, " ").toLocaleLowerCase();
    }

    function normalizedDate(value) {
        const text = clean(value);
        if (!text) return "";
        const match = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
        if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
        return text.slice(0, 10);
    }

    function analyze(students, options) {
        const rows = Array.isArray(students) ? students : [];
        const config = options || {};
        const photoVerified = config.photoVerified === true;
        const missingIds = config.missingPhotoIds || new Set();
        const missingCodes = config.missingPhotoCodes || new Set();
        const seenIds = new Map();
        const seenCodes = new Map();
        const seenPeople = new Map();
        const issues = [];
        const counts = { duplicateId:0, duplicateCode:0, possibleDuplicate:0,
            missingRequired:0, invalidCode:0, missingPhoto:0 };
        function add(type, student, detail) {
            counts[type]++;
            issues.push({ type, id:clean(student.id), studentCode:clean(student.studentCode),
                studentName:clean(student.studentName), className:clean(student.className), detail });
        }
        rows.forEach(function (student) {
            const id = clean(student.id);
            const code = clean(student.studentCode);
            const name = normalizedName(student.studentName || [student.studentSurname, student.studentGivenName].filter(Boolean).join(" "));
            const gender = clean(student.gender);
            const dob = normalizedDate(student.dob);
            const className = clean(student.className);
            if (!name || !gender || !dob || !className) {
                add("missingRequired", student, [!name && "ឈ្មោះ", !gender && "ភេទ", !dob && "ថ្ងៃកំណើត", !className && "ថ្នាក់"].filter(Boolean).join(", "));
            }
            if (id) {
                if (seenIds.has(id)) add("duplicateId", student, "លេខក្នុងប្រព័ន្ធជាន់គ្នា");
                else seenIds.set(id, student);
            }
            if (code) {
                if (seenCodes.has(code)) add("duplicateCode", student, "អត្តលេខជាន់គ្នា");
                else seenCodes.set(code, student);
                if (!/^902\d{2}(?:0[7-9]|1[0-2])\d{3,}$/.test(code)) {
                    add("invalidCode", student, "អត្តលេខមិនតាមទម្រង់ 902 + ឆ្នាំ + កម្រិត + លេខរៀង");
                }
            } else {
                add("invalidCode", student, "មិនទាន់មានអត្តលេខ");
            }
            // Name alone is not identity: only flag the same name, sex, DOB and class.
            if (name && gender && dob && className) {
                const personKey = [name, gender, dob, className].join("|");
                if (seenPeople.has(personKey)) add("possibleDuplicate", student, "ឈ្មោះ ភេទ ថ្ងៃកំណើត និងថ្នាក់ដូចគ្នា");
                else seenPeople.set(personKey, student);
            }
            if (photoVerified && (missingIds.has(id) || missingCodes.has(code))) {
                add("missingPhoto", student, "Sheet បញ្ជាក់ថាមិនមានរូបថត");
            }
        });
        return { total:rows.length, counts, issues, photoVerified };
    }

    root.StudentAdminHealth = { analyze };
})(typeof window !== "undefined" ? window : globalThis);
