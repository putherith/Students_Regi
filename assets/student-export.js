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
        for (const entry of entries) {
            const name = encoder.encode(entry.name);
            const bytes = entry.bytes;
            const checksum = crc32(bytes);
            const local = new Uint8Array(30);
            const l = new DataView(local.buffer);
            l.setUint32(0, 0x04034b50, true);
            l.setUint16(4, 20, true);
            l.setUint16(6, 0x0800, true); // UTF-8 filenames (including Khmer).
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

    window.StudentExport = Object.freeze({ photosZip, cleanName });
})();
