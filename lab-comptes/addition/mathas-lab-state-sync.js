/* LAB V0.1 — progression and trophies only. Records/points remain unchanged remotely.
 * Read-modify-write with server revision protects concurrent browser sessions.
 * This is not yet the full score-record restoration system.
 */
(function(w){
'use strict';
const sdk=w.MathasStudentSDK,adapter=w.MathasLabProgress;
if(!sdk||!adapter)return;
let busy=false,requested=false;
function message(s){w.dispatchEvent(new CustomEvent('mathas:lab-save-status',{detail:{message:s}}));}
const object=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
const boolArray=x=>[0,1,2].map(i=>Array.isArray(x)&&x[i]===true);
function merge(local,remote){
 const a=object(local),b=object(remote),progression={};
 for(const k of ['level2','level3','sudden1','sudden2','sudden3','perfect1','perfect2','perfect3','hard'])progression[k]=a.progression?.[k]===true||b.progression?.[k]===true;
 const ta=object(a.trophies),tb=object(b.trophies),trophies={version:3,mastery:{},sudden:[],hardAwards:{},scoreOne:{},unlockedGold:ta.unlockedGold===true||tb.unlockedGold===true};
 const both=(x,y)=>boolArray(x).map((v,i)=>v||boolArray(y)[i]);
 trophies.sudden=both(ta.sudden,tb.sudden);
 for(const k of ['4','10','20'])trophies.mastery[k]=both(ta.mastery?.[k],tb.mastery?.[k]);
 for(const k of ['bronze','silver','gold']){trophies.hardAwards[k]=both(ta.hardAwards?.[k],tb.hardAwards?.[k]);trophies.scoreOne[k]=ta.scoreOne?.[k]===true||tb.scoreOne?.[k]===true;}
 return {schema_version:1,progression,trophies};
}
// Numeric HARD records are monotonic; merge by max per level.
const cfg=w.MathasAppConfig?.storage;
const recordKeys=[cfg?.hardRecords,cfg?.hardThree,cfg?.normal?.classic,cfg?.normal?.sudden].filter(Boolean);
function readJson(key){try{return object(JSON.parse(localStorage.getItem(key)||'null'));}catch{return {};}}
function numericMax(x,y,cap){
 const values=[x,y].map(Number).filter(n=>Number.isSafeInteger(n)&&n>=0&&n<=cap);
 return values.length?Math.max(...values):null;
}
function mergeRecords(remote){
 const result={};
 for(const key of recordKeys){
  const a=readJson(key),b=object(remote?.[key]),out={};
  if(key===cfg?.normal?.classic){
   for(const level of ['3','5','7']){
    const local=object(a[level]),server=object(b[level]),row={};
    for(const total of ['4','10','20']){
     const n=numericMax(local[total],server[total],Number(total));
     if(n!==null)row[total]=n;
    }
    if(Object.keys(row).length)out[level]=row;
   }
  }else{
   const levels=key===cfg?.normal?.sudden?['3','5','7']:['1','2','3'];
   for(const level of levels){
    const n=numericMax(a[level],b[level],10000);
    if(n!==null)out[level]=n;
   }
  }
  result[key]=out;
 }
 return result;
}
function restoreRecords(records){
 let changed=false;
 for(const key of recordKeys){
  const before=readJson(key),after=object(records[key]);
  if(JSON.stringify(before)!==JSON.stringify(after)){
   localStorage.setItem(key,JSON.stringify(after));changed=true;
  }
 }
 if(changed)w.dispatchEvent(new CustomEvent('mathas:lab-records-restored'));
}
async function sync(){
 if(busy){requested=true;return;}
 busy=true;
 try{
  if(sdk.getMode()?.mode!=='eleve')return;
  for(let attempt=0;attempt<3;attempt++){
   const remote=await sdk.readState(),row=remote.state;
   const local=adapter.snapshot();
   const merged=merge(local,row);
   // Preserve points untouched; merge only well-defined HARD numeric records.
   const records={...object(row?.records),...mergeRecords(row?.records)};
   // Avoid server writes when trophies/progression are already in sync.
   if(row && JSON.stringify(merged.progression)===JSON.stringify(row.progression) &&
      JSON.stringify(merged.trophies)===JSON.stringify(row.trophies) &&
      JSON.stringify(records)===JSON.stringify(object(row.records))){
    adapter.restore(merged);
    restoreRecords(records);
    return;
   }
   const payload={...merged,records,points_state:object(row?.points_state)};
   try{
    await sdk.writeState(payload,Number(row?.revision)||0);
    adapter.restore(merged);
    restoreRecords(records);
    message('✅ Progression, trophées et records synchronisés (LAB)');
    return;
   }catch(e){
    if(String(e.message||e)!=='revision_conflict'||attempt===2)throw e;
   }
  }
 }catch(e){message('⚠️ Progression à synchroniser : '+String(e.message||e));}
 finally{busy=false;if(requested){requested=false;sync();}}
}
sdk.init().then(()=>{if(sdk.getMode()?.mode==='eleve')sync();});
w.addEventListener('mathas:completed-activity',()=>{if(sdk.getMode()?.mode==='eleve')setTimeout(sync,200);});
})(window);
