const assert = require('node:assert/strict');
const handler = require('../../api/[...path].js');
(async()=>{
  const originalFetch = global.fetch, originalOrigin = process.env.BACKEND_ORIGIN;
  try {
    process.env.BACKEND_ORIGIN='https://backend.example';
    let received;
    global.fetch=async (url,options)=>{received={url:String(url),options};return {status:200,headers:{getSetCookie:()=>[]},text:async()=>'{"rows":[]}'};};
    const res={setHeader(){},status(code){this.code=code;return this;},send(body){this.body=body;},json(){},end(){}};
    await handler({url:'/api/drift/board?track=arena',method:'GET',headers:{cookie:'nd_session=test'}},res);
    assert.equal(received.url,'https://backend.example/api/drift/board?track=arena');
    assert.equal(received.options.headers.Cookie,'nd_session=test');
    assert.equal(res.code,200);
    console.log('OK: Vercel proxy preserves circuit filters and session cookie.');
  } finally {global.fetch=originalFetch;if(originalOrigin===undefined)delete process.env.BACKEND_ORIGIN;else process.env.BACKEND_ORIGIN=originalOrigin;}
})().catch(error=>{console.error(error);process.exitCode=1;});
