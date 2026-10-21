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
w.MathasPilot=Object.freeze({ready,
async initStudent(){active();const s=await student.auth.getSession();if(s.error)throw s.error;if(!s.data.session){const n=await student.auth.signInAnonymously();if(n.error)throw n.error;}return call(student,'device_status')},
studentRequest:login=>call(student,'request_device',{login:String(login).trim().toLowerCase()}),
studentStatus:()=>call(student,'device_status'),
async teacherSignIn(email,password){active();const a=await teacher.auth.signInWithPassword({email,password});if(a.error)throw a.error;return call(teacher,'teacher_requests')},
teacherRequests:()=>call(teacher,'teacher_requests'),
async groups(){active();const r=await teacher.from('mathas_student_groups').select('id,display_name').eq('active',true);if(r.error)throw r.error;return r.data||[]},
teacherApprove:(requestId,verificationCode,firstName,surnameInitial,groupId)=>call(teacher,'approve_device',{requestId,verificationCode,firstName,surnameInitial,groupId}),
teacherRefuse:requestId=>call(teacher,'refuse_device',{requestId})
});
})(window);
