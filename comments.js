(() => {
  const root = document.querySelector('[data-comments-article]');
  if (!root) return;
  const api = root.dataset.commentsApi, article = root.dataset.commentsArticle;
  const list = root.querySelector('.comment-list'), status = root.querySelector('.comment-status');
  const form = root.querySelector('form'), submit = form.querySelector('[type=submit]');
  const more = root.querySelector('.comment-more'), retry = root.querySelector('.comment-retry');
  const total = root.querySelector('.comment-count');
  const nickname = form.elements.namedItem('nickname'), body = form.elements.namedItem('body');
  let next = null, loading = null, started = false;
  try { nickname.value = localStorage.getItem('nn-comment-nickname') || ''; } catch {}
  const show = message => { status.textContent = message; };
  async function request(url, options) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, {...options, signal: controller.signal});
      let data;
      try { data = await response.json(); } catch { throw new Error('Il servizio non risponde correttamente. Riprova tra poco.'); }
      if (!response.ok) throw new Error(data.error || 'Richiesta non riuscita. Riprova.');
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('La connessione è lenta. Riprova tra poco.');
      if (error instanceof TypeError) throw new Error('Connessione non disponibile. Controlla la rete e riprova.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  function render(comment) {
    const item = document.createElement('li'), head = document.createElement('div');
    const avatar = document.createElement('span'), name = document.createElement('strong');
    const date = document.createElement('time'), text = document.createElement('p');
    item.className = 'comment-card'; item.dataset.commentId = String(comment.id);
    head.className = 'comment-head'; avatar.className = 'comment-avatar';
    avatar.setAttribute('aria-hidden', 'true'); avatar.textContent = comment.nickname.slice(0, 1).toUpperCase();
    name.textContent = comment.nickname; date.dateTime = comment.created_at;
    date.textContent = new Date(comment.created_at).toLocaleString('it-IT', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
    text.textContent = comment.body; head.append(avatar, name, date); item.append(head, text);
    return item;
  }
  function load(append = false) {
    if (loading) return loading;
    started = true; more.disabled = true; retry.hidden = true; list.setAttribute('aria-busy', 'true');
    loading = (async () => {
      try {
        const data = await request(`${api}?article=${encodeURIComponent(article)}${append && next ? `&before=${next}` : ''}`);
        if (!append) list.replaceChildren();
        for (const comment of data.comments || []) {
          if (![...list.children].some(item => item.dataset.commentId === String(comment.id))) list.append(render(comment));
        }
        total.textContent = String(data.total ?? list.children.length); next = data.next; more.hidden = !next;
        show(list.children.length ? '' : 'Nessun commento: scrivi il primo!');
        return true;
      } catch (error) {
        show('Impossibile caricare i commenti. ' + error.message); retry.hidden = false;
        return false;
      } finally { loading = null; more.disabled = false; list.setAttribute('aria-busy', 'false'); }
    })();
    return loading;
  }
  more.onclick = () => load(true); retry.onclick = () => load();
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (submit.disabled || !form.reportValidity()) return;
    nickname.value = nickname.value.trim();
    if (!/^[\p{L}\p{N}_ .-]{2,24}$/u.test(nickname.value) || !body.value.trim()) {
      show('Scrivi un nickname di 2–24 caratteri e un commento non vuoto.'); return;
    }
    submit.disabled = true; form.setAttribute('aria-busy', 'true'); show('Pubblicazione in corso…');
    try {
      const data = await request(api, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({article,nickname:nickname.value,body:body.value,website:form.elements.namedItem('website').value})});
      try { localStorage.setItem('nn-comment-nickname', nickname.value); } catch {}
      body.value = ''; root.querySelector('.comment-characters').textContent = '0 / 1000';
      // Wait for an earlier GET before refreshing, so it cannot overwrite the new comment.
      if (loading) await loading;
      const refreshed = await load();
      if (!refreshed && data.comment) {
        if (![...list.children].some(item => item.dataset.commentId === String(data.comment.id))) list.prepend(render(data.comment));
        total.textContent = String(list.children.length);
      }
      show(refreshed ? 'Commento pubblicato.' : 'Commento pubblicato. Non è stato possibile aggiornare l’elenco: premi Riprova.');
    } catch (error) { show(error.message + ' Il testo è ancora qui.'); }
    finally { submit.disabled = false; form.setAttribute('aria-busy', 'false'); }
  });
  body.addEventListener('input', () => { root.querySelector('.comment-characters').textContent = `${body.value.length} / 1000`; });
  // Avoid a database request while the reader is still at the top of the article.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); if (!started) load(); }
    }, {rootMargin:'500px'});
    observer.observe(root);
    form.addEventListener('focusin', () => { observer.disconnect(); if (!started) load(); }, {once:true});
  } else load();
})();
