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
  const raw=await req.text();if(raw.length>2048)return err(413,"too_large");
  let body;try{body=JSON.parse(raw)}catch{return err(400,"invalid_json")}
  if(!body||typeof body!=="object"||Array.isArray(body)||body.applicationId!==1||!["issue","redeem","check"].includes(body.action))return err(400,"invalid_action");
  const auth=createClient(URL,ANON,{auth:{persistSession:false,autoRefreshToken:false}});
  const user=await auth.auth.getUser(jwt);if(user.error||!user.data.user)return err(401,"invalid_session");
  const uid=user.data.user.id;
  const admin=createClient(URL,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
  const d=await admin.from("mathas_device_authorizations").select("student_id").eq("auth_user_id",uid).is("revoked_at",null).maybeSingle();
  if(d.error||!d.data)return err(403,"device_not_authorized");
  const sid=d.data.student_id;
  const st=await admin.from("mathas_students").select("account_status,login_name").eq("id",sid).maybeSingle();
  if(st.error||st.data?.account_status!=="active")return err(403,"student_inactive");
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
