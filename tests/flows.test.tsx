import React from 'react';
import {afterEach,jest,test,expect} from '@jest/globals';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {SiteProvider} from '../src/components/SiteContext';
import Site from '../src/components/Site';
import {raceService} from '../src/data';
import {defaultSettings,type RoomView} from '../src/lib/room-types';
import {personFixture,roomViewFixture} from './fixtures';
import {roomRequest,subscribeRoom} from '../src/lib/room-client';
import {authService} from '../src/services/auth';
const auth=jest.mocked(authService),mockedRoomRequest=jest.mocked(roomRequest),mockedSubscribeRoom=jest.mocked(subscribeRoom);
jest.mock('../src/lib/room-client',()=>({...jest.requireActual<typeof import('../src/lib/room-client')>('../src/lib/room-client'),roomRequest:jest.fn(),subscribeRoom:jest.fn()}));
jest.mock('../src/services/auth',()=>({...jest.requireActual<typeof import('../src/services/auth')>('../src/services/auth'),authService:{current:jest.fn(async()=>({user:null})),submit:jest.fn(),logout:jest.fn(async()=>({user:null})),provider:jest.fn(async(name:string)=>({kind:'provider-unavailable',provider:name}))}}));
const mockNavigation={path:'/',push:jest.fn(),replace:jest.fn()};
jest.mock('next/navigation',()=>({usePathname:()=>mockNavigation.path,useRouter:()=>({push:mockNavigation.push,replace:mockNavigation.replace})}));
jest.mock('next/link',()=>({__esModule:true,default:({children,href,...props}:{children:React.ReactNode;href:string})=><a href={href} {...props}>{children}</a>}));
function artworkSource(element:Element|null){const url=new URL(element?.getAttribute('src')||'','http://localhost');return url.searchParams.get('url')||url.pathname}
afterEach(()=>{document.cookie='guepard-lang=; Max-Age=0; Path=/';document.cookie='guepard-theme=; Max-Age=0; Path=/';document.documentElement.lang='fr';document.documentElement.dataset.theme='light'});
function mount(path='/'){mockNavigation.path=path;return render(<SiteProvider><Site/></SiteProvider>)}
test('home has one scene, three real board links and preserved art',()=>{const {container}=mount();expect(container.querySelectorAll('main section')).toHaveLength(1);expect([...container.querySelector('#app')!.children].map(el=>el.tagName)).toEqual(['HEADER','MAIN','FOOTER']);expect(screen.getByRole('link',{name:/Rejoindre rapidement/}).getAttribute('href')).toBe('/play');expect(screen.getByRole('link',{name:/Créer une course/}).getAttribute('href')).toBe('/create');expect(screen.getAllByRole('link',{name:/Parcourir les courses/})[0].getAttribute('href')).toBe('/races');expect(container.querySelector('.sleeping-cheetah')).not.toBeNull();expect(artworkSource(container.querySelector('header img'))).toBe('/assets/guepard-logo.webp')});
test('FR/EN, night mode and unavailable OAuth stay clear',async()=>{mount('/login');await new Promise(resolve=>setTimeout(resolve,0));fireEvent.click(screen.getByRole('button',{name:'Passer en anglais'}));expect(screen.getByRole('button',{name:'Continue with Discord'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Switch to dark theme'}));await waitFor(()=>expect(document.documentElement.dataset.theme).toBe('dark'));fireEvent.click(screen.getByRole('button',{name:'Continue with GitHub'}));await screen.findByText(/GitHub login is not configured/);expect(screen.queryByText(/Demo account/)).toBeNull()});
test('creation requires an account and a curated animal and sends its theme to the server',async()=>{auth.current.mockResolvedValueOnce({user:{id:'host-account',username:'HôteTest',avatar:'cheetah'}});mockedRoomRequest.mockResolvedValueOnce({room:roomViewFixture({id:'new-room'})});mount('/private');fireEvent.change(await screen.findByLabelText('Nom du salon'),{target:{value:'Amis du soir'}});fireEvent.click(screen.getByLabelText(/Perroquet/));fireEvent.click(screen.getByRole('button',{name:/Créer une course/}));await waitFor(()=>expect(mockNavigation.push).toHaveBeenLastCalledWith('/lobby/new-room'));expect(roomRequest).toHaveBeenCalledWith(null,expect.objectContaining({animal:'parrot',visibility:'public',capacity:8,role:'player'}))});
test('race errors, completion, local results and replay',async()=>{mount('/race/canopy');const start=await screen.findByRole('button',{name:/Lancer la course/});fireEvent.click(start);const input=screen.getByRole<HTMLInputElement>('textbox');fireEvent.change(input,{target:{value:'X'}});expect(document.querySelector('.incorrect')).not.toBeNull();fireEvent.change(input,{target:{value:''}});let value='';for(const ch of raceService.text('FR')){value+=ch;fireEvent.change(input,{target:{value}})}expect(screen.getByText(/Belle course/)).toBeTruthy();await waitFor(()=>expect(JSON.parse(sessionStorage.getItem('guepard-results')??'null')).toHaveLength(1));fireEvent.click(screen.getByRole('button',{name:/Rejouer/}));expect(input.value).toBe('');expect(input.disabled).toBe(false)});
test('local private lobbies survive a reload and do not show fake opponents',async()=>{const race=raceService.createPrivate({name:'Ma course',language:'FR'});sessionStorage.setItem('guepard-privateRaces',JSON.stringify([race]));mount('/race/'+race.id);await screen.findByRole('button',{name:/Lancer la course/});expect(screen.getByText(race.code!)).toBeTruthy();expect(screen.queryByText(/Coco/)).toBeNull()});
test('night mode closes every animal and restores daytime artwork',()=>{const {container}=mount();const sky=container.querySelector('.scene-sky-light'),nightSky=container.querySelector('.scene-sky-dark'),giraffe=container.querySelector('.giraffe-full');expect(artworkSource(sky)).toBe('/assets/relief-background.webp');expect(artworkSource(nightSky)).toBe('/assets/jungle-blue-night.webp');fireEvent.click(screen.getByRole('button',{name:'Passer au thème sombre'}));expect(artworkSource(nightSky)).toBe('/assets/jungle-blue-night.webp');expect(artworkSource(giraffe)).toBe('/assets/giraffe-night.webp');expect(container.querySelectorAll('.scene-animal[data-sleeping="true"]')).toHaveLength(6);expect(container.querySelector('.footer-cheetah')?.getAttribute('data-sleeping')).toBe('true');expect(container.querySelector('.board-ropes')).not.toBeNull();fireEvent.click(screen.getByRole('button',{name:'Passer au thème clair'}));expect(artworkSource(sky)).toBe('/assets/relief-background.webp');expect(artworkSource(giraffe)).toBe('/assets/giraffe-full.webp');expect(container.querySelectorAll('.scene-animal[data-sleeping="true"]')).toHaveLength(0)});

test('signup validates confirmation, sends credentials to Next and never stores them locally',async()=>{auth.submit.mockResolvedValueOnce({user:{id:'1',username:'GuépardTest',avatar:'cheetah'}});const {container}=mount('/signup');fireEvent.change(screen.getByLabelText('Nom d’utilisateur'),{target:{value:'GuépardTest'}});fireEvent.change(screen.getByLabelText('Mot de passe',{exact:true}),{target:{value:'demo-secret-42'}});fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'),{target:{value:'different'}});fireEvent.click(screen.getByRole('button',{name:/Créer mon compte/}));expect(screen.getByText('Les mots de passe ne correspondent pas.')).toBeTruthy();fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'),{target:{value:'demo-secret-42'}});fireEvent.click(screen.getByRole('button',{name:/Créer mon compte/}));await waitFor(()=>expect(authService.submit).toHaveBeenCalled());expect(JSON.stringify(localStorage)).not.toContain('demo-secret-42');await waitFor(()=>expect(screen.getByLabelText<HTMLInputElement>('Mot de passe',{exact:true}).value).toBe(''));expect(container.querySelectorAll('.auth-friend:not(.auth-paws)')).toHaveLength(4);expect(container.querySelector('.auth-top-cheetah')).not.toBeNull();expect(screen.getByRole('link',{name:/Jouer en invité/}).getAttribute('href')).toBe('/races')});
test('login password visibility and required field feedback',()=>{mount('/login');fireEvent.click(screen.getByRole('button',{name:'Se connecter'}));expect(screen.getAllByText('Ce champ est obligatoire.')).toHaveLength(2);const toggle=screen.getByRole('button',{name:'Afficher le mot de passe'});expect(toggle.getAttribute('aria-pressed')).toBe('false');fireEvent.click(toggle);expect(screen.getByLabelText<HTMLInputElement>('Mot de passe',{exact:true}).type).toBe('text');expect(toggle.getAttribute('aria-pressed')).toBe('true');fireEvent.click(toggle);expect(screen.getByLabelText<HTMLInputElement>('Mot de passe',{exact:true}).type).toBe('password')});


test('signup sends the chosen animal to the account endpoint',async()=>{auth.submit.mockResolvedValueOnce({user:{id:'2',username:'JungleTest',avatar:'crocodile'}});mount('/signup');fireEvent.click(screen.getByLabelText('Crocodile'));fireEvent.change(screen.getByLabelText('Nom d’utilisateur'),{target:{value:'JungleTest'}});fireEvent.change(screen.getByLabelText('Mot de passe',{exact:true}),{target:{value:'demo-secret-42'}});fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'),{target:{value:'demo-secret-42'}});fireEvent.click(screen.getByRole('button',{name:/Créer mon compte/}));await waitFor(()=>expect(authService.submit).toHaveBeenCalledWith(expect.objectContaining({avatar:'crocodile'}),'signup'))});
test('lobby guest has disabled settings, no host launch, and only header/main/footer',async()=>{sessionStorage.setItem('guepard-room-room-a','guest-token');const room:RoomView=roomViewFixture({id:'room-a',name:'La clairière',animal:'parrot',code:'ABC12345',hostId:'host',me:'guest',isHost:false,players:1,phase:'waiting',createdAt:Date.now(),revision:1,serverNow:Date.now(),people:[personFixture({id:'host',name:'Alex',role:'player',kind:'guest',animal:'cheetah'}),personFixture({id:'guest',name:'Sam',role:'spectator',kind:'guest',animal:'cheetah'})],settings:{...defaultSettings,visibility:'semi',language:'FR',textType:'story',length:50,timeLimit:120,blockErrors:false,punctuation:true,accents:true,numbers:false,specials:false,blacklist:'',customText:'',bank:'jungle',targetWpm:0,inactiveAfter:120}});mockedSubscribeRoom.mockImplementation(async(id,signal,onRoom)=>{onRoom(room);await new Promise(resolve=>signal.addEventListener('abort',resolve,{once:true}))});const {container}=mount('/lobby/room-a');await screen.findByText('En attente du départ par l’hôte');expect(screen.getByLabelText('Visibilité').closest('fieldset')?.disabled).toBe(true);expect(screen.queryByRole('button',{name:/Lancer la course/})).toBeNull();expect(screen.queryByText('Vous êtes l’hôte')).toBeNull();expect([...container.querySelector('#app')!.children].map(el=>el.tagName)).toEqual(['HEADER','MAIN','FOOTER'])});

test('saved appearance is restored while the account request is still pending',async()=>{
 auth.current.mockImplementationOnce(()=>new Promise(()=>{}));
 localStorage.setItem('guepard-dark','true');
 const {container}=mount();
 await waitFor(()=>expect(artworkSource(container.querySelector('.giraffe-full'))).toBe('/assets/giraffe-night.webp'));
});

test('a delayed account response preserves language and theme chosen after mounting',async()=>{
 let finishCurrent!:(value:{user:null})=>void;
 const current=new Promise<{user:null}>(resolve=>{finishCurrent=resolve});
 auth.current.mockReturnValueOnce(current);
 const {container}=mount();
 fireEvent.click(screen.getByRole('button',{name:'Passer en anglais'}));
 fireEvent.click(screen.getByRole('button',{name:'Switch to dark theme'}));
 expect(artworkSource(container.querySelector('.giraffe-full'))).toBe('/assets/giraffe-night.webp');
 finishCurrent({user:null});
 await waitFor(()=>expect(document.documentElement.dataset.theme).toBe('dark'));
 expect(screen.getByRole('button',{name:'Switch to French'})).toBeTruthy();
 expect(artworkSource(container.querySelector('.giraffe-full'))).toBe('/assets/giraffe-night.webp');
});

test('cookie preferences survive when localStorage has no saved preferences',async()=>{
 document.cookie='guepard-lang=en; Path=/';document.cookie='guepard-theme=dark; Path=/';
 expect(localStorage.length).toBe(0);
 const {container}=mount();
 await screen.findByRole('button',{name:'Switch to French'});
 await waitFor(()=>expect(document.documentElement.lang).toBe('en'));
 expect(document.documentElement.dataset.theme).toBe('dark');
 expect(screen.getByRole('button',{name:'Switch to French'})).toBeTruthy();
 expect(artworkSource(container.querySelector('.giraffe-full'))).toBe('/assets/giraffe-night.webp');
});
