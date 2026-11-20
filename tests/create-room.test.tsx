import {fireEvent,render,screen} from '@testing-library/react';
import {jest,expect,test,beforeEach} from '@jest/globals';
import CreateRoom from '../src/components/lobby/CreateRoom';
import {roomRequest} from '../src/lib/room-client';
import type {RoomView} from '../src/lib/room-types';
const mockPush=jest.fn();
const mockState={lang:'fr',dark:false,user:true,name:'Alice',avatar:'cheetah'};
jest.mock('../src/components/SiteContext',()=>({useSite:()=>({state:mockState,fr:true,ready:true,save:jest.fn()})}));
jest.mock('../src/lib/room-client',()=>({...jest.requireActual<typeof import('../src/lib/room-client')>('../src/lib/room-client'),roomRequest:jest.fn()}));
jest.mock('next/navigation',()=>({useRouter:()=>({push:mockPush,replace:jest.fn()})}));
jest.mock('next/link',()=>({__esModule:true,default:({children,href,...props}:{children:React.ReactNode;href:string})=><a href={href} {...props}>{children}</a>}));
beforeEach(()=>{mockPush.mockReset();jest.mocked(roomRequest).mockReset()});

test('creating a race without a landscape does not rely on native validation of a hidden radio',()=>{
 const {container}=render(<CreateRoom/>);
 expect(container.querySelectorAll('input[type=radio][required]')).toHaveLength(0);
});
test('creating a race without a landscape explains what is missing next to the picker and moves focus into it',()=>{
 const {container}=render(<CreateRoom/>);
 fireEvent.change(screen.getByLabelText('Nom du salon'),{target:{value:'Clairière'}});
 fireEvent.submit(container.querySelector('form')!);
 const picker=container.querySelector('fieldset')!;
 expect(picker.querySelector('[role=alert]')?.textContent).toBe('Choisis l’animal de ta course.');
 expect(picker.contains(document.activeElement)).toBe(true);
 expect(roomRequest).not.toHaveBeenCalled();
});
test('choosing a landscape clears the message and creates the race',async()=>{
 jest.mocked(roomRequest).mockResolvedValue({room:{id:'abc'} as RoomView});
 const {container}=render(<CreateRoom/>);
 fireEvent.change(screen.getByLabelText('Nom du salon'),{target:{value:'Clairière'}});
 fireEvent.submit(container.querySelector('form')!);
 fireEvent.click(container.querySelector('fieldset input[type=radio]')!);
 expect(container.querySelector('fieldset [role=alert]')).toBeNull();
 fireEvent.submit(container.querySelector('form')!);
 await screen.findByRole('button',{name:/Créer/});
 expect(roomRequest).toHaveBeenCalledWith(null,expect.objectContaining({action:'create',name:'Clairière'}));
});
