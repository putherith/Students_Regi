# ថ្នាក់ឌីជីថល

This installable app uses the supplied `ថ្នាក់ឌីជីថល.html` as its interface and data model. The static build publishes it at `/class-app/`.

## Google Sheet roster connection

The management **នាំចូលពី Google Sheet** screen has a **ទាញបញ្ជីសិស្សថ្មី** button tied to the existing `ចុះឈ្មោះសិស្សV3` spreadsheet (`1b_gIFGpQZpzHyM-pXQZG-GiXjsTwcGsl39BNZKjM0iA`). It reads the `Students` roster through the Student Registration Apps Script deployment already configured in this repository. Enter the same access key used by the registration app, or configure it in that app on the same browser origin. The key is stored in that browser's localStorage only when entered in this screen.

The sync reads student ID, code, name, sex, birth date, class, guardian, and contact. It matches by student ID, updates existing profiles, creates missing class views, and preserves score and attendance objects. When a student changes class, the profile moves to the new class; previous class score and attendance objects remain stored for historical recovery. It never writes to the source `Students` tab and does not automatically delete students removed from the Sheet.

**Current limit:** This is a one-way roster sync. Scores, attendance, school settings, passwords, and other class data still live in this browser's localStorage. The local role PINs are convenience gates and do not provide server-enforced access control. Shared live editing needs an Apps Script backend with authenticated class-scoped writes; do not treat this build as a secure multi-device school record until that is deployed and verified.

The app includes its own document and print templates. Check local signatory names and school document rules before using a printed form as an official record.
