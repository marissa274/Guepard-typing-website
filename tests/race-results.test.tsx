import {raceResults} from '../src/lib/race-results';
const room={startedAt:1000,endedAt:61000,serverNow:90000,people:[{id:'a',name:'A',role:'player',kind:'guest',progress:250,typed:250,finishedAt:61000,abandoned:false},{id:'b',name:'B',role:'player',kind:'bot',progress:200,typed:250,abandoned:true},{id:'s',role:'spectator',progress:0,typed:0}]};
test('one result reference excludes spectators, preserves abandonment and leaves score undefined',()=>{const r=raceResults(room);expect(r).toHaveLength(2);expect(r[0]).toMatchObject({speed:50,accuracy:100,score:null,species:'cheetah'});expect(r[1]).toMatchObject({speed:40,accuracy:80,score:null,status:'Abandon',species:'tortoise'});expect(raceResults({...room,serverNow:990000})).toEqual(r)});
test('a remaining racer receives the win when the only opponent abandons',()=>{const r=raceResults({...room,phase:'finished',people:[{...room.people[0],finishedAt:undefined,progress:12,typed:12},room.people[1]]});expect(r[0]).toMatchObject({rank:1,status:'Victoire par abandon',species:'cheetah'});expect(r[1]).toMatchObject({status:'Abandon',species:'tortoise'})});
test('equal finish times keep the shared rank and no input has no invented precision',()=>{const r=raceResults({...room,people:[room.people[0],{...room.people[0],id:'c'},{...room.people[1],id:'d',abandoned:false,progress:0,typed:0}]});expect(r.map(x=>x.rank)).toEqual([1,1,3]);expect(r[2].accuracy).toBeNull()});

test('zero-progress humans remain ranked beside bots at the time limit',()=>{
 const people=[{...room.people[0],id:'bot',kind:'bot',finishedAt:undefined,progress:200},{...room.people[0],id:'human',finishedAt:undefined,progress:0,typed:0}];
 const rows=raceResults({...room,people});expect(rows.map(r=>r.person.id)).toEqual(['bot','human']);expect(rows[1]).toMatchObject({rank:2,species:'tortoise',status:'Temps écoulé',speed:0});
});
