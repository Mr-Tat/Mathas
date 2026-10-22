(function(w){'use strict';
const cfg=w.MATHAS_TEST_CONFIG,ref='bzdflehyuowbawdzuawh';
const ready=!!(cfg&&cfg.enabled===true&&cfg.projectRef===ref&&cfg.supabaseUrl==='https://'+ref+'.supabase.co'&&w.supabase?.createClient);
const mk=role=>ready?w.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{storageKey:'mathas-test-'+role+'-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
const student=mk('student'),teacher=mk('teacher');
function active(){if(!ready)throw Error('Pilote non activé : aucune opération envoyée.')}
async function call(client,action,values={}){
active();const s=await client.auth.getSession();if(s.error)throw s.error;
if(!s.data.session?.access_token)throw Error('Connexion requise');
const r=await w.fetch(cfg.supabaseUrl+'/functions/v1/mathas-student-access',{method:'POST',cache:'no-store',headers:{'content-type':'application/json',apikey:cfg.publishableKey,authorization:'Bearer '+s.data.session.access_token},body:JSON.stringify({action,...values})});
const v=await r.json().catch(()=>({}));if(!r.ok||v.ok!==true)throw Error(v.error||'Service indisponible');return v;
}
async function launchCall(action,values={}){
 const session=await student.auth.getSession();
 if(session.error||!session.data.session)throw Error('Session élève absente');
 const response=await w.fetch(cfg.supabaseUrl+'/functions/v1/mathas-lab-class-launch',{
 method:'POST',cache:'no-store',headers:{'content-type':'application/json',apikey:cfg.publishableKey,authorization:'Bearer '+session.data.session.access_token},
 body:JSON.stringify({action,applicationId:1,...values})
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.ok!==true)throw Error(data.error||'Service LAB indisponible');
 return data;
}
w.MathasPilot=Object.freeze({ready,
async initStudent(){active();const s=await student.auth.getSession();if(s.error)throw s.error;if(!s.data.session){const n=await student.auth.signInAnonymously();if(n.error)throw n.error;}return call(student,'device_status')},
studentRequest:login=>call(student,'request_device',{login:String(login).trim().toLowerCase()}),
async peekStudent(){if(!ready)return null;const v=await student.auth.getSession();if(v.error||!v.data.session)return null;return call(student,'device_status')},
async issueAdditionTicket(){
 active();
 const session=await student.auth.getSession();
 if(session.error)throw session.error;
 if(!session.data.session?.access_token)throw Error('Session élève absente');
 const status=await call(student,'device_status');
 if(status.status!=='approved')throw Error('Appareil non autorisé');
 if(!/^[0-9a-f-]{36}$/i.test(status.student?.id||''))throw Error('Identité élève non vérifiée');
 w.sessionStorage.setItem('mathas-lab-addition-pupil',status.student.id);
 const response=await w.fetch(cfg.supabaseUrl+'/functions/v1/mathas-lab-class-launch',{
  method:'POST',cache:'no-store',headers:{'content-type':'application/json',apikey:cfg.publishableKey,authorization:'Bearer '+session.data.session.access_token},
  body:JSON.stringify({action:'issue',applicationId:1})
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.ok!==true)throw Error(data.error||'Ticket indisponible');
 return data;
},
async signOutStudent(){
 active();
 // Server revokes this browser authorization and any active game session.
 const current=await student.auth.getSession();
 if(current.error)throw current.error;
 if(current.data.session)await launchCall('end_session');
 const out=await student.auth.signOut({scope:'local'});
 if(out.error)throw out.error;
 w.sessionStorage.removeItem('mathas-lab-addition-pupil');
 return {ok:true};
},
studentStatus:()=>call(student,'device_status'),
async teacherSignIn(email,password){active();const a=await teacher.auth.signInWithPassword({email,password});if(a.error)throw a.error;return call(teacher,'teacher_requests')},
teacherRequests:()=>call(teacher,'teacher_requests'),
async groups(){active();const r=await teacher.from('mathas_student_groups').select('id,display_name').eq('active',true);if(r.error)throw r.error;return r.data||[]},
teacherApprove:(requestId,verificationCode,firstName,surnameInitial,groupId)=>call(teacher,'approve_device',{requestId,verificationCode,firstName,surnameInitial,groupId}),
teacherRefuse:requestId=>call(teacher,'refuse_device',{requestId})
});
})(window);
