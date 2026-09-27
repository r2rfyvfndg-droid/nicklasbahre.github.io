document.addEventListener('DOMContentLoaded',()=>{
  const header=document.querySelector('.header-inner, header .wrap');
  if(!header)return;
  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='site-menu-toggle';
  toggle.setAttribute('aria-label','Apri il menu');
  toggle.setAttribute('aria-controls','site-menu-panel');
  toggle.setAttribute('aria-expanded','false');
  toggle.innerHTML='<span></span><span></span><span></span>';
  header.prepend(toggle);
  const backdrop=document.createElement('div');
  backdrop.className='site-menu-backdrop';
  backdrop.hidden=true;
  const panel=document.createElement('aside');
  panel.className='site-menu-panel';
  panel.id='site-menu-panel';
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-modal','true');
  panel.setAttribute('aria-labelledby','site-menu-title');
  panel.hidden=true;
  panel.innerHTML=`
    <div class="site-menu-top"><div class="site-menu-brand" id="site-menu-title">NICKLAS <b>NEWS</b></div><button class="site-menu-close" type="button" aria-label="Chiudi il menu">×</button></div>
    <nav class="site-menu-links" aria-label="Navigazione principale">
      <a href="/">Home</a><a href="/#notizie">Articoli</a><a href="https://x.com/nicklasbahre" target="_blank" rel="noopener noreferrer">Seguici su X ↗</a>
    </nav>
    <section><h2>Chi siamo</h2><p>Nicklas News è il progetto di Nicklas Bahre: notizie, opinioni e ironia sul calcio, con un occhio di riguardo per l’Inter.</p></section>
    <section><h2>Contatti</h2><p>Per segnalazioni, proposte o collaborazioni, scrivici:</p><a class="site-menu-contact" href="mailto:nicklasbahre@gmail.com">nicklasbahre@gmail.com</a></section>
    <p class="site-menu-note">Un progetto indipendente e satirico. Le opinioni pubblicate appartengono a Nicklas News.</p>`;
  document.body.append(backdrop,panel);
  const closeButton=panel.querySelector('.site-menu-close');
  function close(){panel.hidden=true;backdrop.hidden=true;document.body.classList.remove('site-menu-open');toggle.setAttribute('aria-expanded','false');toggle.focus()}
  function open(){panel.hidden=false;backdrop.hidden=false;document.body.classList.add('site-menu-open');toggle.setAttribute('aria-expanded','true');closeButton.focus()}
  toggle.addEventListener('click',open);
  closeButton.addEventListener('click',close);
  backdrop.addEventListener('click',close);
  panel.querySelectorAll('a').forEach(link=>link.addEventListener('click',close));
  document.addEventListener('keydown',event=>{
    if(panel.hidden)return;
    if(event.key==='Escape'){close();return}
    if(event.key!=='Tab')return;
    const items=panel.querySelectorAll('button,a');
    const first=items[0],last=items[items.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  });
});
