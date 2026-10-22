const test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../core/client.js');
const contract=require('../core/contract.js');
const idA='123e4567-e89b-42d3-a456-426614174000',idB='123e4567-e89b-42d3-a456-426614174001';
const e='223e4567-e89b-42d3-a456-426614174000';
const example={eventId:e,activityKey:'addition.classic.10',mode:'classic',levelKey:'level-1',score:6,scoreMax:10,points:120,scoringVersion:'v1'};
function make(storage,overrides={}){
 const calls=[];
 const transport={
  redeem:async({ticket})=>({ok:true,student:{id:ticket==='A'?idA:idB,displayName:'test'},launchSecret:'s'.repeat(32)}),
  attempt:async req=>{calls.push(req);return {ok:true}},
  readSave:async()=>({ok:true,state:null}),
  writeSave:async()=>({ok:true,revision:1}),...overrides};
 return {client:core.create({applicationId:1,transport,storage,contract}),calls};
}
function store(){const kv=new Map();return {kv,getItem:k=>kv.get(k)||null,setItem:(k,v)=>kv.set(k,v)};}
test('mode libre : zéro appel et aucun résultat nominatif',async()=>{
 const {client}=make(store(),{redeem:async()=>{throw Error('appel inattendu')}});
 assert.equal((await client.boot({source:'direct',ticket:'A'})).mode,'libre');
 assert.equal((await client.submitActivity(example)).status,'ignored');
 assert.equal(await client.readSave(),null);
});
test('identité fournie exclusivement par le service',async()=>{
 const {client}=make(store());
 const status=await client.boot({source:'classe',ticket:'A'});
 assert.equal(status.student.id,idA);assert.equal(status.mode,'eleve');
 assert.equal(Object.hasOwn(status,'launchSecret'),false);
});
test('refus de ticket : retour au mode libre',async()=>{
 const {client}=make(store(),{redeem:async()=>({ok:false})});
 assert.equal((await client.boot({source:'classe',ticket:'A'})).mode,'libre');
});
test('hors connexion : file persistante et idempotente au retour',async()=>{
 const storage=store();let offline=true;const calls=[];
 const {client}=make(storage,{attempt:async v=>{calls.push(v.attempt.eventId);if(offline)throw Error('offline');return {ok:true}}});
 await client.boot({source:'classe',ticket:'A'});
 assert.equal((await client.submitActivity(example)).status,'queued');
 assert.equal((await client.submitActivity(example)).status,'queued');
 assert.equal(JSON.parse([...storage.kv.values()][0]).length,1);
 offline=false;assert.equal((await client.flush()).status,'sent');
 assert.equal(calls.length,3);assert.equal(JSON.parse([...storage.kv.values()][0]).length,0);
});
test('cloisonnement des tentatives entre élèves',async()=>{
 const storage=store();const {client}=make(storage,{attempt:async()=>{throw Error('offline')}});
 await client.boot({source:'classe',ticket:'A'});await client.submitActivity(example);client.close();
 assert.equal((await client.boot({source:'classe',ticket:'B'})).student.id,idB);
 const result=await client.flush();assert.equal(result.sent,0);
 assert.equal(JSON.parse([...storage.kv.values()][0]).length,1);
});
test('aucune écriture si la sauvegarde est inchangée',async()=>{
 let n=0;const {client}=make(store(),{writeSave:async()=>{n++;return {ok:true,revision:1}}});
 await client.boot({source:'classe',ticket:'A'});await client.readSave();
 assert.equal((await client.writeSave({schemaVersion:1,data:{}})).status,'unchanged');assert.equal(n,0);
 assert.equal((await client.writeSave({schemaVersion:1,data:{foo:'bar'}})).status,'saved');assert.equal(n,1);
});
test('conflit de révision : aucune fusion automatique',async()=>{
 const {client}=make(store(),{writeSave:async()=>{const err=Error('revision_conflict');err.status=409;throw err}});
 await client.boot({source:'classe',ticket:'A'});await client.readSave();
 assert.equal((await client.writeSave({schemaVersion:1,data:{records:{best:8}}})).status,'conflict');
});
test('lecture préalable et Master Mode protégés',async()=>{
 const {client}=make(store());await client.boot({source:'classe',ticket:'A'});
 await assert.rejects(client.writeSave({schemaVersion:1,data:{foo:1}}),/save_must_be_read_first/);
 assert.equal((await client.submitActivity({...example,masterMode:true})).status,'ignored');
});
