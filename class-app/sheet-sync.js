/* Read-only roster sync from the existing Student Registration Apps Script.
   Registration records stay authoritative in the Students tab. */
const CLASS_SHEET_ID='1b_gIFGpQZpzHyM-pXQZG-GiXjsTwcGsl39BNZKjM0iA';
const CLASS_SCRIPT_URL='https://script.google.com/macros/s/AKfycbyc_1v8DBczUTac1CprLsj2Ae5uKt8In-XGpB6lXXmCZj7Mm-4OL1DPSJjNXsD-G2GK/exec';
const CLASS_KEY_STORE='studentRegistrationGoogleSheetAccessKey';
let classSyncCallback=0;

function classSheetPage(offset,key){
  return new Promise((resolve,reject)=>{
    const callback='classSheetCb_'+Date.now()+'_'+(++classSyncCallback);
    const tag=document.createElement('script');let done=false;
    tag.referrerPolicy='no-referrer';
    const finish=(err,data)=>{if(done)return;done=true;clearTimeout(timer);tag.remove();delete window[callback];err?reject(err):resolve(data)};
    const timer=setTimeout(()=>finish(new Error('Google Sheet response timeout')),30000);
    window[callback]=data=>finish(null,data);
    const url=new URL(CLASS_SCRIPT_URL);
    url.searchParams.set('action','listpage');url.searchParams.set('offset',String(offset));
    url.searchParams.set('limit','100');url.searchParams.set('includePhotos','0');
    url.searchParams.set('callback',callback);if(key)url.searchParams.set('key',key);
    tag.onerror=()=>finish(new Error('Google Sheet connection failed'));
    tag.src=url.toString();document.head.append(tag);
  });
}

async function readClassSheet(key){
  const first=await classSheetPage(0,key);
  if(!first||first.ok!==true||!Array.isArray(first.students))throw new Error(first?.error||'Invalid Google Sheet response');
  const total=Number(first.total),revision=String(first.revision||''),limit=Number(first.limit);
  if(!Number.isInteger(total)||total<0||!Number.isInteger(limit)||limit<1||first.students.length!==Math.min(total,limit))throw new Error('Invalid Google Sheet page size');
  const pages=[first],offsets=[];
  for(let offset=limit;offset<total;offset+=limit)offsets.push(offset);
  for(let i=0;i<offsets.length;i+=3){
    const batch=await Promise.all(offsets.slice(i,i+3).map(offset=>classSheetPage(offset,key)));
    for(const page of batch){
      if(!page||page.ok!==true||!Array.isArray(page.students))throw new Error(page?.error||'Invalid Google Sheet response');
      if(Number(page.total)!==total||String(page.revision||'')!==revision)throw new Error('Google Sheet changed during loading; try again');
      pages.push(page);
    }
  }
  const students=pages.flatMap(page=>page.students);
  if(students.length!==total)throw new Error('Incomplete Google Sheet response');
  return {students,revision,total};
}

function classSheetStudent(row){
  const id=String(row.id||row.studentId||'').trim();
  const name=String(row.studentName||row.name||'').trim();
  const className=String(row.className||'').trim();
  if(!id||!name||!className)return null;
  return {id,name,className,sex:normSex(row.gender||row.sex),dob:normDob(row.dob||''),
    guardian:String(row.guardianName||row.fatherName||row.motherName||'').trim(),
    phone:String(row.contact||row.fatherPhone||row.motherPhone||'').trim(),
    studentCode:String(row.studentCode||'').trim()};
}

function classLooksLikeDemo(){
  return ROOT.classes.length===3&&ROOT.classes.every(c=>c.students.length>0&&c.students.every(s=>/^s[123]_\d+$/.test(s.id)));
}

