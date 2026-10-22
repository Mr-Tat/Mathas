(function(){
'use strict';
const panel=document.querySelector('.account-indicator');
const label=document.getElementById('accountMode');
const api=window.MathasPilot;
if(!panel||!label||!api||!api.ready)return;
api.peekStudent().then(function(state){
 if(state?.status!=='approved'||!state.student)return;
 label.textContent='Connecté';
 const name=document.createElement('span');
 name.className='account-student-name';
 name.textContent=state.student.private_display_name||state.student.first_name||'Élève';
 const group=document.createElement('span');
 group.className='account-student-class';
 group.textContent=document.getElementById('classLabel')?.textContent||'';
 const link=panel.querySelector('.account-modify');
 panel.insertBefore(name,link);
 panel.insertBefore(group,link);
}).catch(function(){label.textContent='Mode libre'});
})();