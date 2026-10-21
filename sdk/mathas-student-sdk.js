/* Math'as SDK V0.1 — PROTOTYPE. Non déployé. Aucun score envoyé.
 * Les jeux "mode libre" (lien direct, HUB partagé, outil, externe)
 * ne demandent jamais de connexion et n'envoient aucune donnée.
 * Appeler boot({appId, launchTicket}) uniquement depuis le protocole
 * de lancement HUB classe. L'absence de ticket = mode libre.
 * Ne pas inclure de clé secrète serveur dans ce fichier.
 */
(function(global){
  'use strict';
  const SDK_VERSION='0.1.0-draft';
  const ROOT='https://jftzuslpelgzbdrftszw.supabase.co';
  const ACCESS_URL=ROOT+'/functions/v1/mathas-student-access';
  const PUBLISHABLE=global.MATHAS_CONFIG?.supabase?.publishableKey || '';
  const memory={mode:'libre',appId:null,launchSecret:null,student:null,lastError:null};
  const clone=()=>({mode:memory.mode,appId:memory.appId,student:memory.student,lastError:memory.lastError});
  async function call(action, params, accessToken) {
    if(!accessToken) throw new Error('auth_token_required');
    if(!PUBLISHABLE) throw new Error('publishable_key_required');
    const response=await fetch(ACCESS_URL,{
      method:'POST',cache:'no-store',
      headers:{'content-type':'application/json','apikey':PUBLISHABLE,
        'authorization':'Bearer '+accessToken},
      body:JSON.stringify({action,...params})
    });
    const data=await response.json().catch(()=>({error:'invalid_server_response'}));
    if(!response.ok||!data.ok)throw new Error(data.error||'mathas_access_error');
    return data;
  }
  async function boot({appId,launchTicket,accessToken,source='direct'}={}){
    memory.mode='libre';memory.student=null;memory.appId=null;memory.launchSecret=null;memory.lastError=null;
    const id=Number(appId);
    // Source is UI context ONLY. The server validates all real permissions.
    if(source!=='classe'||!Number.isInteger(id)||id<1||!launchTicket||!accessToken)return clone();
    try{
      const data=await call('redeem_launch',{applicationId:id,ticket:launchTicket},accessToken);
      memory.mode='eleve';memory.student=data.student;memory.appId=id;memory.launchSecret=data.launchSecret;
    }catch(e){memory.lastError=String(e?.message||e);}
    return clone();
  }
  async function check(accessToken){
    if(memory.mode!=='eleve'||!memory.launchSecret)return clone();
    try{
      await call('check_launch',{applicationId:memory.appId,launchSecret:memory.launchSecret},accessToken);
    }catch(e){
      memory.mode='libre';memory.student=null;memory.launchSecret=null;memory.lastError=String(e?.message||e);
    }
    return clone();
  }
  function getMode(){return clone()}
  // Placeholder: deliberately rejects calls before score validation/adapter exists.
  async function submitCompletedActivity(){throw new Error('mathas_scores_not_implemented_in_draft')}
  async function submitProgressEvent(){throw new Error('mathas_progress_not_implemented_in_draft')}
  global.MathasStudentSDK=Object.freeze({version:SDK_VERSION,boot,check,getMode,
    submitCompletedActivity,submitProgressEvent});
})(window);
