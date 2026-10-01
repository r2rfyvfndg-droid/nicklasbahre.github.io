import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../comments/worker.js';
const sqlite = new DatabaseSync(':memory:');
const db = {
  prepare(sql) {
    let args = [];
    return {bind(...values) {args = values; return this;},
      async first() {return sqlite.prepare(sql).get(...args) || null;},
      async all() {return {results:sqlite.prepare(sql).all(...args)};},
      async run() {return sqlite.prepare(sql).run(...args);}};
  },
  async batch(statements) {for (const statement of statements) await statement.run();}
};
const env = {DB:db, SITE_ORIGIN:'https://nicklasnews.it', ADMIN_TOKEN:'test-only-not-a-live-secret'};
let ip = 0;
const article = '/notizie/test-solo-locale/';
async function call(path='', method='GET', body, extra={}) {
  const headers = {'Origin':env.SITE_ORIGIN, 'CF-Connecting-IP':`192.0.2.${++ip}`, ...extra};
  if (body !== undefined) headers['Content-Type']='application/json';
  const response = await worker.fetch(new Request('https://test.invalid/api/comments'+path, {method,headers,body:body === undefined ? undefined : JSON.stringify(body)}),env);
  return {status:response.status,headers:response.headers,data:method==='OPTIONS' ? null : await response.json()};
}
let r=await call('?article='+article); assert.equal(r.status,200); assert.equal(r.data.total,0);
r=await call('', 'POST', {article,nickname:'Peppino',body:'<script>alert(1)</script> Una opinione con apostrofo: l’Inter'});
assert.equal(r.status,201); assert.equal(r.data.comment.nickname,'Peppino'); const id=r.data.comment.id;
r=await call('?article='+article);assert.equal(r.data.total,1);assert.equal(r.data.comments[0].id,id);assert.ok(r.data.comments[0].body.includes('<script>'));
assert.equal((await call('','POST',{article,nickname:'Peppino',body:'<script>alert(1)</script> Una opinione con apostrofo: l’Inter'})).status,201);
assert.equal((await call('?article='+article)).data.total,1,'Retry must not duplicate a comment');
assert.equal((await call('','POST',{article,nickname:'Nicklas Bahre',body:'Fake author'})).status,400);
assert.equal((await call('','POST',{article,nickname:'Peppino',body:'Spam',website:'https://spam.invalid'})).status,400);
assert.equal((await call('','POST',{article,nickname:'Peppino',body:'Text'},{Origin:'https://evil.invalid'})).status,403);
assert.equal((await call('','POST',{article:"/' OR 1=1 --",nickname:'Peppino',body:'Text'})).status,400);
assert.equal((await call('','POST',{article,nickname:'Peppino',body:'x'.repeat(1001)})).status,400);
assert.equal((await call('','POST',{article,nickname:'Peppino',body:'x'.repeat(9000)})).status,400);
for(let i=0;i<4;i++){r=await call('','POST',{article,nickname:'Flood',body:'text '+i},{'CF-Connecting-IP':'198.51.100.10'});assert.equal(r.status,i===3?429:201);}
assert.equal((await call('/moderate')).status,401);
const auth={Authorization:`Bearer ${env.ADMIN_TOKEN}`};
assert.equal((await call('/moderate','GET',undefined,auth)).status,200);
assert.equal((await call('/moderate','POST',{id,status:'rejected'},auth)).status,200);
r=await call('?article='+article);assert.ok(!r.data.comments.some(c=>c.id===id));
assert.equal((await call('/vote','POST',{id,vote:1})).status,404);
assert.equal((await call('','OPTIONS')).status,204);
assert.equal((await call('','OPTIONS',undefined,{Origin:'https://evil.invalid'})).status,403);
for(let i=0;i<23;i++)await call('','POST',{article,nickname:'Lettore',body:'Commento '+i});
r=await call('?article='+article);assert.equal(r.data.comments.length,20);assert.ok(r.data.next);
const page2=await call('?article='+article+'&before='+r.data.next);assert.ok(page2.data.comments.length>0);assert.ok(page2.data.comments.every(c=>c.id<r.data.next));
assert.equal((await call('?article='+article+'&before=-1')).status,400);
assert.equal((await call('?article='+article)).headers.get('Access-Control-Allow-Origin'),env.SITE_ORIGIN);
console.log('PASS: schema, immediate publishing, retries, moderation, pagination, CORS, rate limit, injection, honeypot, length limits, disabled votes');
