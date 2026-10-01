const ARTICLE = /^(?:\/notizie\/[a-z0-9-]+\/|\/stankovic\.html)$/;
const NICKNAME = /^[\p{L}\p{N}_ .-]{2,24}$/u;
const VERSION = '2026-10-01-comments-v3';
const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function json(data,status=200,origin='') { return new Response(JSON.stringify(data),{status,headers:{...headers,...(origin?{'Access-Control-Allow-Origin':origin,Vary:'Origin'}:{})}}); }
function authorized(request,env) { return Boolean(env.ADMIN_TOKEN && request.headers.get('Authorization') === `Bearer ${env.ADMIN_TOKEN}`); }
const initialized = new WeakMap();
async function initialize(db) {
  if (!initialized.has(db)) initialized.set(db, db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, article TEXT NOT NULL, nickname TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('pending','approved','rejected')), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')))"),
    db.prepare("CREATE INDEX IF NOT EXISTS comments_article_page ON comments(article,status,id)"),
    db.prepare("CREATE TABLE IF NOT EXISTS comment_limits (key TEXT PRIMARY KEY, bucket INTEGER NOT NULL, count INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS comment_limits_bucket ON comment_limits(bucket)")
  ]).catch(error=>{initialized.delete(db);throw error;}));
  await initialized.get(db);
}
async function limited(db,request,kind,max,period=60) {
  const ip=request.headers.get('CF-Connecting-IP') || 'unknown';
  const bucket=Math.floor(Date.now()/1000/period);
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${kind}:${bucket}:${ip}`));
  const key=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
  const row=await db.prepare('INSERT INTO comment_limits(key,bucket,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,Math.floor(Date.now()/60000)).first();
  await db.prepare('DELETE FROM comment_limits WHERE bucket < ?').bind(Math.floor(Date.now()/60000)-120).run();
  return row.count>max;
}
async function readBody(request) {
  if (!request.headers.get('Content-Type')?.includes('application/json')) throw new Error('input');
  const reader=request.body?.getReader(); if(!reader) throw new Error('input');
  let length=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>8192){await reader.cancel();throw new Error('input');}chunks.push(value);}
  const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
  const data=JSON.parse(new TextDecoder().decode(bytes));
  if(!data || typeof data!=='object' || Array.isArray(data))throw new Error('input');
  return data;
}
export default {
  async fetch(request,env) {
    const origin=request.headers.get('Origin')===env.SITE_ORIGIN?env.SITE_ORIGIN:'';
    if(request.method==='OPTIONS') return new Response(null,{status:origin?204:403,headers:origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization',Vary:'Origin'}:{}});
    if(!env.DB) return json({error:'Servizio non configurato'},503,origin);
    const url=new URL(request.url);
    try {
      await initialize(env.DB);
      if(url.pathname==='/api/comments' && request.method==='GET') {
        const article=url.searchParams.get('article')||'';
        if(!ARTICLE.test(article)) return json({error:'Articolo non valido'},400,origin);
        const before=Number(url.searchParams.get('before')||Number.MAX_SAFE_INTEGER);
        if(!Number.isSafeInteger(before)||before<1)return json({error:'Pagina non valida'},400,origin);
        const {results}=await env.DB.prepare("SELECT id,nickname,body,created_at FROM comments WHERE article=? AND status='approved' AND id<? ORDER BY id DESC LIMIT 21").bind(article,before).all();
        const total=await env.DB.prepare("SELECT COUNT(*) AS total FROM comments WHERE article=? AND status='approved'").bind(article).first();
        return json({version:VERSION,comments:results.slice(0,20),total:total.total,next:results.length>20?results[19].id:null},200,origin);
      }
      if(url.pathname==='/api/comments' && request.method==='POST') {
        if(!origin)return json({error:'Origine non consentita'},403);
        if(env.COMMENT_LIMITER && !(await env.COMMENT_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'})).success)return json({error:'Attendi un minuto prima di inviare un altro commento.'},429,origin);
        if(await limited(env.DB,request,'comment',3) || await limited(env.DB,request,'comment-hour',20,3600))return json({error:'Hai inviato diversi commenti. Attendi qualche minuto e riprova.'},429,origin);
        const data=await readBody(request);
        const article=String(data.article||''),nickname=String(data.nickname||'').normalize('NFC').trim(),body=String(data.body||'').trim();
        if(data.website || !ARTICLE.test(article)||!NICKNAME.test(nickname)||/^(nicklas\s*(?:bahre|news))$/i.test(nickname)||body.length<1||body.length>1000||(/https?:\/\//gi.test(body)&&(body.match(/https?:\/\//gi)||[]).length>2))return json({error:'Usa un nickname di 2–24 caratteri e un commento di massimo 1000 caratteri. Il nome della redazione è riservato.'},400,origin);
        const duplicate=await env.DB.prepare("SELECT id FROM comments WHERE article=? AND nickname=? AND body=? AND status='approved' AND created_at>strftime('%Y-%m-%dT%H:%M:%SZ','now','-1 minute')").bind(article,nickname,body).first();
        const comment=duplicate ? await env.DB.prepare('SELECT id,nickname,body,created_at FROM comments WHERE id=?').bind(duplicate.id).first() : await env.DB.prepare("INSERT INTO comments(article,nickname,body,status) VALUES(?,?,?,'approved') RETURNING id,nickname,body,created_at").bind(article,nickname,body).first();
        return json({message:'Commento pubblicato.',comment},201,origin);
      }
      if(url.pathname==='/api/comments/moderate') {
        if(!authorized(request,env))return json({error:'Token amministratore non valido.'},401,origin);
        if(request.method==='GET') {
          const before=Number(url.searchParams.get('before')||Number.MAX_SAFE_INTEGER);
          if(!Number.isSafeInteger(before)||before<1)return json({error:'Pagina non valida'},400,origin);
          const {results}=await env.DB.prepare("SELECT id,article,nickname,body,status,created_at FROM comments WHERE status IN ('approved','pending') AND id<? ORDER BY id DESC LIMIT 101").bind(before).all();
          return json({comments:results.slice(0,100),next:results.length>100?results[99].id:null},200,origin);
        }
        if(request.method==='POST') {
          if(!origin)return json({error:'Origine non consentita'},403);
          const data=await readBody(request);
          if(!Number.isSafeInteger(data.id)||!['approved','rejected'].includes(data.status))return json({error:'Richiesta non valida'},400,origin);
          await env.DB.prepare("UPDATE comments SET status=? WHERE id=? AND status IN ('approved','pending')").bind(data.status,data.id).run();
          return json({ok:true},200,origin);
        }
      }
      return json({error:'Non trovato'},404,origin);
    }catch(error){return json({error:error.message==='input'||error instanceof SyntaxError?'Richiesta non valida.':'Servizio temporaneamente non disponibile.'},error.message==='input'||error instanceof SyntaxError?400:503,origin);}
  }
};
