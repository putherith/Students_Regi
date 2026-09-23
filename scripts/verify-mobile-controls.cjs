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
    // Keep the verification isolated from the production Google Sheet.
    win.webContents.session.webRequest.onBeforeRequest(
        { urls:['https://script.google.com/*', 'https://script.googleusercontent.com/*'] },
        (_details, callback) => callback({ cancel:true })
    );
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

        const clickVillage = async (fieldId, searchText, code) => {
            document.querySelector('[data-choice-target="' + fieldId + '"]').click();
            await new Promise(resolve => requestAnimationFrame(resolve));
            const picker = document.getElementById('choice-picker');
            const search = picker.querySelector('.choice-picker-search');
            search.value = searchText;
            search.dispatchEvent(new Event('input', { bubbles:true }));
            const choices = [...picker.querySelectorAll('.choice-picker-option')];
            const option = choices.find(button => button.dataset.code === code);
            if (!picker.classList.contains('is-open') || !option) throw new Error('Missing village: ' + code);
            option.click();
            await new Promise(resolve => requestAnimationFrame(resolve));
            return { value:document.getElementById(fieldId).value, choices:choices.length };
        };

        const occupation = await clickChoice('fatherOccupation', 'កសិករ');
        const birthVillageInput = document.getElementById('pobVillage');
        birthVillageInput.value = 'ព្រៃមេលងខាងត្បូង';
        birthVillageInput.dispatchEvent(new Event('input', { bubbles:true }));
        const uniqueVillageAutofilled = document.getElementById('pobCommune').value === 'ព្រៃខ្លា' &&
            document.getElementById('pobDistrict').value === 'ស្រុកកោះអណ្ដែត';
        birthVillageInput.value = 'ដើមដូង';
        birthVillageInput.dispatchEvent(new Event('input', { bubbles:true }));
        const ambiguousRequiresChoice = !!birthVillageInput.validationMessage && !document.getElementById('pobCommune').value;
        const villageSelection = await clickVillage('pobVillage', 'ដើមដូង', '21050101');
        const province = document.getElementById('pobProvince').value;
        const district = document.getElementById('pobDistrict').value;
        const commune = document.getElementById('pobCommune').value;
        const village = villageSelection.value;
        const otherVillageSelection = await clickVillage('currentVillage', 'ដើមដូង', '21020201');
        const duplicateVillageDisambiguated = villageSelection.choices === 2 && otherVillageSelection.choices === 2 &&
            document.getElementById('currentProvince').value === 'ខេត្តតាកែវ' &&
            document.getElementById('currentDistrict').value === 'ស្រុកបាទី' &&
            document.getElementById('currentCommune').value === 'ចំប៉ី' && !document.getElementById('currentVillage').validationMessage;
        const currentProvinceInput = document.getElementById('currentProvince');
        currentProvinceInput.value = 'ខេត្តកំពង់ចាម';
        currentProvinceInput.dispatchEvent(new Event('input', { bubbles:true }));
        document.getElementById('currentDistrict').value = 'ស្រុកផ្សេង';
        document.getElementById('currentCommune').value = 'ឃុំផ្សេង';
        document.getElementById('currentVillage').value = 'ភូមិផ្សេង';
        document.getElementById('currentVillage').dispatchEvent(new Event('input', { bubbles:true }));
        const otherProvinceManual = currentProvinceInput.value === 'ខេត្តកំពង់ចាម' &&
            document.getElementById('currentDistrict').value === 'ស្រុកផ្សេង' &&
            document.getElementById('currentCommune').value === 'ឃុំផ្សេង';
        await clickVillage('currentVillage', 'ដើមដូង', '21020201');
        document.getElementById('fatherName').value = 'សុខ វីរៈ';
        document.getElementById('fatherPhone').value = '012111222';
        document.getElementById('motherName').value = 'ចាន់ ស្រីមុំ';
        document.getElementById('motherPhone').value = '098333444';
        document.querySelector('[data-guardian-source="father"]').click();
        const guardianFromFather = document.getElementById('guardianName').value === 'សុខ វីរៈ' &&
            document.getElementById('contact').value === '012111222';
        document.querySelector('[data-guardian-source="mother"]').click();
        const guardianFromMother = document.getElementById('guardianName').value === 'ចាន់ ស្រីមុំ' &&
            document.getElementById('contact').value === '098333444';
        const guardianButtonsFit = document.querySelector('.guardian-copy-actions').scrollWidth <=
            document.querySelector('.guardian-copy-actions').clientWidth + 1;
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
        document.getElementById('className').value = '7A';
        document.getElementById('registration-form').requestSubmit();
        await waitFor(() => document.getElementById('total-students').textContent.trim() === '1' && !document.getElementById('save-student-btn').disabled);
        fillStudent(' សុខ​ ', 'ដារ៉ា', 2011);
        document.getElementById('registration-form').requestSubmit();
        await waitFor(() => !document.getElementById('save-student-btn').disabled);
        const duplicateBlocked = document.getElementById('total-students').textContent.trim() === '1'
            && [...document.querySelectorAll('.toast-msg')].some(element => element.textContent.includes('ឈ្មោះសិស្សនេះមានរួចហើយ'));
        document.getElementById('sheet-settings-btn').click();
        const sheetUrlInput = document.getElementById('sheet-url-input');
        const canonicalSheetUrl = sheetUrlInput.value;
        const sheetUrlReadOnly = sheetUrlInput.readOnly;
        document.getElementById('cancel-sheet-url-btn').click();
        return {
            choiceButtons:document.querySelectorAll('.choice-open-btn').length,
            officialTakeoVillages:window.TAKEO_VILLAGES_2025?.length,
            occupation, province, district, commune, village, uniqueVillageAutofilled, ambiguousRequiresChoice, duplicateVillageDisambiguated, otherProvinceManual,
            pickerClosed:!document.getElementById('choice-picker').classList.contains('is-open'),
            viewport:innerWidth,
            pickerWidth:picker.width,
            duplicateBlocked, guardianFromFather, guardianFromMother, guardianButtonsFit,
            canonicalSheetUrl,
            sheetUrlReadOnly
        };
    })()`);
    console.log(JSON.stringify(result));
    const valid = result.choiceButtons === 10 && result.officialTakeoVillages === 1121 && result.occupation === 'កសិករ' &&
        result.province === 'ខេត្តតាកែវ' && result.district === 'ស្រុកកោះអណ្ដែត' &&
        result.commune === 'ក្រពុំឈូក' && result.village === 'ដើមដូង' && result.uniqueVillageAutofilled && result.ambiguousRequiresChoice && result.duplicateVillageDisambiguated && result.otherProvinceManual && result.pickerClosed && result.duplicateBlocked && result.guardianFromFather && result.guardianFromMother && result.guardianButtonsFit &&
        result.sheetUrlReadOnly && result.canonicalSheetUrl === 'https://script.google.com/macros/s/AKfycbyc_1v8DBczUTac1CprLsj2Ae5uKt8In-XGpB6lXXmCZj7Mm-4OL1DPSJjNXsD-G2GK/exec';
    if (!valid) throw new Error('Mobile choice control validation failed');
    win.setSize(390, 600);
    const navigation = await win.webContents.executeJavaScript(`(async () => {
        const waitFor = async test => {
            const started = Date.now();
            while (!test()) {
                if (Date.now() - started > 4000) throw new Error('Timed out waiting for UI state');
                await new Promise(resolve => setTimeout(resolve, 25));
            }
        };
        document.getElementById('studentSurname').value = 'ម៉ៅ';
        document.getElementById('studentGivenName').value = 'សុភា';
        document.getElementById('className').value = '8B';
        document.getElementById('registration-form').requestSubmit();
        await waitFor(() => document.getElementById('total-students').textContent.trim() === '2');
        document.getElementById('tab-classes-btn').click();
        const classTiles = [...document.querySelectorAll('.class-tile')];
        const classGridHasBoth = classTiles.length === 2 &&
            classTiles.some(tile => tile.dataset.class === '7A') &&
            classTiles.some(tile => tile.dataset.class === '8B');
        const classGridFits = document.documentElement.scrollWidth <= innerWidth + 1;
        classTiles.find(tile => tile.dataset.class === '7A').click();
        const classDetailHasOne = document.querySelectorAll('.class-student-item').length === 1 &&
            document.getElementById('class-browser-title').textContent.includes('7A');
        const classDetailFits = document.documentElement.scrollWidth <= innerWidth + 1;
        let popupHtml = '';
        const buttons = {};
        window.open = () => {
            const popup = {
                closed:false,
                document:{
                    write:html => { popupHtml = html; }, close:() => {},
                    getElementById:id => ({ addEventListener:(_event, callback) => { buttons[id] = callback; } })
                },
                addEventListener:() => {},
                close() { this.closed = true; },
                focus:() => {}, print:() => {},
                location:{ replace:() => {} }
            };
            window.testPrintPopup = popup;
            return popup;
        };
        document.querySelector('.class-student-item .print-student-btn').click();
        const printHasReturn = popupHtml.includes('return-app-btn') && typeof buttons['return-app-btn'] === 'function';
        buttons['return-app-btn']();
        await new Promise(resolve => setTimeout(resolve, 100));
        const printClosed = window.testPrintPopup.closed;
        document.getElementById('class-browser-back-btn').click();
        const classBackWorks = document.querySelectorAll('.class-tile').length === 2 &&
            document.getElementById('class-browser-back-btn').hidden;
        document.getElementById('app-settings-btn').click();
        await new Promise(resolve => setTimeout(resolve, 260));
        const modal = document.getElementById('app-settings-modal');
        const dialog = modal.querySelector('.modal-dialog').getBoundingClientRect();
        const body = modal.querySelector('.modal-body');
        const footer = modal.querySelector('.modal-footer').getBoundingClientRect();
        const scrollHeight = body.scrollHeight;
        const clientHeight = body.clientHeight;
        const settingsFits = dialog.top >= 0 && dialog.bottom <= innerHeight + 1 &&
            footer.bottom <= innerHeight + 1 && scrollHeight > clientHeight;
        document.getElementById('principal-name-input').value = 'នាយកសាកល្បង';
        document.getElementById('save-app-settings-btn').click();
        await waitFor(() => !modal.classList.contains('is-open'));
        const settingsSaved = JSON.parse(localStorage.getItem('studentRegistrationAppSettings') || '{}').principalName === 'នាយកសាកល្បង';
        document.getElementById('class-browser-close-btn').click();
        const closeWorks = !document.body.classList.contains('class-browser-view') &&
            document.getElementById('tab-list-btn').classList.contains('active');
        return { classGridHasBoth, classGridFits, classDetailHasOne, classDetailFits, classBackWorks, printHasReturn, printClosed, settingsFits, settingsSaved, closeWorks,
            settingsGeometry:{ top:dialog.top, bottom:dialog.bottom, viewport:innerHeight, footerBottom:footer.bottom, scrollHeight, clientHeight } };
    })()`);
    console.log(JSON.stringify(navigation));
    if (Object.entries(navigation).some(([key, value]) => key !== 'settingsGeometry' && value !== true)) throw new Error('Mobile navigation/settings validation failed');
    win.setSize(1280, 800);
    const desktop = await win.webContents.executeJavaScript(`(() => {
        document.getElementById('open-class-browser-btn').click();
        const panelVisible = getComputedStyle(document.getElementById('class-browser-panel')).display !== 'none';
        const mainHidden = getComputedStyle(document.querySelector('.main-layout')).display === 'none';
        const classesVisible = document.querySelectorAll('.class-tile').length === 2;
        document.getElementById('class-browser-close-btn').click();
        const mainRestored = getComputedStyle(document.querySelector('.main-layout')).display !== 'none';
        return { panelVisible, mainHidden, classesVisible, mainRestored };
    })()`);
    console.log(JSON.stringify(desktop));
    if (Object.values(desktop).some(value => value !== true)) throw new Error('Desktop class screen validation failed');
    win.destroy();
    app.quit();
}).catch(error => {
    console.error(error);
    app.exit(1);
});
