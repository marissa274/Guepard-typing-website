import {afterEach,jest} from '@jest/globals';
import {cleanup} from '@testing-library/react';
afterEach(()=>{cleanup();localStorage.clear();sessionStorage.clear()});
window.matchMedia=jest.fn().mockImplementation(query=>({matches:false,media:query,addEventListener:jest.fn(),removeEventListener:jest.fn()}));
window.HTMLDialogElement.prototype.showModal=function(){this.open=true};
window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'))};
