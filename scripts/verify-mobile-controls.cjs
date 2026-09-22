// Verify the custom list picker with an iPhone-sized Chromium viewport.
// Usage: electron scripts/verify-mobile-controls.cjs
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
app.setPath('userData', path.join(root, 'dist', 'mobile-control-review', 'chromium-profile'));
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
    const win = new BrowserWindow({
        show:false,
        width:390,
        height:844,
        webPreferences:{ offscreen:true, partition:`temporary-mobile-${Date.now()}` }
    });
    await win.loadURL(pathToFileURL(path.join(root, 'index.html')).href);
    await win.webContents.executeJavaScript(`new Promise(resolve => {
        if (document.readyState === 'complete') resolve();
        else addEventListener('load', resolve, { once:true });
    })`);

    const result = await win.webContents.executeJavaScript(`(async () => {
        const clickChoice = async (fieldId, value) => {
            document.querySelector('[data-choice-target="' + fieldId + '"]').click();
            await new Promise(resolve => requestAnimationFrame(resolve));
            const picker = document.getElementById('choice-picker');
            const option = [...picker.querySelectorAll('.choice-picker-option')].find(button => button.textContent === value);
            if (!picker.classList.contains('is-open') || !option) throw new Error('Missing picker option: ' + fieldId + ' / ' + value);
            option.click();
            await new Promise(resolve => requestAnimationFrame(resolve));
            return document.getElementById(fieldId).value;
        };

        const occupation = await clickChoice('fatherOccupation', 'កសិករ');
        const province = await clickChoice('pobProvince', 'ខេត្តតាកែវ');
        const district = await clickChoice('pobDistrict', 'ស្រុកកោះអណ្តែត');
        const commune = await clickChoice('pobCommune', 'ក្រពុំឈូក');
        const village = await clickChoice('pobVillage', 'ដើមដូង');
        const picker = document.getElementById('choice-picker').getBoundingClientRect();
        const waitFor = async (test, timeout=3000) => {
            const started = Date.now();
            while (!test()) {
                if (Date.now() - started > timeout) throw new Error('Timed out waiting for form state');
                await new Promise(resolve => setTimeout(resolve, 25));
            }
        };
        const fillStudent = (surname, givenName, year) => {
            document.getElementById('studentSurname').value = surname;
            document.getElementById('studentGivenName').value = givenName;
            document.getElementById('contact').value = '012345678';
            for (const [id, value] of [['dob-day','1'], ['dob-month','1'], ['dob-year',String(year)]]) {
                const select = document.getElementById(id);
                select.value = value;
                select.dispatchEvent(new Event('change', { bubbles:true }));
            }
        };
        fillStudent('សុខ', 'ដារ៉ា', 2012);
        document.getElementById('registration-form').requestSubmit();
        await waitFor(() => document.getElementById('total-students').textContent.trim() === '1' && !document.getElementById('save-student-btn').disabled);
        fillStudent(' សុខ​ ', 'ដារ៉ា', 2011);
        document.getElementById('registration-form').requestSubmit();
        await waitFor(() => !document.getElementById('save-student-btn').disabled);
        const duplicateBlocked = document.getElementById('total-students').textContent.trim() === '1'
            && [...document.querySelectorAll('.toast-msg')].some(element => element.textContent.includes('ឈ្មោះសិស្សនេះមានរួចហើយ'));
        return {
            choiceButtons:document.querySelectorAll('.choice-open-btn').length,
            occupation, province, district, commune, village,
            pickerClosed:!document.getElementById('choice-picker').classList.contains('is-open'),
            viewport:innerWidth,
            pickerWidth:picker.width,
            duplicateBlocked
        };
    })()`);
    console.log(JSON.stringify(result));
    win.destroy();
    const valid = result.choiceButtons === 10 && result.occupation === 'កសិករ' &&
        result.province === 'ខេត្តតាកែវ' && result.district === 'ស្រុកកោះអណ្តែត' &&
        result.commune === 'ក្រពុំឈូក' && result.village === 'ដើមដូង' && result.pickerClosed && result.duplicateBlocked;
    if (!valid) throw new Error('Mobile choice control validation failed');
    app.quit();
}).catch(error => {
    console.error(error);
    app.exit(1);
});
