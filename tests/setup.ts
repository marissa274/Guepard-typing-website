import {afterEach,jest} from '@jest/globals';
import {cleanup} from '@testing-library/react';
// Server suites may opt into `@jest-environment node`: browser shims only apply under jsdom.
if(typeof window!=='undefined'){
 Object.defineProperty(navigator,'language',{value:'fr-CA',configurable:true});
 afterEach(()=>{cleanup();localStorage.clear();sessionStorage.clear()});
 window.matchMedia=jest.fn((query:string):MediaQueryList=>({matches:false,media:query,onchange:null,addEventListener:jest.fn(),removeEventListener:jest.fn(),addListener:jest.fn(),removeListener:jest.fn(),dispatchEvent:jest.fn(()=>false)}));
 window.HTMLDialogElement.prototype.showModal=function(this:HTMLDialogElement){this.open=true};
 window.HTMLDialogElement.prototype.close=function(this:HTMLDialogElement){this.open=false;this.dispatchEvent(new Event('close'))};
}
