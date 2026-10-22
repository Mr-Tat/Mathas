/* Mathas-Test V1.9.4 — secure LAB game launch, persistent on reload only.
 * A class session is issued only after redeeming a single-use ticket.
 * The ticket is removed from the visible URL immediately.
 * A reload may resume the already validated session in this TAB only.
 * A direct navigation without a fresh ticket always remains free play.
 */
(function(w){'use strict';
const cfg=w.MATHAS_LAB;
let resolve;
const ready=new Promise(r=>{resolve=r});
let state={authorized:false,reason:'Aucun ticket de lancement depuis le HUB'};
w.MathasLabClassGate=Object.freeze({version:'1.9.4-lab',ready,status:()=>({...state})});
const SESSION_KEY='mathas-lab-class-session-v194';
const idRe=/^[0-9a-f]{64}$/;
function forget(){try{sessionStorage.removeItem(SESSION_KEY)}catch{}}
function readSession(){
 try{
  const value=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');
  return value && idRe.test(value.launchSecret||'') ? value : null;
 }catch{return null;}
}
function saveSession(value){
 try{sessionStorage.setItem(SESSION_KEY,JSON.stringify({launchSecret:value.launchSecret,studentId:value.studentId}));}
 catch{/* Class session for this tab remains active until navigation; reload not guaranteed. */}
}
(async()=>{
 try{
  if(location.origin!==cfg.localOrigin)throw Error('Origine non autorisée');
  const fragment=new URLSearchParams(location.hash.slice(1));
  const ticket=fragment.get('mathas_class_ticket');
  if(ticket!==null)history.replaceState(null,'',location.pathname+location.search);
  const navigationType=performance.getEntriesByType('navigation')[0]?.type||'navigate';
  let secret=null, boundId=null;
  if(ticket!==null){
   forget();
   if(!idRe.test(ticket))throw Error('Ticket non valide');
   const access=await w.MathasLabClient.classRequest('redeem',{ticket});
   if(!access.ok||!idRe.test(access.launchSecret||''))throw Error('Ticket refusé');
   secret=access.launchSecret;
   boundId=access.student?.id;
  }else if(navigationType==='reload'){
   const prior=readSession();
   if(!prior)throw Error('Mode libre : aucun ticket de classe');
   secret=prior.launchSecret;
   boundId=prior.studentId;
  }else{
   forget();
   throw Error('Mode libre : lancement direct, sans suivi scolaire');
  }
  const check=await w.MathasLabClient.classRequest('check',{launchSecret:secret});
  if(!check.authorized||check.student?.id!==boundId)throw Error('Session de classe refusée');
  const student=await w.MathasLabClient.studentStatus();
  if(student.status!=='approved'||student.student?.id!==boundId)throw Error('Élève non reconnu');
  state={authorized:true,studentId:boundId,studentName:check.student.login,launchSecret:secret};
  saveSession({launchSecret:secret,studentId:boundId});
 }catch(e){forget();state={authorized:false,reason:String(e?.message||e)}}
 resolve({...state});
})();
})(window);
