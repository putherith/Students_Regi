// Verify that a student survives reload while Google Sheet/network is unavailable.
// Usage: electron scripts/verify-offline-storage.cjs
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
app.setPath('userData', path.join(root, 'dist', 'offline-storage-review', 'chromium-profile'));
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
    const win = new BrowserWindow({
        show:false,
        width:390,
        height:844,
        webPreferences:{ offscreen:true, partition:`temporary-offline-${Date.now()}` }
    });
    const appUrl = pathToFileURL(path.join(root, 'index.html')).href;
    await win.loadURL(appUrl);
    await win.webContents.executeJavaScript(`
        localStorage.clear();
        localStorage.setItem('studentRegistrationCloudProvider', 'google-sheet');
        localStorage.setItem('studentRegistrationGoogleScriptUrl', 'https://script.google.com/macros/s/unavailable-test/exec');
    `);
    win.webContents.session.enableNetworkEmulation({ offline:true });
    await win.loadURL(appUrl);

    await win.webContents.executeJavaScript(`(async () => {
        const waitFor = async (test, timeout=4000) => {
            const started = Date.now();
            while (!test()) {
                if (Date.now() - started > timeout) throw new Error('Timed out waiting for offline save');
                await new Promise(resolve => setTimeout(resolve, 25));
            }
        };
        document.getElementById('studentSurname').value = 'ហ៊ុន';
        document.getElementById('studentGivenName').value = 'សុភា';
        document.getElementById('contact').value = '012345678';
        for (const [id, value] of [['dob-day','2'], ['dob-month','2'], ['dob-year','2012']]) {
            const select = document.getElementById(id);
            select.value = value;
            select.dispatchEvent(new Event('change', { bubbles:true }));
        }
        document.getElementById('registration-form').requestSubmit();
        await waitFor(() => document.getElementById('total-students').textContent.trim() === '1');
    })()`);

    await win.loadURL(appUrl);
    const result = await win.webContents.executeJavaScript(`(async () => {
        const started = Date.now();
        while (document.getElementById('total-students').textContent.trim() !== '1') {
            if (Date.now() - started > 4000) throw new Error('Offline student did not survive reload');
            await new Promise(resolve => setTimeout(resolve, 25));
        }
        const localRows = JSON.parse(localStorage.getItem('studentRegistrationOfflineStudents') || '[]');
        const pending = JSON.parse(localStorage.getItem('studentRegistrationPendingCloudMutationsV1') || '[]');
        return {
            total:document.getElementById('total-students').textContent.trim(),
            localRows:localRows.length,
            pending:pending.length,
            pendingName:pending[0]?.student?.studentName || '',
            status:document.getElementById('connection-text').textContent
        };
    })()`);
    win.webContents.session.disableNetworkEmulation();
    result.syncedAfterOnline = await win.webContents.executeJavaScript(`(async () => {
        window.fetch = async () => ({});
        window.dispatchEvent(new Event('online'));
        const started = Date.now();
        while (JSON.parse(localStorage.getItem('studentRegistrationPendingCloudMutationsV1') || '[]').length) {
            if (Date.now() - started > 4000) return false;
            await new Promise(resolve => setTimeout(resolve, 25));
        }
        return true;
    })()`);
    console.log(JSON.stringify(result));
    win.destroy();
    if (result.total !== '1' || result.localRows !== 1 || result.pending !== 1 || result.pendingName !== 'ហ៊ុន សុភា' || !result.status.includes('រង់ចាំ Sync') || !result.syncedAfterOnline) {
        throw new Error('Offline storage validation failed');
    }
    app.quit();
}).catch(error => {
    console.error(error);
    app.exit(1);
});
