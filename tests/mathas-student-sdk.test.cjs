// Tests de non-régression SDK Math'as V0.1 (exécutables Node 20+).
// node --test tests/mathas-student-sdk.test.cjs
// Aucun accès internet et aucune écriture Supabase.
const test=require('node:test'), assert=require('node:assert/strict'), vm=require('node:vm'), fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','sdk','mathas-student-sdk.js'),'utf8');
function launch(fakeFetch) {
  const window={
    MATHAS_CONFIG:{supabase:{publishableKey:'sb_publishable_TEST_PUBLIC'}},
    fetch:fakeFetch
  };
  window.window=window;
  const context=vm.createContext({window,fetch:(...args)=>window.fetch(...args)});
  vm.runInContext(source,context);
  return window.MathasStudentSDK;
}
test('Aucun ticket = libre, aucune requête',async()=>{
  let calls=0;const sdk=launch(()=>{calls++;throw Error('network must not be called')});
  const state=await sdk.boot({appId:8,source:'direct'});
  assert.equal(state.mode,'libre');assert.equal(calls,0);
});
test('HUB partagé = libre même avec un ticket',async()=>{
  let calls=0;const sdk=launch(()=>{calls++;throw Error('network must not be called')});
  assert.equal((await sdk.boot({appId:8,source:'partage',accessToken:'fake',launchTicket:'fake'})).mode,'libre');
  assert.equal(calls,0);
});
test('Depuis un HUB de classe, pas de token de connexion = libre',async()=>{
  let calls=0;const sdk=launch(()=>{calls++;throw Error('network must not be called')});
  assert.equal((await sdk.boot({appId:8,source:'classe',launchTicket:'fake'})).mode,'libre');
  assert.equal(calls,0);
});
test('Ticket invalide refusé = retour au mode libre',async()=>{
  let calls=0;const sdk=launch(async()=>{calls++;return {ok:false,status:403,json:async()=>({ok:false,error:'invalid_ticket'})}});
  const state=await sdk.boot({appId:8,source:'classe',launchTicket:'fake',accessToken:'fake'});
  assert.equal(state.mode,'libre');assert.equal(state.lastError,'invalid_ticket');assert.equal(calls,1);
});
test('Ticket accepté par le serveur = élève autorisé',async()=>{
  const sdk=launch(async(url,req)=>{
    assert.equal(JSON.parse(req.body).action,'redeem_launch');
    return {ok:true,status:200,json:async()=>({ok:true,launchSecret:'mock',student:{id:'eleve-test',displayName:'Thomas'}})};
  });
  const state=await sdk.boot({appId:8,source:'classe',launchTicket:'fake',accessToken:'fake'});
  assert.equal(state.mode,'eleve');assert.equal(state.student.displayName,'Thomas');
});
test('Refus par check_launch révoque le mode élève',async()=>{
  let calls=0;const sdk=launch(async()=>{
    calls++;
    return calls===1
    ?{ok:true,json:async()=>({ok:true,launchSecret:'mock',student:{id:'test'}})}
    :{ok:false,json:async()=>({error:'launch_not_authorized'})};
  });
  await sdk.boot({appId:8,source:'classe',launchTicket:'fake',accessToken:'fake'});
  const state=await sdk.check('fake');
  assert.equal(state.mode,'libre');
});
test('Les résultats ne sont pas encore envoyés par le SDK de brouillon',async()=>{
 const sdk=launch(()=>{throw Error('unexpected')});
 await assert.rejects(sdk.submitCompletedActivity(),/not_implemented/);
 await assert.rejects(sdk.submitProgressEvent(),/not_implemented/);
});
