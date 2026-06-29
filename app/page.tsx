"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type Student = {
  id: string;
  khName: string;
  latinName: string;
  gender: string;
  dob: string;
  grade: string;
  school: string;
  guardian: string;
  phone: string;
  address: string;
  note: string;
};

const emptyStudent: Student = {
  id: "",
  khName: "",
  latinName: "",
  gender: "ស្រី",
  dob: "",
  grade: "ថ្នាក់ទី ១",
  school: "",
  guardian: "",
  phone: "",
  address: "",
  note: ""
};

const grades = [
  "ថ្នាក់ទី ១",
  "ថ្នាក់ទី ២",
  "ថ្នាក់ទី ៣",
  "ថ្នាក់ទី ៤",
  "ថ្នាក់ទី ៥",
  "ថ្នាក់ទី ៦",
  "ថ្នាក់ទី ៧",
  "ថ្នាក់ទី ៨",
  "ថ្នាក់ទី ៩",
  "ថ្នាក់ទី ១០",
  "ថ្នាក់ទី ១១",
  "ថ្នាក់ទី ១២"
];

const storageKey = "khmer-student-registration";

export default function Page() {
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState<Student>(emptyStudent);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;

    try {
      setStudents(JSON.parse(saved));
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(students));
  }, [students]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;

    return students.filter((student) =>
      Object.values(student).some((value) => value.toLowerCase().includes(q))
    );
  }, [query, students]);

  const totals = useMemo(() => {
    const girls = students.filter((student) => student.gender === "ស្រី").length;
    const boys = students.filter((student) => student.gender === "ប្រុស").length;
    const gradesCount = new Set(students.map((student) => student.grade)).size;
    return { girls, boys, gradesCount };
  }, [students]);

  function updateField(field: keyof Student, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = { ...form, id: form.id || crypto.randomUUID() };

    setStudents((current) => {
      const exists = current.some((student) => student.id === normalized.id);
      return exists
        ? current.map((student) => (student.id === normalized.id ? normalized : student))
        : [normalized, ...current];
    });
    setForm(emptyStudent);
  }

  function editStudent(student: Student) {
    setForm(student);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function removeStudent(id: string) {
    setStudents((current) => current.filter((student) => student.id !== id));
  }

  function exportCsv() {
    const header = [
      "ឈ្មោះខ្មែរ",
      "ឈ្មោះឡាតាំង",
      "ភេទ",
      "ថ្ងៃខែឆ្នាំកំណើត",
      "ថ្នាក់",
      "សាលា",
      "អាណាព្យាបាល",
      "ទូរស័ព្ទ",
      "អាសយដ្ឋាន",
      "ចំណាំ"
    ];
    const rows = students.map((student) =>
      [
        student.khName,
        student.latinName,
        student.gender,
        student.dob,
        student.grade,
        student.school,
        student.guardian,
        student.phone,
        student.address,
        student.note
      ].map((value) => `"${value.replaceAll('"', '""')}"`)
    );
    const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "students-registration.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">ប្រព័ន្ធសាលារៀន</p>
          <h1>ចុះឈ្មោះសិស្ស</h1>
        </div>
        <button className="ghost-button" type="button" onClick={exportCsv} disabled={!students.length}>
          ទាញយក CSV
        </button>
      </section>

      <section className="metrics" aria-label="ស្ថិតិ">
        <div><span>{students.length}</span><p>សិស្សសរុប</p></div>
        <div><span>{totals.girls}</span><p>ស្រី</p></div>
        <div><span>{totals.boys}</span><p>ប្រុស</p></div>
        <div><span>{totals.gradesCount}</span><p>ថ្នាក់</p></div>
      </section>

      <div className="workspace">
        <form className="panel form-panel" onSubmit={saveStudent}>
          <div className="panel-title">
            <h2>{form.id ? "កែព័ត៌មានសិស្ស" : "បញ្ចូលព័ត៌មានសិស្ស"}</h2>
            {form.id && (
              <button className="text-button" type="button" onClick={() => setForm(emptyStudent)}>
                បោះបង់
              </button>
            )}
          </div>

          <label>
            ឈ្មោះខ្មែរ
            <input required value={form.khName} onChange={(event) => updateField("khName", event.target.value)} />
          </label>
          <label>
            ឈ្មោះឡាតាំង
            <input value={form.latinName} onChange={(event) => updateField("latinName", event.target.value)} />
          </label>
          <div className="field-row">
            <label>
              ភេទ
              <select value={form.gender} onChange={(event) => updateField("gender", event.target.value)}>
                <option>ស្រី</option>
                <option>ប្រុស</option>
              </select>
            </label>
            <label>
              ថ្ងៃខែឆ្នាំកំណើត
              <input type="date" value={form.dob} onChange={(event) => updateField("dob", event.target.value)} />
            </label>
          </div>
          <div className="field-row">
            <label>
              ថ្នាក់
              <select value={form.grade} onChange={(event) => updateField("grade", event.target.value)}>
                {grades.map((grade) => <option key={grade}>{grade}</option>)}
              </select>
            </label>
            <label>
              សាលា
              <input value={form.school} onChange={(event) => updateField("school", event.target.value)} />
            </label>
          </div>
          <label>
            អាណាព្យាបាល
            <input value={form.guardian} onChange={(event) => updateField("guardian", event.target.value)} />
          </label>
          <label>
            ទូរស័ព្ទ
            <input inputMode="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
          </label>
          <label>
            អាសយដ្ឋាន
            <textarea rows={3} value={form.address} onChange={(event) => updateField("address", event.target.value)} />
          </label>
          <label>
            ចំណាំ
            <textarea rows={2} value={form.note} onChange={(event) => updateField("note", event.target.value)} />
          </label>
          <button className="primary-button" type="submit">
            {form.id ? "រក្សាទុកការកែប្រែ" : "ចុះឈ្មោះ"}
          </button>
        </form>

        <section className="panel list-panel">
          <div className="panel-title">
            <h2>បញ្ជីសិស្ស</h2>
            <input
              className="search"
              placeholder="ស្វែងរកឈ្មោះ ថ្នាក់ លេខទូរស័ព្ទ..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ឈ្មោះ</th>
                  <th>ភេទ</th>
                  <th>ថ្នាក់</th>
                  <th>ទូរស័ព្ទ</th>
                  <th>សកម្មភាព</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <strong>{student.khName}</strong>
                      <small>{student.latinName || student.school || "មិនទាន់បំពេញព័ត៌មានបន្ថែម"}</small>
                    </td>
                    <td>{student.gender}</td>
                    <td>{student.grade}</td>
                    <td>{student.phone || "-"}</td>
                    <td className="actions">
                      <button type="button" onClick={() => editStudent(student)}>កែ</button>
                      <button type="button" onClick={() => removeStudent(student.id)}>លុប</button>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={5} className="empty">មិនទាន់មានទិន្នន័យសិស្ស</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
