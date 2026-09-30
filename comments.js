(() => {
  const root=document.querySelector('[data-comments-article]');if(!root)return;
  const api=root.dataset.commentsApi,article=root.dataset.commentsArticle;
  const list=root.querySelector('.comment-list'),status=root.querySelector('.comment-status'),form=root.querySelector('form'),submit=form.querySelector('[type=submit]'),more=root.querySelector('.comment-more'),total=root.querySelector('.comment-count');
  const nickname=form.elements.namedItem('nickname'),body=form.elements.namedItem('body');
  let visitor=crypto.randomUUID(),next=null,loading=false;
  try{const saved=localStorage.getItem('nn-comment-visitor');if(/^[a-f0-9-]{36}$/i.test(saved||''))visitor=saved;localStorage.setItem('nn-comment-visitor',visitor);nickname.value=localStorage.getItem('nn-comment-nickname')||'';}catch{}
  const show=message=>{status.textContent=message;};
  async function request(url,options){const response=await fetch(url,{...options,signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Richiesta non riuscita. Riprova.');return data;}
  function render(comment){
    const item=document.createElement('li'),head=document.createElement('div'),avatar=document.createElement('span'),name=document.createElement('strong'),date=document.createElement('time'),text=document.createElement('p'),votes=document.createElement('div');
    item.className='comment-card';head.className='comment-head';avatar.className='comment-avatar';avatar.setAttribute('aria-hidden','true');avatar.textContent=comment.nickname.slice(0,1).toUpperCase();name.textContent=comment.nickname;date.dateTime=comment.created_at;date.textContent=new Date(comment.created_at).toLocaleString('it-IT',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});text.textContent=comment.body;votes.className='comment-votes';
    let selected=comment.my_vote||0;const buttons=[];
    function update(data){selected=data.my_vote||0;buttons.forEach((button,index)=>{const value=index===0?1:-1;button.textContent=`${index===0?'👍 Mi piace':'👎 Non mi piace'} · ${Number(index===0?data.likes:data.dislikes)||0}`;button.setAttribute('aria-pressed',String(selected===value));});}
    for(const value of [1,-1]){const button=document.createElement('button');button.type='button';buttons.push(button);button.onclick=async()=>{buttons.forEach(b=>b.disabled=true);try{update(await request(`${api}/vote`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:comment.id,article,visitor,vote:selected===value?0:value})}));show('Voto aggiornato.');}catch(error){show(error.message);}finally{buttons.forEach(b=>b.disabled=false);}};votes.append(button);}
    update(comment);head.append(avatar,name,date);item.append(head,text,votes);return item;
  }
  async function load(append=false){
    if(loading)return;loading=true;more.disabled=true;
    try{const data=await request(`${api}?article=${encodeURIComponent(article)}&visitor=${encodeURIComponent(visitor)}${append&&next?`&before=${next}`:''}`);if(!append)list.replaceChildren();for(const comment of data.comments||[])list.append(render(comment));total.textContent=String(data.total??list.children.length);next=data.next;more.hidden=!next;show(list.children.length?'':'Nessun commento: rompi il silenzio!');}
    catch(error){show('Impossibile caricare i commenti. '+error.message);}
    finally{loading=false;more.disabled=false;}
  }
  more.onclick=()=>load(true);
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!form.reportValidity())return;submit.disabled=true;show('Pubblicazione in corso…');
    try{const data=await request(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({article,nickname:nickname.value,body:body.value,website:form.elements.namedItem('website').value})});try{localStorage.setItem('nn-comment-nickname',nickname.value.trim());}catch{}body.value='';root.querySelector('.comment-characters').textContent='0 / 1000';await load();show(data.message||'Commento pubblicato.');}
    catch(error){show(error.message||'Invio non riuscito. Il testo è ancora qui: riprova.');}
    finally{submit.disabled=false;}
  });
  body.addEventListener('input',()=>{root.querySelector('.comment-characters').textContent=`${body.value.length} / 1000`;});
  load();
})();
