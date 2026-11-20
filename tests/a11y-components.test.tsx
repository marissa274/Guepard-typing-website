import type React from 'react';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {jest,expect,test,beforeAll,beforeEach,describe} from '@jest/globals';
import Lobby from '../src/components/lobby/Lobby';
import VisualRace from '../src/components/lobby/VisualRace';
import RaceResults from '../src/components/lobby/RaceResults';
import {roomRequest,subscribeRoom} from '../src/lib/room-client';
import {defaultSettings,type RoomView} from '../src/lib/room-types';

const mockSearch={value:''};
jest.mock('next/navigation',()=>({useRouter:()=>({push:jest.fn(),replace:jest.fn()}),useSearchParams:()=>new URLSearchParams(mockSearch.value)}));
jest.mock('next/link',()=>({__esModule:true,default:({children,href,...props}:{children:React.ReactNode;href:string})=><a href={href} {...props}>{children}</a>}));
const mockSite={fr:true,state:{lang:'fr',dark:false,user:false,name:'Alice',avatar:'cheetah',results:[]},save:jest.fn()};
jest.mock('../src/components/SiteContext',()=>({useSite:()=>mockSite}));
jest.mock('../src/lib/room-client',()=>({...jest.requireActual<object>('../src/lib/room-client'),roomRequest:jest.fn(),subscribeRoom:jest.fn()}));
jest.mock('../src/services/results',()=>({resultService:{detail:jest.fn(()=>Promise.reject(new Error('offline')))}}));

const now=Date.now();
const person=(id:string,name:string)=>({id,name,animal:'cheetah' as const,kind:'guest' as const,role:'player' as const,late:false,seen:now,progress:0,errors:0,typed:0,abandoned:false});
const baseRoom:RoomView={id:'a11y',name:'La clairière',animal:'cheetah',code:'AB2345',hostId:'host',me:'host',isHost:true,players:2,phase:'waiting',createdAt:now,revision:1,serverNow:now,settings:{...defaultSettings,visibility:'public'},text:'Le guépard suit la rivière.',people:[person('host','Alice'),person('guest','Sam')]};
function serve(room:RoomView){
 sessionStorage.setItem('guepard-room-'+room.id,'host-token');
 jest.mocked(subscribeRoom).mockImplementation(async(_id,signal,onRoom)=>{onRoom(room);await new Promise<void>(resolve=>signal.addEventListener('abort',()=>resolve(),{once:true}))});
}
beforeAll(()=>{HTMLElement.prototype.scrollIntoView=jest.fn()});
beforeEach(()=>{mockSearch.value='';jest.mocked(roomRequest).mockReset();jest.mocked(subscribeRoom).mockReset()});

describe('A11Y-04 · lobby keyboard focus',()=>{
 test('a host setting keeps focus and stays enabled while its request is pending',async()=>{
  serve(baseRoom);let finish!:(value:{room:RoomView})=>void;
  jest.mocked(roomRequest).mockImplementation((_id,body)=>body&&(body as {action:string}).action==='settings'?new Promise(resolve=>{finish=resolve}):Promise.resolve({}));
  render(<Lobby id="a11y"/>);
  const select=await screen.findByLabelText('Visibilité');act(()=>select.focus());
  fireEvent.change(select,{target:{value:'semi'}});
  await waitFor(()=>expect(roomRequest).toHaveBeenCalledWith('a11y',{action:'settings',settings:{visibility:'semi'}}));
  expect(select.closest('fieldset')?.disabled).toBe(false);
  expect(document.activeElement).toBe(select);
  expect(select.closest('section')?.getAttribute('aria-busy')).toBe('true');
  // Start stays focusable but ignores activation while the request is pending.
  const start=screen.getByRole('button',{name:/Lancer la course/});
  expect(start.hasAttribute('disabled')).toBe(false);expect(start.getAttribute('aria-disabled')).toBe('true');
  fireEvent.click(start);expect(roomRequest).not.toHaveBeenCalledWith('a11y',{action:'start'});
  await act(async()=>finish({room:{...baseRoom,revision:2,settings:{...baseRoom.settings,visibility:'semi'}}}));
  await waitFor(()=>expect(select.closest('section')?.getAttribute('aria-busy')).toBe('false'));
  expect(document.activeElement).toBe(select);
 });

 test('an invalid time limit is announced instead of being silently replaced',async()=>{
  serve(baseRoom);jest.mocked(roomRequest).mockResolvedValue({});render(<Lobby id="a11y"/>);
  const field=await screen.findByLabelText(/Limite de temps/);
  fireEvent.change(field,{target:{value:'12'}});fireEvent.blur(field);
  expect(screen.getByRole('alert').textContent).toMatch(/entre 30 et 600/);
  expect(field.getAttribute('aria-invalid')).toBe('true');expect((field as HTMLInputElement).value).toBe('12');
  expect(roomRequest).not.toHaveBeenCalledWith('a11y',expect.objectContaining({action:'settings'}));
  fireEvent.change(field,{target:{value:'45'}});fireEvent.blur(field);
  expect(field.getAttribute('aria-invalid')).toBe('false');
  await waitFor(()=>expect(roomRequest).toHaveBeenCalledWith('a11y',{action:'settings',settings:{timeLimit:45}}));
 });
});

