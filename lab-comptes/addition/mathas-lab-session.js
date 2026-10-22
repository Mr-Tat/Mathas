/* Math'as LAB-only session adapter. Loading this file never signs anyone in. */
(function(w){
'use strict';
const endpoint='https://bzdflehyuowbawdzuawh.supabase.co';
const storageKey='mathas-test-student-v1';
const q=new URLSearchParams(w.location.search);
const ticket=q.get('mathas_lab_ticket');
const state={mode:'libre',ready:false,student:null,error:null};
let client=null,secret=null;
const publicKey='sb_publishable_GK3FD97w8jK-WunbXqG61A_mJbLqyQ6';
async function call(action,body={}){
 const session=await client.auth.getSession();
 if(session.error||!session.data.session)throw Error('session_absente');
 const resp=await fetch(endpoint+'/functions/v1/mathas-lab-class-launch',{
  method:'POST',cache:'no-store',headers:{'content-type':'application/json',apikey:publicKey,authorization:'Bearer '+session.data.session.access_token},
  body:JSON.stringify({action,applicationId:1,...body})
 });
 const result=await resp.json().catch(()=>({}));
 if(!resp.ok||result.ok!==true)throw Error(result.error||'requete_refusee');
 return result;
}
function mode(){return {mode:state.mode,student:state.student};}
const queueKey='mathas_lab_pending_attempts_v1';
function savedQueue(){try{const a=JSON.parse(localStorage.getItem(queueKey)||'[]');return Array.isArray(a)?a.slice(0,100):[];}catch{return [];}}
function persist(items){localStorage.setItem(queueKey,JSON.stringify(items));}
function notify(message){state.saveMessage=message;w.dispatchEvent(new CustomEvent('mathas:lab-save-status',{detail:{message}}));}
let sending=null;
async function flush(){
 if(state.mode!=='eleve'||!secret)return;
 if(sending)return sending;
 sending=(async()=>{
  const queued=savedQueue();
  for(const attempt of queued){
   try{
    await call('attempt',{launchSecret:secret,attempt});
    persist(savedQueue().filter(x=>x.eventId!==attempt.eventId));
    notify('✅ Résultat sauvegardé dans Mathas-Test');
   }catch(e){
    notify('⚠️ Résultat en attente de sauvegarde : '+String(e.message||e));
    throw e;
   }
  }
 })();
 try{await sending;}finally{sending=null;}
}
async function submitCompletedActivity(event){
 if(state.mode!=='eleve'||!secret)throw Error('mode_libre');
 const attempt={
  eventId:event.clientEventId,gameMode:event.mode,levelKey:event.levelKey,
  score:event.score,scoreMax:event.scoreMax,aidUsed:event.aidUsed,appVersion:event.appVersion,
  termination:event.termination
 };
 if(!/^[0-9a-f-]{36}$/i.test(attempt.eventId||''))throw Error('identifiant_de_partie_invalide');
 const pending=savedQueue();
 if(!pending.some(x=>x.eventId===attempt.eventId))pending.push(attempt);
 if(pending.length>100)throw Error('file_de_sauvegarde_pleine');
 persist(pending);
 notify('⏳ Enregistrement du résultat…');
 await flush();
}
async function classState(action, values={}){
 if(state.mode!=='eleve'||!secret)throw Error('session_classe_absente');
 return call(action,{launchSecret:secret,...values});
}
async function init(){
 if(!ticket)return;
 // Retirer le ticket de l'adresse avant tout appel réseau et avant le chargement d'autres pages.
 const cleanUrl=new URL(w.location.href);
 cleanUrl.searchParams.delete('mathas_lab_ticket');
 w.history.replaceState(w.history.state,'',cleanUrl.pathname+cleanUrl.search+cleanUrl.hash);
 // A copied game URL without the student's authenticated browser is inert.
 try{
  if(!w.supabase?.createClient)throw Error('supabase_js_absent');
  client=w.supabase.createClient(endpoint,publicKey,{auth:{storageKey,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const v=await call('redeem',{ticket});
  // Fail closed: the local score namespace must match the server-verified pupil.
  // Never send a result from an anonymous or previously selected pupil scope.
  const scope=w.MathasLabStorage;
  if(!scope?.scoped||scope.scope!==v.student?.id)throw Error('identite_stockage_incoherente');
  secret=v.launchSecret;
  state.student=v.student;
  state.mode='eleve';
  try{await flush();}catch{}
 }catch(e){state.error=String(e.message||e);}
 finally{state.ready=true;}
}
w.MathasStudentSDK=Object.freeze({getMode:mode,submitCompletedActivity,init:()=>started,status:()=>({...state}),retryPending:flush,readState:()=>classState('state_read'),writeState:(state,revision)=>classState('state_write',{state,revision})});
w.addEventListener('online',()=>{if(state.mode==='eleve')flush().catch(()=>{});});
const started=init();
})(window);