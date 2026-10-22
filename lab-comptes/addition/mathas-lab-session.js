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
async function submitCompletedActivity(event){
 if(state.mode!=='eleve'||!secret)throw Error('mode_libre');
 return call('attempt',{launchSecret:secret,attempt:{
 eventId:event.clientEventId,gameMode:event.mode,levelKey:event.levelKey,
 score:event.score,scoreMax:event.scoreMax,aidUsed:event.aidUsed,appVersion:event.appVersion,
 termination:event.termination
 }});
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
  secret=v.launchSecret;
  state.student=v.student;
  state.mode='eleve';
 }catch(e){state.error=String(e.message||e);}
 finally{state.ready=true;}
}
w.MathasStudentSDK=Object.freeze({getMode:mode,submitCompletedActivity,init:()=>started,status:()=>({...state})});
const started=init();
})(window);