describe('A11Y-02 · heading structure',()=>{
 const finished:RoomView={...baseRoom,phase:'finished',startedAt:now-60000,endedAt:now,serverNow:now,people:[{...person('host','Alice'),progress:27,typed:27,finishedAt:now-1000},{...person('guest','Sam'),progress:27,typed:27,finishedAt:now-500}]};
 test('a finished lobby exposes a single h1 and the podium names one level below the results title',async()=>{
  serve(finished);render(<Lobby id="a11y"/>);
  await screen.findByRole('heading',{level:2,name:'Bravo à tous !'});
  expect(screen.getAllByRole('heading',{level:1}).map(heading=>heading.textContent)).toEqual(['La clairière']);
  expect(screen.getByRole('heading',{level:3,name:'Alice'})).toBeTruthy();
 });
 test('the h1 of a finished lobby is not inside the hidden title row, and the celebration sign is not a nested landmark (H1, H2)',async()=>{
  serve(finished);const {container}=render(<Lobby id="a11y"/>);
  await screen.findByRole('heading',{level:2,name:'Bravo à tous !'});
  const h1=container.querySelector('h1') as HTMLElement;
  expect(h1.classList.contains('sr-only')).toBe(true);
  expect(h1.closest('.hidden')).toBeNull();
  expect(container.querySelector('.celebration-sign')?.tagName).toBe('DIV');
  expect(container.querySelector('.celebration-sign')?.closest('aside')).toBeNull();
 });
 test('stand-alone results keep their own h1',()=>{
  render(<RaceResults room={finished}/>);
  expect(screen.getAllByRole('heading',{level:1}).map(heading=>heading.textContent)).toEqual(['Bravo à tous !']);
  expect(screen.getByRole('heading',{level:2,name:'Alice'})).toBeTruthy();
 });
});

describe('A11Y-04 · live race',()=>{
 const running:RoomView={...baseRoom,phase:'running',startedAt:now-5000,serverNow:now};
 test('abandoning moves focus to « Continuer la course » and back to « Abandonner » when dismissed',async()=>{
  render(<VisualRace room={running} connected onError={jest.fn()}/>);
  // Let the initial focus on the typing field happen first.
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,40))});
  const abandon=screen.getByRole('button',{name:'Abandonner la course'});
  fireEvent.click(abandon);
  expect(document.activeElement).toBe(screen.getByRole('button',{name:'Continuer la course'}));
  fireEvent.click(screen.getByRole('button',{name:'Continuer la course'}));
  expect(document.activeElement).toBe(screen.getByRole('button',{name:'Abandonner la course'}));
 });
 test('the race clock is a silent timer and the typing field is described by the target text in its language',()=>{
  const {container}=render(<VisualRace room={running} connected onError={jest.fn()}/>);
  const clock=container.querySelector('.race-clock');
  expect(screen.getByRole('timer')).toBe(clock);expect(clock?.getAttribute('aria-live')).toBe('off');
  const field=screen.getByLabelText('Texte de la course'),target=container.querySelector('.room-target');
  expect(field.getAttribute('aria-describedby')).toBe(target?.id);
  expect(target?.getAttribute('lang')).toBe('fr');expect(field.getAttribute('lang')).toBe('fr');
 });
});

describe('A11Y-04 · keyboard heatmap',()=>{
 test('the heatmap is one tab stop with arrow-key navigation (roving tabindex)',()=>{
  mockSearch.value='view=results';
  const room:RoomView={...baseRoom,phase:'finished',startedAt:now-60000,endedAt:now,people:[{...person('host','Alice'),progress:10,typed:10,finishedAt:now,heatmap:{a:{hits:3,errors:1}}}]};
  const {container}=render(<RaceResults room={room}/>);
  const group=screen.getByRole('group',{name:'Mes erreurs au clavier'});
  const keys=[...group.querySelectorAll<HTMLButtonElement>('.heat-key')];
  expect(keys.filter(key=>key.tabIndex===0)).toHaveLength(1);
  const first=keys.find(key=>key.tabIndex===0)!;act(()=>first.focus());
  fireEvent.keyDown(first,{key:'ArrowRight'});
  expect(document.activeElement).toBe(keys[1]);
  expect(keys.filter(key=>key.tabIndex===0)).toEqual([keys[1]]);
  fireEvent.keyDown(keys[1],{key:'ArrowDown'});
  const focused=document.activeElement as HTMLElement;
  expect(focused.dataset.row).toBe('1');expect(focused.dataset.column).toBe('1');
  fireEvent.keyDown(focused,{key:'Home'});
  expect((document.activeElement as HTMLElement).dataset.column).toBe('0');
  expect(container.querySelectorAll('.heat-key[tabindex="0"]')).toHaveLength(1);
 });
 test('opening the detailed statistics moves focus to the details panel',async()=>{
  const room:RoomView={...baseRoom,phase:'finished',startedAt:now-60000,endedAt:now,people:[{...person('host','Alice'),progress:10,typed:10,finishedAt:now}]};
  const {rerender}=render(<RaceResults room={room}/>);
  const toggle=screen.getByRole('button',{name:/mes statistiques/i}),label=toggle.textContent;
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(toggle);
  mockSearch.value='view=results';rerender(<RaceResults room={{...room}}/>);
  expect(screen.getByRole('button',{name:/mes statistiques/i}).getAttribute('aria-expanded')).toBe('true');
  expect(screen.getByRole('button',{name:/mes statistiques/i}).textContent).toBe(label);
  await waitFor(()=>expect(document.activeElement?.id).toBe('course-result-details'));
 });
});
