/* LAB identity indicator: no network claims until verified server ticket redemption. */
(function(w){
'use strict';
const el=document.getElementById('mathasLabIdentity');
if(!el)return;
function render(){
 const sdk=w.MathasStudentSDK;
 const state=sdk&&typeof sdk.status==='function'?sdk.status():null;
 if(!state){el.textContent='🧪 Mathas-Test — session indisponible';return;}
 if(state.mode==='eleve'&&state.student?.login){
  el.textContent='🧪 Connecté : '+state.student.login+' (Mathas-Test) · '+(state.saveMessage||'résultats séparés par élève');
 }else if(state.error){
  el.textContent='🧪 Mode libre — connexion LAB refusée : '+state.error;
 }else if(state.ready){
  el.textContent='🧪 Mode libre — scores de ce navigateur';
 }else{el.textContent='🧪 Mathas-Test — vérification de la session…';}
}
render();
w.addEventListener('mathas:lab-save-status',render);
const sdk=w.MathasStudentSDK;
if(!sdk||typeof sdk.init!=='function'){render();return;}
let finished=false;
const timeout=setTimeout(()=>{
 if(finished)return;
 el.textContent='🧪 Connexion LAB trop longue — ne pas enregistrer de score. Retourne au compte élève puis relance le jeu.';
},9000);
Promise.resolve().then(()=>sdk.init()).then(()=>{
 finished=true;clearTimeout(timeout);render();
},e=>{
 finished=true;clearTimeout(timeout);
 el.textContent='🧪 Connexion LAB impossible : '+String(e?.message||e);
});
})(window);
