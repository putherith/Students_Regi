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
        webPreferences:{ offscreen:true }
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
        return {
            choiceButtons:document.querySelectorAll('.choice-open-btn').length,
            occupation, province, district, commune, village,
            pickerClosed:!document.getElementById('choice-picker').classList.contains('is-open'),
            viewport:innerWidth,
            pickerWidth:picker.width
        };
    })()`);
    console.log(JSON.stringify(result));
    win.destroy();
    const valid = result.choiceButtons === 10 && result.occupation === 'កសិករ' &&
        result.province === 'ខេត្តតាកែវ' && result.district === 'ស្រុកកោះអណ្តែត' &&
        result.commune === 'ក្រពុំឈូក' && result.village === 'ដើមដូង' && result.pickerClosed;
    if (!valid) throw new Error('Mobile choice control validation failed');
    app.quit();
}).catch(error => {
    console.error(error);
    app.exit(1);
});
