import {expect,test} from '@jest/globals';
import {typingEdit} from '../src/lib/typing-edits';

test.each([
 ['', 'abc', 0, 'abc'],
 ['abc', 'abcd', 3, 'd'],
 ['axc', 'abc', 1, 'b'],
 ['abXYZcd', 'abQcd', 2, 'Q'],
 ['abcd', 'acd', 1, ''],
 ['abc', 'abc', 3, ''],
])('editing %s into %s identifies inserted characters', (previous,next,start,inserted)=>{
 expect(typingEdit(previous,next)).toEqual({start,inserted});
});
