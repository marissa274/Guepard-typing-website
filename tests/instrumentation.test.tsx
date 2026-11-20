/**
 * @jest-environment node
 */
import {afterEach,expect,test} from '@jest/globals';

const saved={...process.env};
afterEach(()=>{process.env={...saved}});
const env=(values:Record<string,string|undefined>)=>{process.env={...saved,...values} as NodeJS.ProcessEnv};

test('the Node server refuses to start in production without AUTH_SECRET',async()=>{
 env({NEXT_RUNTIME:'nodejs',NODE_ENV:'production',AUTH_SECRET:undefined});
 const {register}=await import('../instrumentation');
 await expect(register()).rejects.toThrow('AUTH_SECRET est requis');
});

test('the Node server starts in production when AUTH_SECRET is set',async()=>{
 env({NEXT_RUNTIME:'nodejs',NODE_ENV:'production',AUTH_SECRET:'test-only-secret'});
 const {register}=await import('../instrumentation');
 await expect(register()).resolves.toBeUndefined();
});
