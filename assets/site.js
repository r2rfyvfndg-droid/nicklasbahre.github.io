(() => {
  // Keep links from the original hash-based site working.
  const old=location.hash.match(/^#articolo\/([a-z0-9-]+)$/);if(old){location.replace('/notizie/'+old[1]+'/');return;}
  const input=document.getElementById('article-search');
  if(input){
    const stories=[...document.querySelectorAll('#notizie [data-story]')],filters=[...document.querySelectorAll('[data-filter]')],more=document.getElementById('load-stories'),status=document.getElementById('search-status'),empty=document.getElementById('no-stories');
    const normalize=value=>value.toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    let category='tutte',limit=9;
    const entries=stories.map(node=>({node,text:normalize(node.dataset.search||'')}));
    function update(){
      const words=normalize(input.value.trim()).split(/\s+/).filter(Boolean);let matches=0,cardMatches=0;
      entries.forEach(({node,text})=>{const match=(category==='tutte'||node.dataset.category===category||(node.dataset.topics||'').split('|').includes(category)||(category==='satira'&&node.dataset.satire==='true'))&&words.every(word=>text.includes(word));if(match){matches++;if(!node.classList.contains('feature-card'))cardMatches++;}node.hidden=!match||matches>limit;});
      const featured=document.querySelector('.feature-card');const topHeading=document.querySelector('#notizie>.section-heading');if(topHeading)topHeading.hidden=!featured||featured.hidden;
      document.querySelector('.latest-heading').hidden=cardMatches===0;
      more.hidden=matches<=limit;empty.hidden=matches!==0;
      status.textContent=words.length||category!=='tutte'?`${matches} ${matches===1?'articolo trovato':'articoli trovati'}`:'';
    }
    input.addEventListener('input',()=>{limit=9;update();});
    filters.forEach(button=>button.addEventListener('click',()=>{category=button.dataset.filter;limit=9;filters.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));update();}));
    more.addEventListener('click',()=>{const previous=new Set(stories.filter(node=>!node.hidden));limit+=8;update();const firstNew=stories.find(node=>!node.hidden&&!previous.has(node));if(firstNew)firstNew.focus({preventScroll:true});});update();
  }
  document.querySelectorAll('[data-share-url]').forEach(bar=>{
    const url=bar.dataset.shareUrl,title=bar.dataset.shareTitle,status=bar.querySelector('.share-status'),copy=bar.querySelector('[data-copy-link]'),native=bar.querySelector('[data-native-share]');
    copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(url);status.textContent='Link copiato!';copy.textContent='Copiato ✓';setTimeout(()=>{copy.textContent='Copia link';status.textContent='';},3000);}catch{status.textContent='Copia questo link: '+url;}});
    if(navigator.share){native.hidden=false;native.addEventListener('click',async()=>{try{await navigator.share({title,url});}catch(error){if(error.name!=='AbortError')status.textContent='Usa uno dei pulsanti di condivisione.';}});}
  });
})();
