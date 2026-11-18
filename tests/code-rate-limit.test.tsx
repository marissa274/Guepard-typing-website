import {consumeCodeAttempt} from '../src/server/code-rate-limit';
jest.mock('pg',()=>({Pool:jest.fn()}));
test('ten code attempts are permitted per IP per minute and another IP is independent',async()=>{
 const database=process.env.DATABASE_URL;delete process.env.DATABASE_URL;
 jest.useFakeTimers();jest.setSystemTime(1000000);
 try{
  for(let n=0;n<10;n++)await consumeCodeAttempt('limited-ip');
  await expect(consumeCodeAttempt('limited-ip')).rejects.toMatchObject({status:429,code:'CODE_RATE_LIMITED'});
  await expect(consumeCodeAttempt('other-ip')).resolves.toBeUndefined();
  jest.advanceTimersByTime(60000);
  await expect(consumeCodeAttempt('limited-ip')).resolves.toBeUndefined();
 }finally{jest.useRealTimers();if(database!==undefined)process.env.DATABASE_URL=database}
});
