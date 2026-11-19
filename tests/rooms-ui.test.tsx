import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {jest,expect,test,beforeEach} from '@jest/globals';
import {RaceCard,Races} from '../src/components/Races';
import Jungle from '../src/components/Jungle';
import Lobby from '../src/components/lobby/Lobby';
import {roomRequest,subscribeRoom} from '../src/lib/room-client';
import {defaultSettings,type RoomView} from '../src/lib/room-types';
import type {PublicRoom} from '../src/lib/room-api-types';
const mockPush=jest.fn(),mockReplace=jest.fn(),mockSave=jest.fn();
const mockState={lang:'fr',dark:false,user:false,name:'Visiteur',avatar:'cheetah'};
jest.mock('../src/components/SiteContext',()=>({useSite:()=>({state:mockState,fr:mockState.lang==='fr',save:mockSave,c:{refresh:'Actualiser',loading:'Chargement…'}})}));
jest.mock('../src/lib/room-client',()=>({...jest.requireActual<typeof import('../src/lib/room-client')>('../src/lib/room-client'),roomRequest:jest.fn(),subscribeRoom:jest.fn()}));
jest.mock('next/navigation',()=>({useRouter:()=>({push:mockPush,replace:mockReplace})}));
jest.mock('next/link',()=>({__esModule:true,default:({children,href,...props}:{children:React.ReactNode;href:string})=><a href={href} {...props}>{children}</a>}));
const card:PublicRoom={id:'open',name:{fr:'Clairière',en:'Clearing'},animal:'cheetah',language:'FR',complexity:'medium',capacity:8,host:'Alice',players:3,state:'waiting',joinable:true,live:true};
beforeEach(()=>{mockState.lang='fr';mockState.user=false;mockPush.mockReset();mockReplace.mockReset();mockSave.mockReset();jest.mocked(roomRequest).mockReset();jest.mocked(subscribeRoom).mockReset()});
test('a running public card exposes metadata but has no join or watch link',()=>{
 render(<RaceCard race={{...card,state:'running',joinable:false}}/>);
 expect(screen.getByText(/3 \/ 8/)).toBeTruthy();expect(screen.getByText(/Alice/)).toBeTruthy();
 expect(screen.queryByRole('link')).toBeNull();expect(screen.getByRole('button',{name:'Course en cours — Clairière'}).hasAttribute('disabled')).toBe(true);
});
test('the explorer filters language and complexity without displaying unavailable rooms as joinable',async()=>{
 jest.mocked(roomRequest).mockResolvedValue({rooms:[card,{...card,id:'english',name:{fr:'Science',en:'Science'},language:'EN',complexity:'hard'}]});
 render(<Races/>);await screen.findByRole('heading',{name:'Clairière'});
 fireEvent.change(screen.getByLabelText('Filtrer par langue'),{target:{value:'EN'}});
 expect(screen.queryByRole('heading',{name:'Clairière'})).toBeNull();expect(screen.getByRole('heading',{name:'Science'})).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Filtrer par complexité'),{target:{value:'easy'}});
 expect(screen.queryByRole('heading',{name:'Science'})).toBeNull();expect(screen.getByText('Aucun salon ne correspond à ces filtres.')).toBeTruthy();
});
test('home retains its three board actions and resolves a six-character lobby code',async()=>{
 jest.mocked(roomRequest).mockResolvedValue({id:'resolved'});const {container}=render(<Jungle/>);
 expect(container.querySelectorAll('.board-action')).toHaveLength(3);const field=screen.getByLabelText('J’ai un code');
 expect(field.getAttribute('maxlength')).toBe('6');fireEvent.change(field,{target:{value:'AB2345'}});fireEvent.click(screen.getByRole('button',{name:'Accéder au salon'}));
 await waitFor(()=>expect(mockPush).toHaveBeenCalledWith('/lobby/resolved?code=AB2345'));
});
test('the host can generate several invitations, inspect their status, revoke one and explicitly close',async()=>{
 const room:RoomView={id:'private',name:'Classe',animal:'cheetah',code:'AB2345',hostId:'host',me:'host',isHost:true,players:1,phase:'waiting',createdAt:Date.now(),revision:1,serverNow:Date.now(),settings:{...defaultSettings,visibility:'private'},people:[{id:'host',name:'Alice',animal:'cheetah',kind:'demo',role:'player',late:false,seen:Date.now(),progress:0,errors:0,typed:0,abandoned:false}],invitations:[{token:'first-token',expires:Date.now()+60000,used:true,usedName:'Sam'},{token:'second-token',expires:Date.now()+60000,used:false}]};
 sessionStorage.setItem('guepard-room-private','host-token');
 jest.mocked(subscribeRoom).mockImplementation(async(_id,signal,onRoom)=>{onRoom(room);await new Promise<void>(resolve=>signal.addEventListener('abort',()=>resolve(),{once:true}))});
 jest.mocked(roomRequest).mockResolvedValue({room});render(<Lobby id="private"/>);
 await screen.findByText('Utilisée par Sam');fireEvent.change(screen.getByLabelText('Nombre d’invitations'),{target:{value:'2'}});fireEvent.click(screen.getByRole('button',{name:'Créer les invitations'}));
 await waitFor(()=>expect(roomRequest).toHaveBeenCalledWith('private',{action:'invite',count:2}));
 fireEvent.click(screen.getByRole('button',{name:'Révoquer l’invitation 2'}));await waitFor(()=>expect(roomRequest).toHaveBeenCalledWith('private',{action:'revokeInvite',invite:'second-token'}));
 fireEvent.click(screen.getByRole('button',{name:'Fermer le salon'}));await waitFor(()=>expect(roomRequest).toHaveBeenCalledWith('private',{action:'close'}));
});
