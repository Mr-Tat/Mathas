/* Math'as LAB: namespace all game localStorage keys before any game script runs.
 * Never reads legacy keys; never touches Supabase auth keys.
 * The student scope is obtained from the approved account immediately before launch.
 */
(function(w){
'use strict';
const scopeKey='mathas-lab-addition-pupil';
let pupil='';
try{const hasTicket=new URLSearchParams(w.location.search).has('mathas_lab_ticket');const raw=hasTicket?w.sessionStorage.getItem(scopeKey):null;if(raw&&/^[0-9a-f-]{36}$/i.test(raw))pupil=raw;}catch{}
const namespace='mathas_lab_addition_v1_'+(pupil||'anonymous')+'__';
const originalGet=Storage.prototype.getItem;
const originalSet=Storage.prototype.setItem;
const originalRemove=Storage.prototype.removeItem;
const passthrough=k=>k==='mathas-test-student-v1'||k.startsWith('sb-')||k.startsWith('supabase.');
const name=k=>{const key=String(k);return passthrough(key)?key:namespace+key;};
Storage.prototype.getItem=function(k){return originalGet.call(this,this===w.localStorage?name(k):k);};
Storage.prototype.setItem=function(k,v){return originalSet.call(this,this===w.localStorage?name(k):k,v);};
Storage.prototype.removeItem=function(k){return originalRemove.call(this,this===w.localStorage?name(k):k);};
w.MathasLabStorage=Object.freeze({scoped:!!pupil,scope:pupil||null,version:'0.1.0'});
})(window);
