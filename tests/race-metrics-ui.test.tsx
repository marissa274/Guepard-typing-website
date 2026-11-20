import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import RaceResults from '../src/components/lobby/RaceResults';
import VisualRace from '../src/components/lobby/VisualRace';
import RaceTimeline from '../src/components/lobby/RaceTimeline';
import {defaultSettings,type RoomView} from '../src/lib/room-types';
import {personFixture,roomViewFixture} from './fixtures';
const mockPush=jest.fn();
jest.mock('next/navigation',()=>({useRouter:()=>({push:mockPush}),useSearchParams:()=>new URLSearchParams('view=results')}));
jest.mock('next/link',()=>({__esModule:true,default:({children,href,...props}:{children:React.ReactNode;href:string})=><a href={href} {...props}>{children}</a>}));
const mockSave=jest.fn();
jest.mock('../src/components/SiteContext',()=>({useSite:()=>({save:mockSave,fr:true,state:{lang:'fr',user:false,results:[]}})}));
const mockRequest=jest.fn().mockResolvedValue({});
jest.mock('../src/lib/room-client',()=>({roomRequest:(...args:unknown[])=>mockRequest(...args)}));
const start=Date.now()-60000;
const room=roomViewFixture({id:'metrics',name:'La jungle',me:'a',startedAt:start,endedAt:start+60000,serverNow:start+60000,phase:'finished',settings:defaultSettings,text:'Le guépard suit la rivière.',people:[personFixture({id:'a',name:'Alex',role:'player',kind:'guest',progress:20,typed:25,errors:5,abandoned:false})]});
beforeAll(()=>{HTMLElement.prototype.scrollIntoView=jest.fn()});

test('results include gross speed, errors, time, status and earned bonus count',()=>{
 render(<RaceResults room={room}/>);
 for(const name of ['MPM brut','Erreurs','Temps','Statut'])expect(screen.getByRole('columnheader',{name})).toBeTruthy();
 expect(screen.getByText('60 s')).toBeTruthy();
 expect(screen.getByRole('columnheader',{name:'Bonus reçus'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Masquer les statistiques'}));
 expect(mockPush).toHaveBeenCalledWith('/lobby/metrics');
});

test('a running racer sees speed and precision and confirms before abandoning',()=>{
 render(<VisualRace room={{...room,phase:'running',endedAt:undefined}} connected onError={jest.fn()}/>);
 expect(screen.getByLabelText('Vitesse de frappe').textContent).toContain('4 mots/min');
 expect(screen.getByLabelText('Précision de frappe').textContent).toContain(new Intl.NumberFormat('fr',{style:'percent'}).format(.8));
 fireEvent.click(screen.getByRole('button',{name:'Abandonner la course'}));
 expect(mockRequest).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Continuer la course'}));
 expect(screen.queryByRole('button',{name:'Confirmer l’abandon'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Abandonner la course'}));
 fireEvent.click(screen.getByRole('button',{name:'Confirmer l’abandon'}));
 expect(mockRequest).toHaveBeenCalledWith(room.id,{action:'abandon'});
});
test('replacing a character counts a new attempt and updates its heatmap entry',async()=>{
 const running:RoomView={...room,phase:'running',endedAt:undefined,text:'abc def ghi',people:[{...room.people[0],input:'axc',typed:3,progress:2}]};
 render(<VisualRace room={running} connected onError={jest.fn()}/>);
 fireEvent.change(screen.getByLabelText('Texte de la course'),{target:{value:'abc'}});
 await waitFor(()=>expect(mockRequest).toHaveBeenCalledWith(room.id,{action:'progress',value:'abc',typed:4,heatmap:{b:{hits:1,errors:0}}}));
 expect(JSON.parse(sessionStorage.getItem('guepard-heat-'+room.id+'-'+room.startedAt)??'null')).toEqual({b:{hits:1,errors:0}});
});
test('a guest victory records the rank and win in session history only once',()=>{
 render(<VisualRace room={room} connected onError={jest.fn()}/>);
 expect(mockSave).toHaveBeenCalledWith('results',expect.any(Function));
 const update=mockSave.mock.calls.find(call=>call[0]==='results')[1],saved=update([]);
 expect(saved).toHaveLength(1);expect(saved[0]).toMatchObject({rank:1,won:true});expect(update(saved)).toEqual(saved);
});

test('the typing field receives focus when the connection becomes ready after mounting',async()=>{
 const running:RoomView={...room,phase:'running',endedAt:undefined};
 const {rerender}=render(<VisualRace room={running} connected={false} onError={jest.fn()}/>);
 await waitFor(()=>expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled());
 rerender(<VisualRace room={running} connected onError={jest.fn()}/>);
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByLabelText('Texte de la course')));
});

test('a rejected progress update restores accepted input instead of retrying it forever',async()=>{
 const onError=jest.fn();
 mockRequest.mockRejectedValueOnce(Object.assign(new Error('Invalid progress'),{status:400}));
 const running:RoomView={...room,phase:'running',endedAt:undefined,text:'abc def ghi',people:[{...room.people[0],input:'a',typed:1,progress:1}]};
 render(<VisualRace room={running} connected onError={onError}/>);
 fireEvent.change(screen.getByLabelText('Texte de la course'),{target:{value:'abc'}});
 await waitFor(()=>expect(onError).toHaveBeenCalledWith('Invalid progress'));
 await waitFor(()=>expect(screen.getByLabelText<HTMLTextAreaElement>('Texte de la course').value).toBe('a'));
});

test('the speed chart and lanes never give two racers of the race the same colour',()=>{
 // 'a' and 'g' share a hash bucket: only the lane order keeps their lines distinguishable.
 const telemetry=[{at:start+1000,wpm:40,grossWpm:42,progress:5},{at:start+2000,wpm:50,grossWpm:52,progress:12}];
 const people=[personFixture({id:'a',name:'Alex',role:'player',telemetry}),personFixture({id:'g',name:'Gaby',role:'player',telemetry})];
 const {container,unmount}=render(<RaceTimeline room={{...room,people}}/>);
 const strokes=[...container.querySelectorAll('polyline')].map(line=>line.getAttribute('stroke'));
 expect(strokes).toHaveLength(2);expect(strokes[0]).not.toBe(strokes[1]);unmount();
 const race=render(<VisualRace room={{...room,people,phase:'running',endedAt:undefined}} connected onError={jest.fn()}/>);
 const lanes=[...race.container.querySelectorAll<HTMLElement>('.race-lane')].map(lane=>lane.style.getPropertyValue('--racer-colour'));
 expect(lanes).toEqual(strokes);
});
