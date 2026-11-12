import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import RaceResults from '../src/components/lobby/RaceResults';
import VisualRace from '../src/components/lobby/VisualRace';
import {defaultSettings} from '../src/lib/room-types';
const mockPush=jest.fn();
jest.mock('next/navigation',()=>({useRouter:()=>({push:mockPush}),useSearchParams:()=>new URLSearchParams('view=results')}));
jest.mock('next/link',()=>({__esModule:true,default:({children,href,...props})=><a href={href} {...props}>{children}</a>}));
const mockSave=jest.fn();
jest.mock('../src/components/SiteContext',()=>({useSite:()=>({save:mockSave,fr:true,state:{lang:'fr'}})}));
const mockRequest=jest.fn().mockResolvedValue({});
jest.mock('../src/lib/room-client',()=>({roomRequest:(...args)=>mockRequest(...args)}));
const start=Date.now()-60000;
const room={id:'metrics',name:'La jungle',me:'a',startedAt:start,endedAt:start+60000,serverNow:start+60000,phase:'finished',settings:defaultSettings,text:'Le guépard suit la rivière.',people:[{id:'a',name:'Alex',role:'player',kind:'guest',progress:20,typed:25,errors:5,abandoned:false}]};
beforeAll(()=>{HTMLElement.prototype.scrollIntoView=jest.fn()});

test('results include gross speed, errors, time and status without an invented bonus count',()=>{
 render(<RaceResults room={room}/>);
 for(const name of ['MPM brut','Erreurs','Temps','Statut'])expect(screen.getByRole('columnheader',{name})).toBeTruthy();
 expect(screen.getByText('60 s')).toBeTruthy();
 expect(screen.getByText('Les bonus ne sont pas encore disponibles.')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Masquer les statistiques'}));
 expect(mockPush).toHaveBeenCalledWith('/lobby/metrics');
});

test('a running racer sees speed and precision and confirms before abandoning',()=>{
 render(<VisualRace room={{...room,phase:'running',endedAt:undefined}} connected onError={jest.fn()}/>);
 expect(screen.getByLabelText('Vitesse de frappe').textContent).toContain('4 mots/min');
 expect(screen.getByLabelText('Précision de frappe').textContent).toContain('80 %');
 fireEvent.click(screen.getByRole('button',{name:'Abandonner la course'}));
 expect(mockRequest).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Continuer la course'}));
 expect(screen.queryByRole('button',{name:'Confirmer l’abandon'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Abandonner la course'}));
 fireEvent.click(screen.getByRole('button',{name:'Confirmer l’abandon'}));
 expect(mockRequest).toHaveBeenCalledWith(room.id,{action:'abandon'});
});
test('replacing a character counts a new attempt and updates its heatmap entry',async()=>{
 const running={...room,phase:'running',endedAt:undefined,text:'abc def ghi',people:[{...room.people[0],input:'axc',typed:3,progress:2}]};
 render(<VisualRace room={running} connected onError={jest.fn()}/>);
 fireEvent.change(screen.getByLabelText('Texte de la course'),{target:{value:'abc'}});
 await waitFor(()=>expect(mockRequest).toHaveBeenCalledWith(room.id,{action:'progress',value:'abc',typed:4}));
 expect(JSON.parse(sessionStorage.getItem('guepard-heat-'+room.id+'-'+room.startedAt))).toEqual({b:{hits:1,errors:0}});
});
test('a guest victory records the rank and win in session history only once',()=>{
 render(<VisualRace room={room} connected onError={jest.fn()}/>);
 expect(mockSave).toHaveBeenCalledWith('results',expect.any(Function));
 const update=mockSave.mock.calls.find(call=>call[0]==='results')[1],saved=update([]);
 expect(saved).toHaveLength(1);expect(saved[0]).toMatchObject({rank:1,won:true});expect(update(saved)).toEqual(saved);
});
