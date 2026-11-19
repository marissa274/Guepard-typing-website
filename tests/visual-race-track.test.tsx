import {act,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeAll,beforeEach,expect,jest,test} from '@jest/globals';
import VisualRace from '../src/components/lobby/VisualRace';
import {defaultSettings,type Person,type RoomView} from '../src/lib/room-types';

jest.mock('../src/components/SiteContext',()=>({useSite:()=>({save:jest.fn(),fr:true,state:{lang:'fr',user:false,results:[]}})}));
const mockRequest=jest.fn<(id:string,body:Record<string,unknown>)=>Promise<Record<string,never>>>();
jest.mock('../src/lib/room-client',()=>({roomRequest:(id:string,body:Record<string,unknown>)=>mockRequest(id,body)}));

beforeAll(()=>{HTMLElement.prototype.scrollIntoView=jest.fn<()=>void>()});
beforeEach(()=>{jest.useFakeTimers();mockRequest.mockReset();mockRequest.mockResolvedValue({})});
afterEach(()=>{jest.useRealTimers()});

function racer(values:Partial<Person>&Pick<Person,'id'|'name'>):Person{return {animal:'cheetah',kind:'guest',role:'player',late:false,seen:Date.now(),progress:0,errors:0,typed:0,abandoned:false,...values}}
function running(people:Person[],extra:Partial<RoomView>={}):RoomView{
 const now=Date.now();
 return {id:'track',name:'La jungle',animal:'cheetah',code:'',hostId:'a',people,settings:defaultSettings,phase:'running',createdAt:now-20_000,revision:4,startedAt:now-10_000,text:'abc def ghi',me:'a',isHost:true,players:people.length,serverNow:now,...extra};
}

test('C1-B21: each lane shows the participant avatar: account photo, chosen animal or bot animal',()=>{
 const people=[racer({id:'a',name:'Alex',kind:'demo',animal:'parrot',avatarUrl:'/api/avatars/a?v=2'}),racer({id:'b',name:'Bea',animal:'monkey',kind:'demo'}),racer({id:'c',name:'Bot 1',kind:'bot',animal:'toucan'})];
 const {container}=render(<VisualRace room={running(people)} connected onError={jest.fn()}/>);
 expect(container.querySelector('[data-player-id="a"] .race-lane-label img')?.getAttribute('src')).toBe('/api/avatars/a?v=2');
 expect(container.querySelector('[data-player-id="b"] .race-lane-label .avatar-monkey')).not.toBeNull();
 expect(container.querySelector('[data-player-id="c"] .race-lane-label .avatar-toucan')).not.toBeNull();
});

test('C1-B20: input ignored by the server during the leader pause is kept and sent again when the pause ends',async()=>{
 const people=[racer({id:'a',name:'Alex',input:''}),racer({id:'b',name:'Bea'})];
 const onError=jest.fn<(message:string)=>void>();
 const view=render(<VisualRace room={running(people)} connected onError={onError}/>);
 fireEvent.change(screen.getByLabelText('Texte de la course'),{target:{value:'ab'}});
 await act(async()=>{jest.advanceTimersByTime(200)});
 expect(mockRequest).toHaveBeenCalledWith('track',expect.objectContaining({action:'progress',value:'ab'}));
 mockRequest.mockClear();
 // The snapshot reveals that the batch arrived during the pause: the server kept the previous input.
 const pausedUntil=Date.now()+1000;
 view.rerender(<VisualRace room={running([{...people[0],input:'',pausedUntil},people[1]],{serverNow:Date.now(),revision:5})} connected onError={onError}/>);
 await act(async()=>{jest.advanceTimersByTime(500)});
 expect(mockRequest).not.toHaveBeenCalled();
 expect((screen.getByLabelText('Texte de la course') as HTMLTextAreaElement).value).toBe('ab');
 await act(async()=>{jest.advanceTimersByTime(800)});
 expect(mockRequest).toHaveBeenCalledWith('track',expect.objectContaining({action:'progress',value:'ab'}));
 expect(onError).not.toHaveBeenCalled();
});
