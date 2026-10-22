/* Math'as BIS — contrat de données pur, sans accès réseau ni dépendance de jeu.
 * Les calculs de points/records et la résolution de conflits appartiennent aux applications.
 * browser + node compatible; aucun appel Supabase ici.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.MathasBisContract=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const MODE=Object.freeze({FREE:'libre',STUDENT:'eleve'});
 const isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const str=(v,max)=>typeof v==='string'&&v.length>0&&v.length<=max;
 const int=v=>Number.isSafeInteger(v)&&v>=0;
 function activity(value){
  if(!isObject(value))throw Error('result_invalid');
  if(!str(value.activityKey,90)||!/^[a-z0-9][a-z0-9._:-]*$/.test(value.activityKey))throw Error('activity_invalid');
  if(!str(value.mode,64)||!str(value.levelKey,90))throw Error('mode_or_level_invalid');
  if(!int(value.score)||value.score>1000000)throw Error('score_invalid');
  if(value.scoreMax!=null&&(!int(value.scoreMax)||value.scoreMax<1||value.score>value.scoreMax))throw Error('score_max_invalid');
  if(value.points!=null&&(!int(value.points)||value.points>10000000))throw Error('points_invalid');
  if(!str(value.scoringVersion,50))throw Error('scoring_version_invalid');
  if(!str(value.eventId,36)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.eventId))throw Error('event_id_invalid');
  return Object.freeze({eventId:value.eventId,activityKey:value.activityKey,mode:value.mode,
   levelKey:value.levelKey,score:value.score,scoreMax:value.scoreMax??null,
   points:value.points??null,scoringVersion:value.scoringVersion});
 }
 function save(value){
  if(!isObject(value)||!int(value.schemaVersion)||value.schemaVersion<1||!int(value.revision)||!int(value.resetEpoch)||!isObject(value.data))throw Error('save_invalid');
  const json=JSON.stringify(value.data);
  if(json.length>50000)throw Error('save_too_large');
  return Object.freeze({schemaVersion:value.schemaVersion,revision:value.revision,resetEpoch:value.resetEpoch,data:value.data});
 }
 function decideWrite(base,server){
  if(!base||!server)return 'conflict';
  return base.revision===server.revision&&base.resetEpoch===server.resetEpoch?'allowed':'conflict';
 }
 function weeklyStartIso(date){
  if(!(date instanceof Date)||!Number.isFinite(date.getTime()))throw Error('invalid_date');
  // UTC helper only; weekly cutoffs for Belgium must be determined on the server.
  throw Error('week_bounds_are_server_only');
 }
 return Object.freeze({MODE,activity,save,decideWrite});
});
