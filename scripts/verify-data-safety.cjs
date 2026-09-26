// Regression tests use fake records and mocked endpoints only; no network access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function section(from, to) {
    const start = html.indexOf(from);
    const end = html.indexOf(to, start + from.length);
    assert.ok(start >= 0 && end > start, `Missing production section ${from}`);
    return html.slice(start, end);
}
const photoCode = section('    function googlePhotoKey(', '    function loadPendingCloudMutations(');
function photoContext() {
    const context = vm.createContext({
        console, setTimeout, Date,
        pendingGooglePhotos:new Map(), googlePhotoResults:new Map(), localPhotoLookups:new Set(), googlePhotoQueue:Promise.resolve(),
        visiblePhotoRefreshScheduled:false, lastGoogleDataRevision:'r1',
        GOOGLE_SHEET_PROVIDER:'google', getCloudProvider:() => 'google', hasGoogleScriptUrl:() => true,
        safePhotoSrc:value => value || '', cacheStudentPhoto:async () => true, allStudents:[],
        document:{ body:{ classList:{ contains:() => false } } }, window:{addEventListener:() => {}},
        els:{studentList:{querySelectorAll:() => []}}, isMobileView:() => false, innerHeight:800,
        restoreStudentPhoto:async student => student,
        requestAnimationFrame:fn => setTimeout(fn, 0), visibleStudents:[], renderStudentViews:() => {},
    });
    vm.runInContext(photoCode, context);
    return context;
}
async function waitFor(predicate) {
    for (let i = 0; i < 200; i++) {
        if (predicate()) return;
        await new Promise(resolve => setTimeout(resolve, 5));
    }
    throw new Error('Deferred photo test timed out');
}
(async () => {
    // Loading a visible batch must not read photos below the viewport.
    const c = photoContext();
    c.allStudents = Array.from({length:9}, (_, n) => ({id:`student-${n}`, photo:''}));
    c.visibleStudents = c.allStudents;
    let visibleIds = c.allStudents.slice(0, 8).map(student => student.id);
    c.els.studentList.querySelectorAll = () => visibleIds.map(id => ({
        dataset:{id}, getBoundingClientRect:() => ({width:40, height:40, top:0, bottom:40})
    }));
    let calls = 0;
    c.readGoogleSheetJsonp = async params => {
        calls++;
        return {ok:true, students:params.studentIds.split(',').map(id => ({id, photo:id === 'student-8' ? 'photo-8' : ''}))};
    };
    c.hydrateVisibleStudentPhotos();
    await waitFor(() => calls === 1 && !c.visiblePhotoRefreshScheduled);
    assert.equal(c.allStudents[8].photo, '');
    visibleIds = [c.allStudents[8].id];
    c.hydrateVisibleStudentPhotos();
    await waitFor(() => c.allStudents[8].photo === 'photo-8' && !c.visiblePhotoRefreshScheduled);
    assert.equal(calls, 2);

    // A print/edit request joins the in-flight thumbnail request, then waits.
    const d = photoContext();
    d.allStudents = [{id:'one', photo:''}];
    let release;
    d.readGoogleSheetJsonp = () => new Promise(resolve => { release = resolve; });
    const first = d.hydrateStudentPhotosFromSheet(d.allStudents);
    let secondFinished = false;
    const second = d.hydrateStudentPhotosFromSheet(d.allStudents, 8, {strict:true}).then(() => { secondFinished = true; });
    await waitFor(() => release);
    assert.equal(secondFinished, false);
    release({ok:true, students:[{id:'one', photo:'portrait'}]});
    await Promise.all([first, second]);
    assert.equal(d.allStudents[0].photo, 'portrait');

    // A late server response cannot overwrite a newly uploaded portrait.
    d.allStudents = [{id:'two', photo:''}];
    release = null;
    const late = d.hydrateStudentPhotosFromSheet(d.allStudents);
    await waitFor(() => release);
    d.allStudents[0].photo = 'new-upload';
    release({ok:true, students:[{id:'two', photo:'old-portrait'}]});
    await late;
    assert.equal(d.allStudents[0].photo, 'new-upload');

    // Failed photo loads cool down in the list; explicit print can retry.
    const f = photoContext();
    f.allStudents = [{id:'retry', photo:''}];
    f.readGoogleSheetJsonp = async () => { throw new Error('offline'); };
    await assert.rejects(f.hydrateStudentPhotosFromSheet(f.allStudents, 8, {strict:true}));
    assert.equal(f.needsGooglePhoto(f.allStudents[0]), false);
    f.readGoogleSheetJsonp = async () => ({ok:true, students:[{id:'retry', photo:'restored'}]});
    await f.hydrateStudentPhotosFromSheet(f.allStudents, 8, {strict:true});
    assert.equal(f.allStudents[0].photo, 'restored');

    // Honor a backend's smaller page limit instead of silently skipping rows.
    const paging = vm.createContext({
        GOOGLE_SHEET_PAGE_SIZE:64, console,
        readGoogleSheetPage:async offset => ({ok:true, total:5, limit:2, revision:'r', settingsRevision:'s',
            students:Array.from({length:Math.min(2, 5-offset)}, (_, n) => ({id:offset+n}))}),
        readGoogleSheetJsonp:async () => ({ok:true, revision:'r', settingsRevision:'s'})
    });
    vm.runInContext(section('    async function readGoogleSheetStudents(', '    function rememberGoogleSheetRevisions('), paging);
    assert.deepEqual(Array.from((await paging.readGoogleSheetStudents()).students, row => row.id), [0,1,2,3,4]);

    // Do not commit a cloud snapshot after an intervening local write.
    const safety = vm.createContext({
        googleSheetLoadsInFlight:0, localStudentWriteVersion:0, hasGoogleScriptUrl:() => true,
        setCloudControlsLoading:() => {}, setStatus:() => {},
        readGoogleSheetStudents:async () => {
            safety.localStudentWriteVersion++;
            return {ok:true, students:[{id:'old'}]};
        },
        applySharedAppSettings:() => {}, normalizeCloudStudent:row => row,
        loadPendingCloudMutations:() => [], applyPendingMutationsToStudents:rows => rows,
        rememberGoogleSheetRevisions:() => { throw new Error('Stale response must not be committed'); },
        allStudents:[{id:'new-local'}], console
    });
    vm.runInContext(section('    async function loadStudentsFromGoogleSheet(', '    function loadStudentsFromCloudStorage('), safety);
    assert.equal(await safety.loadStudentsFromGoogleSheet(), false);
    assert.equal(safety.allStudents[0].id, 'new-local');
    assert.equal(safety.googleSheetLoadsInFlight, 0);

    // Slow cache writes cannot overwrite a newer local save.
    let finishOldCache;
    let storedRows;
    const storage = vm.createContext({
        localStudentWriteVersion:0, LOCAL_STUDENTS_KEY:'test',
        rememberStudentPhotos:rows => rows[0].id === 'old'
            ? new Promise(resolve => { finishOldCache = resolve; }) : Promise.resolve(true),
        hasCloudStorageConfig:() => true,
        localStorage:{setItem:(_key, value) => { storedRows = JSON.parse(value); }}, console
    });
    vm.runInContext(section('    async function saveToLocalStorage(', '    function studentPhotoCacheKey('), storage);
    const oldSave = storage.saveToLocalStorage([{id:'old'}]);
    await storage.saveToLocalStorage([{id:'new'}]);
    finishOldCache(true);
    await oldSave;
    assert.equal(storedRows[0].id, 'new');

    const filters = vm.createContext({hasActiveFilters:() => true, filteredStudents:[1,2,3], visibleStudents:[1], allStudents:[1,2,3,4]});
    vm.runInContext(section('    function printableRows(', '    function printStudentNameList('), filters);
    assert.deepEqual(Array.from(filters.printableRows()), [1,2,3]);
    console.log('Data safety passed: lazy photos, shared requests, upload preservation, retry, pagination, stale-load protection, filtered print.');
})().catch(error => { console.error(error); process.exitCode = 1; });
