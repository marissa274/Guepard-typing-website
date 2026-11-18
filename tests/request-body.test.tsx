import {ReadableStream} from 'node:stream/web';
import {readLimitedBody} from '../src/server/request-body';

test('a body at the limit is read without trusting Content-Length',async()=>{
 const stream=new ReadableStream({start(controller){controller.enqueue(Buffer.from('abc'));controller.enqueue(Buffer.from('de'));controller.close()}});
 await expect(readLimitedBody(stream,5)).resolves.toEqual(Buffer.from('abcde'));
});
test('an oversized streamed body is cancelled before any later chunks are consumed',async()=>{
 const cancel=jest.fn();
 const stream=new ReadableStream({start(controller){controller.enqueue(Buffer.alloc(6))},cancel});
 await expect(readLimitedBody(stream,5)).rejects.toMatchObject({status:413});
 expect(cancel).toHaveBeenCalledTimes(1);
});
