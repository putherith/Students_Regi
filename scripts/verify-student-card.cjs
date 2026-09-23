// Render the real card template in Chromium, isolated from saved student records.
// Usage: electron scripts/verify-student-card.cjs [output directory]
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'dist', 'card-review'));
app.setPath('userData', path.join(out, 'chromium-profile'));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('force-device-scale-factor', '2');
app.whenReady().then(async () => {
    fs.mkdirSync(out, { recursive:true });
    const win = new BrowserWindow({ show:false, width:1600, height:1600, webPreferences:{ offscreen:true } });
    await win.loadURL('about:blank');
    await win.webContents.executeJavaScript(fs.readFileSync(path.join(root, 'assets/student-card.js'), 'utf8'));
    const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'assets/moeys-logo.png')).toString('base64');
    const student = {
        studentName:'លុយ ស្រីនីត', gender:'ស្រី', dob:'2012-10-05', className:'7C', studentCode:'ID-2607081',
        pobVillage:'ភូមិព្រៃមេលងខាងត្បូង', pobCommune:'ឃុំព្រៃខ្លា', pobDistrict:'ស្រុកកោះអណ្តែត', pobProvince:'ខេត្តតាកែវ',
        fatherName:'សុខ សំណាង', motherName:'គង់ សុភី', fatherPhone:'012 345 678', motherPhone:'098 765 432'
    };
    for (const part of ['Village','Commune','District','Province']) student['current'+part] = student['pob'+part];
    const settings = { principalPhone:'092 30 59 01', ictPhone:'099 42 92 41', issueDate:'2026-08-05', principalName:'សុខ សុវណ្ណ' };
    await win.webContents.executeJavaScript(`
        const oldPhoto = document.createElement('canvas');
        oldPhoto.width = 315; oldPhoto.height = 400;
        const oldPhotoContext = oldPhoto.getContext('2d');
        oldPhotoContext.fillStyle = '#3b86ee'; oldPhotoContext.fillRect(0, 0, 315, 400);
        oldPhotoContext.fillStyle = '#33251f'; oldPhotoContext.beginPath(); oldPhotoContext.arc(157, 155, 52, 0, Math.PI * 2); oldPhotoContext.fill();
        oldPhotoContext.fillStyle = '#f0f3f7'; oldPhotoContext.fillRect(58, 205, 198, 195);
        const studentWithPhoto = { ...${JSON.stringify(student)}, photo:oldPhoto.toDataURL('image/png') };
        document.body.innerHTML = StudentCardTemplate.render([studentWithPhoto], ${JSON.stringify(settings)}, ${JSON.stringify(logo)}, '២០២៥-២០២៦');
        document.body.style.margin='0';
        document.querySelector('.cards-grid').style.justifyContent='start';
        document.querySelector('.cards-grid').style.gridTemplateColumns='75mm';
    `);
    await win.webContents.executeJavaScript('document.fonts.ready');
    await win.webContents.executeJavaScript('Promise.all(Array.from(document.images, i => i.decode().catch(() => {})))');
    await win.webContents.executeJavaScript('StudentCardTemplate.fitText(document)');
    await win.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const metrics = await win.webContents.executeJavaScript(`(() => {
        const card = document.querySelector('.certificate-student-card').getBoundingClientRect();
        const overflow = [...document.querySelectorAll('[data-card-fit]')].filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.textContent);
        const photo = document.querySelector('[data-card-photo]');
        const slot = document.querySelector('.card-photo-slot').getBoundingClientRect();
        const photoBounds = photo.getBoundingClientRect();
        const frame = document.querySelector('.reference-photo-box').getBoundingClientRect();
        return { width:card.width, height:card.height, overflow, teacherVisible:document.body.innerText.includes('គ្រូបន្ទុកថ្នាក់'), fonts:document.fonts.check('18px "Khmer OS Siemreap"'), photoReframed:photo?.src.startsWith('data:image/jpeg'), photoFillsSlot:Math.abs(photoBounds.height-slot.height)<1 && Math.abs(photoBounds.width-slot.width)<1, frameHeight:frame.height };
    })()`);
    const shot = await win.webContents.capturePage({ x:0,y:0,width:Math.ceil(metrics.width),height:Math.ceil(metrics.height) });
    fs.writeFileSync(path.join(out, 'student-card-75x100.png'), shot.toPNG());
    // Reference-sized review makes placement comparison with the user's screenshot easy.
    await win.webContents.executeJavaScript(`
        const style=document.createElement('style');
        style.textContent='.certificate-student-card{width:590px;height:614px;border:3px solid #1717ff}.reference-artwork{transform:none}.cards-grid{grid-template-columns:590px!important}';
        document.body.append(style);
    `);
    await win.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    win.webContents.debugger.attach('1.3');
    const referenceShot = await win.webContents.debugger.sendCommand('Page.captureScreenshot', {
        format:'png', captureBeyondViewport:true, clip:{ x:0,y:0,width:590,height:614,scale:1 }
    });
    fs.writeFileSync(path.join(out, 'student-card-reference-review.png'), Buffer.from(referenceShot.data, 'base64'));
    win.webContents.debugger.detach();
    fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify(metrics, null, 2));
    console.log(JSON.stringify(metrics));
    win.destroy();
    if (Math.abs(metrics.width - 75*96/25.4) > .1 || Math.abs(metrics.height - 100*96/25.4) > .1 || metrics.overflow.length || metrics.teacherVisible || !metrics.photoReframed || !metrics.photoFillsSlot || metrics.frameHeight > 115) throw new Error('Card layout validation failed');
    app.quit();
}).catch(error => { console.error(error); app.exit(1); });
