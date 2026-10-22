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
  el.textContent='🧪 Connecté : '+state.student.login+' (Mathas-Test) · scores locaux non attribués';
 }else if(state.error){
  el.textContent='🧪 Mode libre — connexion LAB refusée : '+state.error;
 }else if(state.ready){
  el.textContent='🧪 Mode libre — scores de ce navigateur';
 }else{el.textContent='🧪 Mathas-Test — vérification de la session…';}
}
render();
Promise.resolve(w.MathasStudentSDK?.init?.()).then(render,render);
})(window);
