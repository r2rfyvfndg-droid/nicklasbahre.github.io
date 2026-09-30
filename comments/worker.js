const ARTICLE = /^(?:\/notizie\/[a-z0-9-]+\/|\/stankovic\.html)$/;
const NICKNAME = /^[\p{L}\p{N}_ .-]{2,24}$/u;
const VISITOR = /^[a-f0-9-]{36}$/i;
const VERSION = '2026-09-30-comments-v2';
const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function json(data,status=200,origin='') { return new Response(JSON.stringify(data),{status,headers:{...headers,...(origin?{'Access-Control-Allow-Origin':origin,Vary:'Origin'}:{})}}); }
function authorized(request,env) { return Boolean(env.ADMIN_TOKEN && request.headers.get('Authorization') === `Bearer ${env.ADMIN_TOKEN}`); }
const initialized = new WeakMap();
async function initialize(db) {
  if (!initialized.has(db)) initialized.set(db, db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS comment_votes (comment_id INTEGER NOT NULL, visitor TEXT NOT NULL, vote INTEGER NOT NULL CHECK(vote IN (-1,1)), PRIMARY KEY(comment_id,visitor))"),
    db.prepare("CREATE TABLE IF NOT EXISTS comment_limits (key TEXT PRIMARY KEY, bucket INTEGER NOT NULL, count INTEGER NOT NULL)")
  ]).catch(error=>{initialized.delete(db);throw error;}));
  await initialized.get(db);
}
async function limited(db,request,kind,max) {
  const ip=request.headers.get('CF-Connecting-IP') || 'unknown';
  const bucket=Math.floor(Date.now()/60000);
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${kind}:${bucket}:${ip}`));
  const key=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
  const row=await db.prepare('INSERT INTO comment_limits(key,bucket,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,bucket).first();
  await db.prepare('DELETE FROM comment_limits WHERE bucket < ?').bind(bucket-2).run();
  return row.count>max;
}
async function readBody(request) {
  if (!request.headers.get('Content-Type')?.includes('application/json')) throw new Error('input');
  const reader=request.body?.getReader(); if(!reader) throw new Error('input');
  let length=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>8192){await reader.cancel();throw new Error('input');}chunks.push(value);}
  const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
const counts = "SELECT COALESCE(SUM(vote=1),0) AS likes,COALESCE(SUM(vote=-1),0) AS dislikes FROM comment_votes WHERE comment_id=?";
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
        const visitor=VISITOR.test(url.searchParams.get('visitor')||'')?url.searchParams.get('visitor'):'';
        const {results}=await env.DB.prepare("SELECT c.id,c.nickname,c.body,c.created_at,(SELECT COUNT(*) FROM comment_votes v WHERE v.comment_id=c.id AND v.vote=1) AS likes,(SELECT COUNT(*) FROM comment_votes v WHERE v.comment_id=c.id AND v.vote=-1) AS dislikes,COALESCE((SELECT vote FROM comment_votes v WHERE v.comment_id=c.id AND v.visitor=?),0) AS my_vote FROM comments c WHERE c.article=? AND c.status='approved' AND c.id<? ORDER BY c.id DESC LIMIT 21").bind(visitor,article,before).all();
        const total=await env.DB.prepare("SELECT COUNT(*) AS total FROM comments WHERE article=? AND status='approved'").bind(article).first();
        return json({version:VERSION,comments:results.slice(0,20),total:total.total,next:results.length>20?results[19].id:null},200,origin);
      }
      if(url.pathname==='/api/comments' && request.method==='POST') {
        if(!origin)return json({error:'Origine non consentita'},403);
        if(await limited(env.DB,request,'comment',3))return json({error:'Hai inviato diversi commenti. Attendi un minuto e riprova.'},429,origin);
        const data=await readBody(request);
        const article=String(data.article||''),nickname=String(data.nickname||'').trim(),body=String(data.body||'').trim();
        if(data.website || !ARTICLE.test(article)||!NICKNAME.test(nickname)||/^(nicklas\s*(?:bahre|news))$/i.test(nickname)||body.length<1||body.length>1000)return json({error:'Usa un nickname di 2–24 caratteri e un commento di massimo 1000 caratteri. Il nome della redazione è riservato.'},400,origin);
        const duplicate=await env.DB.prepare("SELECT id FROM comments WHERE article=? AND nickname=? AND body=? AND status='approved' AND created_at>strftime('%Y-%m-%dT%H:%M:%SZ','now','-1 minute')").bind(article,nickname,body).first();
        if(!duplicate)await env.DB.prepare("INSERT INTO comments(article,nickname,body,status) VALUES(?,?,?,'approved')").bind(article,nickname,body).run();
        return json({message:'Commento pubblicato.'},201,origin);
      }
      if(url.pathname==='/api/comments/vote' && request.method==='POST') {
        if(!origin)return json({error:'Origine non consentita'},403);
        if(await limited(env.DB,request,'vote',30))return json({error:'Troppi voti in poco tempo. Attendi un minuto.'},429,origin);
        const data=await readBody(request);
        if(!Number.isSafeInteger(data.id)||!VISITOR.test(data.visitor||'')||![-1,0,1].includes(data.vote)||!ARTICLE.test(data.article||''))return json({error:'Voto non valido'},400,origin);
        const comment=await env.DB.prepare("SELECT id FROM comments WHERE id=? AND article=? AND status='approved'").bind(data.id,data.article).first();
        if(!comment)return json({error:'Questo commento non è più disponibile.'},404,origin);
        if(data.vote===0)await env.DB.prepare('DELETE FROM comment_votes WHERE comment_id=? AND visitor=?').bind(data.id,data.visitor).run();
        else await env.DB.prepare('INSERT INTO comment_votes(comment_id,visitor,vote) VALUES(?,?,?) ON CONFLICT(comment_id,visitor) DO UPDATE SET vote=excluded.vote').bind(data.id,data.visitor,data.vote).run();
        return json({...await env.DB.prepare(counts).bind(data.id).first(),my_vote:data.vote},200,origin);
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
