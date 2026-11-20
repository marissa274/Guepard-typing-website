import {isKnownPath} from '../src/lib/known-paths';

test('real pages are known, unknown paths are not (HTTP 404)',()=>{
 for(const path of [[],['races'],['how'],['play'],['lobby','ABC'],['race','x'],['history','x'],['demo','podium'],['privacy']])expect(isKnownPath(path)).toBe(true);
 for(const path of [['nexiste-pas'],['lobby'],['races','x'],['a','b','c'],['demo']])expect(isKnownPath(path)).toBe(false);
 expect(isKnownPath(undefined)).toBe(true);
});
