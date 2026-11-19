import {render,screen,waitFor,fireEvent,act} from '@testing-library/react';
import {SiteProvider,useSite} from '../src/components/SiteContext';
import {authService} from '../src/services/auth';
import {resultService} from '../src/services/results';
import type {Account} from '../src/lib/auth-types';
import {resultPageFixture,storedResultFixture} from './fixtures';
const currentAccount=jest.mocked(authService.current),listResults=jest.mocked(resultService.list);
jest.mock('../src/services/auth',()=>({authService:{current:jest.fn(),logout:jest.fn().mockResolvedValue({user:null})}}));
jest.mock('../src/services/results',()=>({resultService:{list:jest.fn()}}));
function Probe(){const {state,signOut,save,setAccount}=useSite();return <><p>{state.name}:{state.results.map(r=>r.speed).join(',')}</p><button onClick={signOut}>Logout</button><button onClick={()=>setAccount({id:'u2',username:'Bob',avatar:'cheetah'})}>Login Bob</button><button onClick={()=>save('results',[{id:'local',date:0,accuracy:100,speed:999}])}>Finish</button></>}
test('account results restore from the server, refresh on finish, and never leak into guest storage',async()=>{
 sessionStorage.setItem('guepard-results',JSON.stringify([{speed:12}]));
 currentAccount.mockResolvedValue({user:{id:'u1',username:'Alice',avatar:'cheetah'}});
 listResults.mockResolvedValue(resultPageFixture([storedResultFixture({speed:50})],{bestSpeed:50}));
 render(<SiteProvider><Probe/></SiteProvider>);
 await screen.findByText('Alice:50');
 expect(localStorage.getItem('guepard-results')).toBeNull();
 expect(JSON.parse(sessionStorage.getItem('guepard-results')??'null')).toEqual([{speed:12}]);
 fireEvent.click(screen.getByText('Finish'));
 await waitFor(()=>expect(listResults).toHaveBeenCalledTimes(2));
 fireEvent.click(screen.getByText('Logout'));
 await screen.findByText('GuépardCurieux:');
 expect(screen.queryByText('Alice:50')).toBeNull();
});

test('an old bootstrap response cannot sign out a newly authenticated account',async()=>{
 let resolveCurrent:(value:{user:Account|null})=>void=()=>undefined;
 currentAccount.mockReturnValue(new Promise(resolve=>{resolveCurrent=resolve}));
 listResults.mockResolvedValue(resultPageFixture([storedResultFixture({speed:70})],{bestSpeed:70}));
 render(<SiteProvider><Probe/></SiteProvider>);
 fireEvent.click(screen.getByText('Login Bob'));
 await screen.findByText('Bob:70');
 await act(async()=>{resolveCurrent({user:null})});
 expect(screen.getByText('Bob:70')).toBeTruthy();
});
