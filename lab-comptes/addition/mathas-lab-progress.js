/* Math'as LAB — progression transferable, sous controle de l'eleve.
 * Aucun appel reseau ni transfert automatique. Ignore le Master Mode.
 * Le serveur doit verifier la session et isoler les valeurs LAB.
 */
(function(root){
 'use strict';
 const app='addition-simple';
 const progressKey='mathas_progression_addition_simple_v1';
 const trophyKey='mathas_trophies_v3_'+app;
 const flags=['level2','level3','sudden1','sudden2','sudden3','perfect1','perfect2','perfect3','hard'];
 const colors=['bronze','silver','gold'];
 const bools=x=>Array.isArray(x)?[0,1,2].map(i=>x[i]===true):[false,false,false];
 function read(key){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch{return {};}}
 function snapshot(){
   if(root.__masterMode===true)throw Error('Master Mode actif : synchronisation impossible');
   const p=read(progressKey),t=read(trophyKey);
   const progression={};for(const k of flags)progression[k]=p[k]===true;
   const trophies={version:3,mastery:{},sudden:bools(t.sudden),hardAwards:{},scoreOne:{},unlockedGold:t.unlockedGold===true};
   for(const n of ['4','10','20'])trophies.mastery[n]=bools(t.mastery?.[n]);
   for(const c of colors){trophies.hardAwards[c]=bools(t.hardAwards?.[c]);trophies.scoreOne[c]=t.scoreOne?.[c]===true;}
   return {schema_version:1,progression,trophies};
 }
 function combine(a,b){
   if(!a || typeof a!=='object')a={};
   if(!b || typeof b!=='object')b={};
   const out={};for(const k of flags)out[k]=a[k]===true||b[k]===true;
   return out;
 }
 function orArrays(a,b){const aa=bools(a),bb=bools(b);return aa.map((x,i)=>x||bb[i]);}
 function mergeTrophies(a,b){
   a=a&&typeof a==='object'?a:{};b=b&&typeof b==='object'?b:{};
   const t={version:3,mastery:{},sudden:orArrays(a.sudden,b.sudden),hardAwards:{},scoreOne:{},unlockedGold:a.unlockedGold===true||b.unlockedGold===true};
   for(const n of ['4','10','20'])t.mastery[n]=orArrays(a.mastery?.[n],b.mastery?.[n]);
   for(const c of colors){t.hardAwards[c]=orArrays(a.hardAwards?.[c],b.hardAwards?.[c]);t.scoreOne[c]=a.scoreOne?.[c]===true||b.scoreOne?.[c]===true;}
   return t;
 }
 function restore(remote){
   if(root.__masterMode===true)throw Error('Master Mode actif : restauration impossible');
   if(remote?.schema_version!==1)throw Error('Version de progression non prise en charge');
   if(!remote.progression||!remote.trophies)throw Error('Donnees incompletes');
   const current=snapshot();
   const progression=combine(current.progression,remote.progression);
   const trophies=mergeTrophies(current.trophies,remote.trophies);
   localStorage.setItem(progressKey,JSON.stringify(progression));
   localStorage.setItem(trophyKey,JSON.stringify(trophies));
   return {progression,trophies,reloadNeeded:true};
 }
 root.MathasLabProgress=Object.freeze({version:'0.1.0-lab',snapshot,restore});
})(window);
