/* Math'as BIS — passerelle générique. Zéro règle métier des jeux, zéro accès réseau automatique. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.MathasBisClient=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const fail=x=>{throw Error(x)};
  function create({applicationId,transport,storage,contract}={}){
    if(!Number.isSafeInteger(applicationId)||applicationId<1)fail('application_id_invalid');
    if(!transport||!['redeem','attempt','readSave','writeSave'].every(k=>typeof transport[k]==='function'))fail('transport_invalid');
    if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')fail('storage_required');
    if(!contract||typeof contract.activity!=='function'||typeof contract.save!=='function')fail('contract_required');
    let session=null,baseline=null,inFlight=null,error=null;
    function info(){return Object.freeze({mode:session?'eleve':'libre',student:session?.student??null,lastError:error});}
    function key(s){return 'mathas-bis-queue-v1:'+applicationId+':'+s.student.id;}
    function queue(k){
      let list;try{list=JSON.parse(storage.getItem(k)||'[]');}catch{fail('queue_corrupt');}
      if(!Array.isArray(list)||list.length>50||!list.every(x=>x&&UUID.test(x.eventId||'')))fail('queue_corrupt');
      return list;
    }
    function put(k,items){storage.setItem(k,JSON.stringify(items));}
    async function boot({source='direct',ticket}={}){
      if(session)fail('session_already_active');
      error=null;baseline=null;
      if(source!=='classe'||typeof ticket!=='string'||!ticket)return info();
      try{
        const result=await transport.redeem({applicationId,ticket});
        if(result?.ok!==true||!UUID.test(result.student?.id||'')||typeof result.launchSecret!=='string'||result.launchSecret.length<16)fail('launch_invalid');
        session={student:Object.freeze({id:result.student.id,displayName:String(result.student.displayName||'')}),secret:result.launchSecret};
      }catch(e){error=String(e?.message||e);session=null;}
      return info();
    }
    function close(){session=null;baseline=null;error=null;}
    async function flush(){
      if(!session)return {status:'ignored'};
      if(inFlight?.studentId===session.student.id)return inFlight.promise;
      const current=session,k=key(current);
      const task=(async()=>{
        let count=0;
        for(const item of queue(k)){
          try{
            const r=await transport.attempt({applicationId,launchSecret:current.secret,attempt:item});
            if(r?.ok!==true)fail('attempt_rejected');
            put(k,queue(k).filter(x=>x.eventId!==item.eventId));
            count++;
          }catch(e){error=String(e?.message||e);return {status:'queued',sent:count,error};}
        }
        error=null;return {status:'sent',sent:count};
      })();
      inFlight={studentId:current.student.id,promise:task};
      try{return await task;}finally{if(inFlight?.promise===task)inFlight=null;}
    }
    async function submitActivity(data){
      if(!session||data?.masterMode===true)return {status:'ignored'};
      const attempt=contract.activity(data),k=key(session);
      const list=queue(k);
      if(!list.some(x=>x.eventId===attempt.eventId)){
        if(list.length>=50)fail('queue_full');
        put(k,[...list,attempt]);
      }
      return flush();
    }
    async function readSave(){
      if(!session)return null;
      const r=await transport.readSave({applicationId,launchSecret:session.secret});
      if(r?.ok!==true)fail('state_read_rejected');
      const value=r.state||{schemaVersion:1,revision:0,resetEpoch:0,data:{}};
      baseline=contract.save(value);
      return baseline;
    }
    async function writeSave(data){
      if(!session)return {status:'ignored'};
      if(!baseline)fail('save_must_be_read_first');
      const candidate=contract.save({schemaVersion:data?.schemaVersion,revision:baseline.revision,resetEpoch:baseline.resetEpoch,data:data?.data});
      if(JSON.stringify({schemaVersion:candidate.schemaVersion,data:candidate.data})===
         JSON.stringify({schemaVersion:baseline.schemaVersion,data:baseline.data}))return {status:'unchanged',revision:baseline.revision};
      try{
        const r=await transport.writeSave({applicationId,launchSecret:session.secret,state:candidate});
        if(r?.ok!==true||!Number.isSafeInteger(r.revision)||r.revision<=baseline.revision)fail('state_write_rejected');
        baseline=contract.save({...candidate,revision:r.revision});
        return {status:'saved',revision:r.revision};
      }catch(e){if(e?.status===409||e?.message==='revision_conflict')return {status:'conflict'};throw e;}
    }
    return Object.freeze({boot,info,close,submitActivity,flush,readSave,writeSave});
  }
  return Object.freeze({create});
});
