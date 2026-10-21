/* Math'as Lab — lancement classe TEST SEULEMENT, aucune ecriture de score */
import { createClient } from "npm:@supabase/supabase-js@2";
const LAB = "https://bzdflehyuowbawdzuawh.supabase.co";
const ORIGIN = "http://localhost:8765";
const URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SHA = async s => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,"0")).join("");
const RANDOM = () => Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
const NEXT = m=>new Date(Date.now()+m*60000).toISOString();
const NOW = ()=>new Date().toISOString();
const h={"content-type":"application/json","cache-control":"no-store","access-control-allow-origin":ORIGIN,"access-control-allow-headers":"apikey, authorization, content-type","access-control-allow-methods":"POST, OPTIONS","vary":"Origin"};
const reply=(status,value)=>new Response(JSON.stringify(value),{status,headers:h});
const err=(status,error)=>reply(status,{ok:false,error});
const isSecret=s=>typeof s==="string" && /^[0-9a-f]{64}$/.test(s);
Deno.serve(async req=>{
 if(req.headers.get("origin")!==ORIGIN)return err(403,"origin_denied");
 if(req.method==="OPTIONS")return reply(200,{ok:true});
 if(req.method!=="POST")return err(405,"method_not_allowed");
 if(URL!==LAB||!SERVICE||!ANON)return err(503,"lab_only");
 try{
  const jwt=req.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if(!jwt)return err(401,"authorization_required");
  const raw=await req.text();if(raw.length>17000)return err(413,"too_large");
  let body;try{body=JSON.parse(raw)}catch{return err(400,"invalid_json")}
  if(!body||typeof body!=="object"||Array.isArray(body)||body.applicationId!==1||!["issue","redeem","check","attempt","state_read","state_write"].includes(body.action))return err(400,"invalid_action");
  const auth=createClient(URL,ANON,{auth:{persistSession:false,autoRefreshToken:false}});
  const user=await auth.auth.getUser(jwt);if(user.error||!user.data.user)return err(401,"invalid_session");
  const uid=user.data.user.id;
  const admin=createClient(URL,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
  const d=await admin.from("mathas_device_authorizations").select("student_id").eq("auth_user_id",uid).is("revoked_at",null).maybeSingle();
  if(d.error||!d.data)return err(403,"device_not_authorized");
  const sid=d.data.student_id;
  const st=await admin.from("mathas_students").select("account_status,login_name").eq("id",sid).maybeSingle();
  if(st.error||st.data?.account_status!=="active")return err(403,"student_inactive");
  // Les donnees LAB ne peuvent etre ecrites que depuis une session classe.
  if(["attempt","state_read","state_write"].includes(body.action)){
   if(!isSecret(body.launchSecret))return err(403,"class_ticket_required");
   const live=await admin.from("mathas_launch_sessions").select("id")
    .eq("session_hash",await SHA(body.launchSecret)).eq("auth_user_id",uid)
    .eq("student_id",sid).eq("application_id",1)
    .is("revoked_at",null).gt("expires_at",NOW()).maybeSingle();
   if(live.error||!live.data)return err(403,"class_session_required");
   if(body.action==="state_read"){
    const state=await admin.from("mathas_lab_addition_progress")
     .select("schema_version,progression,trophies,records,points_state,revision")
     .eq("student_id",sid).maybeSingle();
    if(state.error)return err(500,"state_read_failed");
    return reply(200,{ok:true,state:state.data});
   }
   if(body.action==="attempt"){
    const a=body.attempt;
    const uuidRe=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const modes=["classic","sudden","hard_challenge","hard_sudden"];
    if(!a||typeof a!=="object"||!uuidRe.test(a.eventId||"")||
       !modes.includes(a.gameMode)||!Number.isSafeInteger(a.score)||a.score<0||a.score>1000||
       !(a.scoreMax===null||(Number.isSafeInteger(a.scoreMax)&&a.scoreMax>=1&&a.scoreMax<=20&&a.score<=a.scoreMax))||
       typeof a.levelKey!=="string"||a.levelKey.length>70)return err(400,"invalid_attempt");
    const count=await admin.from("mathas_student_attempts")
     .select("id",{count:"exact",head:true}).eq("student_id",sid)
     .eq("application_id",1).eq("mode","laboratoire");
    if(count.error||Number(count.count??9999)>500)return err(429,"lab_attempt_limit");
    const result=await admin.from("mathas_student_attempts").upsert({
      student_id:sid,application_id:1,client_event_id:a.eventId,
      mode:"laboratoire",difficulty:"jeu-reel-test",score:a.score,score_max:a.scoreMax,
      correct_count:a.score,question_count:a.scoreMax,
      level_key:a.levelKey,app_version:String(a.appVersion||"test").slice(0,36),
      scoring_version:"lab-v2",validation_status:"quarantined",
      extra:{lab_only:true,source:"addition-ecrite-simple-lab",
             game_mode:a.gameMode,aid_used:a.aidUsed===true,termination:a.termination==="first_error"?"first_error":"completed"}
    },{onConflict:"student_id,application_id,client_event_id",ignoreDuplicates:true});
    if(result.error)return err(500,"attempt_write_failed");
    return reply(200,{ok:true,stored:true});
   }
   const state=body.state;
   const oldRev=body.revision;
   if(!state||typeof state!=="object"||state.schema_version!==1||
      !Number.isSafeInteger(oldRev)||oldRev<0||oldRev>10000000||
      !["progression","trophies","records","points_state"].every(k=>state[k]&&typeof state[k]==="object"&&!Array.isArray(state[k])))return err(400,"invalid_state");
   const max={progression:1500,trophies:2400,records:6000,points_state:8000};
   for(const k of Object.keys(max))if(JSON.stringify(state[k]).length>max[k])return err(400,"state_too_large");
   const payload={progression:state.progression,trophies:state.trophies,
     records:state.records,points_state:state.points_state,
     updated_at:NOW(),revision:oldRev+1};
   if(oldRev===0){
    const write=await admin.from("mathas_lab_addition_progress").upsert({
     student_id:sid,application_id:1,schema_version:1,...payload
    },{onConflict:"student_id",ignoreDuplicates:true}).select("revision");
    if(write.error)return err(500,"state_write_failed");
    if(!write.data?.length)return err(409,"revision_conflict");
    return reply(200,{ok:true,revision:1});
   }
   const write=await admin.from("mathas_lab_addition_progress")
    .update(payload).eq("student_id",sid).eq("revision",oldRev)
    .select("revision").maybeSingle();
   if(write.error)return err(500,"state_update_failed");
   if(!write.data)return err(409,"revision_conflict");
   return reply(200,{ok:true,revision:write.data.revision});
  }
  if(body.action==="issue"){
   const recent=await admin.from("mathas_launch_tickets").select("id",{count:"exact",head:true}).eq("auth_user_id",uid).eq("application_id",1).gte("issued_at",new Date(Date.now()-60000).toISOString());
   if(recent.error||Number(recent.count??100)>=5)return err(429,"too_many_launches");
   const ticket=RANDOM();
   const ins=await admin.from("mathas_launch_tickets").insert({ticket_hash:await SHA(ticket),auth_user_id:uid,student_id:sid,application_id:1,expires_at:NEXT(1)});
   if(ins.error)return err(500,"ticket_creation_failed");
   return reply(200,{ok:true,ticket,expiresInSeconds:60});
  }
  if(body.action==="redeem"){
   if(!isSecret(body.ticket))return err(400,"invalid_ticket");
   const claim=await admin.from("mathas_launch_tickets").update({redeemed_at:NOW()}).eq("ticket_hash",await SHA(body.ticket)).eq("auth_user_id",uid).eq("student_id",sid).eq("application_id",1).is("redeemed_at",null).gt("expires_at",NOW()).select("id").maybeSingle();
   if(claim.error||!claim.data)return err(403,"ticket_used_or_expired");
   const launchSecret=RANDOM();
   const ins=await admin.from("mathas_launch_sessions").insert({session_hash:await SHA(launchSecret),auth_user_id:uid,student_id:sid,application_id:1,expires_at:NEXT(180)});
   if(ins.error)return err(500,"session_creation_failed");
   return reply(200,{ok:true,launchSecret,student:{id:sid,login:st.data.login_name},expiresInSeconds:10800});
  }
  if(!isSecret(body.launchSecret))return err(400,"invalid_launch_secret");
  const a=await admin.from("mathas_launch_sessions").select("id").eq("session_hash",await SHA(body.launchSecret)).eq("auth_user_id",uid).eq("student_id",sid).eq("application_id",1).is("revoked_at",null).gt("expires_at",NOW()).maybeSingle();
  if(a.error||!a.data)return err(403,"class_session_expired");
  return reply(200,{ok:true,authorized:true,student:{id:sid,login:st.data.login_name}});
 }catch(e){console.error("lab launch failure",e);return err(500,"server_error")}
});