function mergeClassSheetRoster(rows){
  const mapped=rows.map(classSheetStudent).filter(Boolean);
  const skipped=rows.length-mapped.length;
  if(!mapped.length&&rows.length)throw new Error('No valid student ID, name, and class in response');
  const seen=new Set(),unique=mapped.filter(s=>{if(seen.has(s.id))return false;seen.add(s.id);return true});
  const removeDemo=classLooksLikeDemo();
  if(removeDemo&&unique.length){
    ROOT.classes=[];
    if(ROOT.teachers.length===4&&ROOT.teachers.every((t,i)=>t.id==='t'+(i+1)))ROOT.teachers=[];
    if(ROOT.notices.length===1&&ROOT.notices[0].id==='n1')ROOT.notices=[];
  }
  let added=0,updated=0,classes=0;
  for(const s of unique){
    const key=clsKey(s.className);
    let c=ROOT.classes.find(x=>clsKey(x.name)===key);
    if(!c){c=emptyClass(/^ថ្នាក់/.test(s.className)?s.className:'ថ្នាក់ទី '+s.className,'');c.published=false;ROOT.classes.push(c);classes++}
    const previous=ROOT.classes.find(x=>x!==c&&x.students.some(student=>student.id===s.id));
    if(previous)previous.students=previous.students.filter(student=>student.id!==s.id);
    const current=c.students.find(x=>x.id===s.id);
    if(current){Object.assign(current,{name:s.name,sex:s.sex,dob:s.dob,guardian:s.guardian,phone:s.phone,studentCode:s.studentCode});updated++}
    else{c.students.push({id:s.id,name:s.name,sex:s.sex,dob:s.dob,guardian:s.guardian,phone:s.phone,studentCode:s.studentCode,w:null,h:null});added++}
  }
  if(!ROOT.classes.length)ROOT.classes.push(emptyClass('ថ្នាក់ទី ៧ក',''));
  ROOT.sheetSource={id:CLASS_SHEET_ID,revision:'',syncedAt:new Date().toISOString()};
  bind(ROOT.classes[0].id);save();fillClassSelect();
  return {added,updated,classes,skipped,total:unique.length};
}

const originalImportRender=V.import.render;
V.import.render=function(el){
  el.innerHTML=`<div class="page"><div class="card" id="liveSheet" style="margin-bottom:16px">
    <h3>ភ្ជាប់បញ្ជីសិស្សពី Google Sheet ដែលមានស្រាប់</h3>
    <p class="hint">ប្រភព៖ <a href="https://docs.google.com/spreadsheets/d/${CLASS_SHEET_ID}/edit" target="_blank" rel="noopener">ចុះឈ្មោះសិស្សV3</a> · ផ្ទាំង Students។ ការទាញនេះអានតែបញ្ជីសិស្ស ហើយមិនកែ Google Sheet ដើមទេ។</p>
    <label class="f" for="classSheetKey">លេខកូដចូល Google Sheet (ដូច App ចុះឈ្មោះសិស្ស)</label>
    <input class="in" id="classSheetKey" type="password" autocomplete="off" placeholder="បញ្ចូលលេខកូដ បើមិនទាន់បានកំណត់" style="max-width:440px">
    <div class="row" style="margin-top:10px"><button class="btn pri" id="classSheetSync">ទាញបញ្ជីសិស្សថ្មី</button><span id="classSheetStatus" role="status" aria-live="polite"></span></div>
    <p class="hint" style="margin-top:8px">ការទាញម្ដងទៀតផ្គូផ្គងតាម ID សិស្ស។ ពិន្ទុ និងវត្តមានក្នុង App នៅដដែល។ សិស្សដែលលុបចេញពី Sheet មិនត្រូវបានលុបពី App ដោយស្វ័យប្រវត្តិទេ។</p>
  </div><div id="manualImport"></div></div>`;
  originalImportRender.call(V.import,el.querySelector('#manualImport'));
  const keyInput=$('#classSheetKey');
  $('#classSheetSync').onclick=async()=>{
    const key=keyInput.value.trim()||String(localStorage.getItem(CLASS_KEY_STORE)||'').trim();
    const button=$('#classSheetSync'),status=$('#classSheetStatus');
    button.disabled=true;status.textContent='កំពុងទាញទិន្នន័យ…';
    try{
      const result=await readClassSheet(key);
      const counts=mergeClassSheetRoster(result.students);
      ROOT.sheetSource.revision=result.revision;save();
      if(keyInput.value.trim())localStorage.setItem(CLASS_KEY_STORE,key);
      keyInput.value='';
      status.textContent=`បានទាញ ${kh(counts.total)} នាក់ · បន្ថែម ${kh(counts.added)} · កែព័ត៌មាន ${kh(counts.updated)} · ថ្នាក់ថ្មី ${kh(counts.classes)}${counts.skipped?' · រំលង '+kh(counts.skipped):''}`;
      toast('បានភ្ជាប់បញ្ជីសិស្សពី Google Sheet');
    }catch(e){
      const detail=String(e.message||e);
      status.textContent=/unauthorized|access key/i.test(detail)?'ទាញមិនបាន៖ សូមបញ្ចូលលេខកូដចូល Google Sheet ដែលបានកំណត់ក្នុង App ចុះឈ្មោះសិស្ស':'ទាញមិនបាន៖ '+detail;
    }
    finally{button.disabled=false}
  };
};
