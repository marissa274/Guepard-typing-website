/** The inserted range of a textarea edit; replacing letters counts as typing. */
export function typingEdit(previous:string,next:string){
 let start=0;
 while(start<previous.length&&start<next.length&&previous[start]===next[start])start++;
 let oldEnd=previous.length,newEnd=next.length;
 while(oldEnd>start&&newEnd>start&&previous[oldEnd-1]===next[newEnd-1]){oldEnd--;newEnd--}
 return {start,inserted:next.slice(start,newEnd)};
}
