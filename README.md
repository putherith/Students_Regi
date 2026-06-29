# Student Registration System

Static GitHub Pages build for the student registration app.

## Google Sheet sync

Use `google-sheet-backend.gs` as the Apps Script backend:

1. Create a Google Sheet.
2. Open Extensions -> Apps Script.
3. Paste the contents of `google-sheet-backend.gs` into `Code.gs`.
4. Save, then Deploy -> New deployment.
5. Choose type `Web app`.
6. Execute as: `Me`.
7. Who has access: `Anyone`.
8. Copy the Web App URL ending in `/exec`.
9. Open the app, click `Sheet`, paste the URL, and Save.
10. On the computer, click `Backup` after import. On the phone, click `Load` or reopen the app.

## Supabase sync

Use `supabase-schema.sql` to create the Supabase table:

1. Create a Supabase project.
2. Open SQL Editor.
3. Paste and run `supabase-schema.sql`.
4. Go to Project Settings -> API.
5. Copy `Project URL` and the `anon public` key.
6. Open the app, click `Storage`.
7. Choose `Supabase`, paste the URL and anon key, then Save.
8. Click `Backup` on the computer after import. On the phone, click `Load` or reopen the app.

This static app stores the anon key in the browser. The included policies allow app access from the public anon role for simple deployment. Use authenticated policies before storing sensitive production data.

## Google Sheet design

The latest `google-sheet-backend.gs` formats the Google Sheet automatically when data is backed up:

- `Students`: app-compatible master data with Khmer headers, frozen rows, filters, hidden internal ID/timestamp columns, and styled rows.
- `Dashboard`: summary totals by class, gender, school, phone completeness, and average GPA.
- `By Class`: one grouped list separated by class.
- `Class - <class>`: one auto-created tab for each class.

If you already deployed Apps Script, paste the latest `google-sheet-backend.gs`, then use `Deploy -> Manage deployments -> Edit -> New version -> Deploy`. After that, open the app and click `Backup` to rebuild the designed sheets.

## GitHub Pages setup

1. Create a GitHub repository.
2. Upload `index.html` and `.nojekyll` to the repository root.
3. Go to Settings -> Pages.
4. Set Source to `Deploy from a branch`.
5. Select branch `main` and folder `/ (root)`, then Save.

The site will be available at `https://<username>.github.io/<repo-name>/` after Pages finishes publishing.
