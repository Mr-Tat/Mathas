const test=require('node:test');
const assert=require('node:assert/strict');
const c=require('../core/contract.js');
const e='123e4567-e89b-42d3-a456-426614174000';
const valid={eventId:e,activityKey:'addition.classique.10',mode:'classic',levelKey:'niveau2',score:6,scoreMax:10,points:120,scoringVersion:'v1'};
test('resultat standard sans recalcule du jeu',()=>{
 const v=c.activity(valid);
 assert.equal(v.score,6);assert.equal(v.points,120);
 assert.equal(Object.hasOwn(v,'studentId'),false);
});
test('refuse scores impossibles et identifiants douteux',()=>{
 assert.throws(()=>c.activity({...valid,score:11}),/score_max_invalid/);
 assert.throws(()=>c.activity({...valid,eventId:'abc'}),/event_id_invalid/);
 assert.throws(()=>c.activity({...valid,activityKey:'../etc'}),/activity_invalid/);
});
test('sauvegarde opaque sans calcul de records',()=>{
 const data={records:{classic:7},trophies:['gold']};
 assert.equal(c.save({schemaVersion:1,revision:3,resetEpoch:0,data}).data,data);
});
test('conflit revision ou remise a zero refuse ecrasement',()=>{
 assert.equal(c.decideWrite({revision:4,resetEpoch:0},{revision:4,resetEpoch:0}),'allowed');
 assert.equal(c.decideWrite({revision:3,resetEpoch:0},{revision:4,resetEpoch:0}),'conflict');
 assert.equal(c.decideWrite({revision:4,resetEpoch:0},{revision:4,resetEpoch:1}),'conflict');
});
test('sauvegarde volumineuse refusee',()=>{
 assert.throws(()=>c.save({schemaVersion:1,revision:0,resetEpoch:0,data:{blob:'x'.repeat(50001)}}),/save_too_large/);
});
