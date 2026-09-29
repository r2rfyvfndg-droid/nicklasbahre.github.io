(() => {
  const root = document.querySelector('[data-comments-article]');
  if (!root) return;
  const api = root.dataset.commentsApi || '/api/comments';
  const article = root.dataset.commentsArticle;
  const sitekey = root.dataset.commentsSitekey;
  const list = root.querySelector('.comment-list');
  const status = root.querySelector('.comment-status');
  const form = root.querySelector('form');
  const button = form.querySelector('button[type="submit"]');
  let widgetId;

  function show(message) { status.textContent = message; }
  async function load() {
    try {
      const response = await fetch(`${api}?article=${encodeURIComponent(article)}`);
      if (!response.ok) throw new Error('Impossibile caricare i commenti.');
      const data = await response.json();
      list.replaceChildren();
      for (const comment of data.comments || []) {
        const item = document.createElement('li');
        const name = document.createElement('strong');
        const date = document.createElement('time');
        const body = document.createElement('p');
        name.textContent = comment.nickname;
        date.dateTime = comment.created_at;
        date.textContent = new Date(comment.created_at).toLocaleDateString('it-IT');
        body.textContent = comment.body;
        item.append(name, date, body);
        list.append(item);
      }
      show(list.children.length ? '' : 'Ancora nessun commento.');
    } catch { show('I commenti non sono disponibili in questo momento.'); }
  }
  function initTurnstile() {
    if (!sitekey || !window.turnstile) return;
    try {
      widgetId = window.turnstile.render(root.querySelector('.comment-turnstile'), {
        sitekey, theme: 'dark', action: 'comment',
        'error-callback': () => {
          show('La verifica antispam non è disponibile. Riprova più tardi.');
          return true;
        },
        'expired-callback': () => show('La verifica è scaduta. Riprova.')
      });
    } catch {
      show('La verifica antispam non è disponibile. Riprova più tardi.');
    }
  }
  window.nicklasCommentsTurnstile = initTurnstile;
  if (window.turnstile) initTurnstile();
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (widgetId === undefined || !window.turnstile) return show('Verifica antispam non disponibile. Riprova più tardi.');
    const token = window.turnstile.getResponse(widgetId);
    if (!token) return show('Completa la verifica antispam.');
    button.disabled = true;
    try {
      const response = await fetch(api, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article, nickname: form.elements.namedItem('nickname').value, body: form.elements.namedItem('body').value, token })
      });
      const data = await response.json();
      show(data.message || data.error || 'Riprova più tardi.');
      if (response.ok) { form.elements.namedItem('body').value = ''; await load(); show(data.message || 'Commento pubblicato.'); window.turnstile.reset(widgetId); }
      else window.turnstile.reset(widgetId);
    } catch { show('Invio non riuscito. Riprova più tardi.'); window.turnstile.reset(widgetId); }
    finally { button.disabled = false; }
  });
  if (!window.turnstile) {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = initTurnstile;
    script.onerror = () => show('La verifica antispam non si carica. Riprova più tardi.');
    document.head.append(script);
  }
  load();
})();
