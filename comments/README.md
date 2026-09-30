# Commenti Nicklas News

Il sito usa GitHub Pages e il Worker `nicklas-news-comments.5s8kgf529y.workers.dev` con D1.

- Commenti inclusi subito dopo il testo tramite `_includes/comments.html`, nel layout di tutti i post e nella pagina storica Stanković.
- Solo nickname e commento, nessuna email o registrazione; pubblicazione immediata.
- Mi piace/non mi piace: un voto modificabile per browser e commento. Un identificatore casuale in localStorage ricorda il voto; non è un'identità verificata.
- Testo reso con textContent, limite 1000 caratteri, nickname di 2–24 caratteri; nome della redazione riservato.
- Antispam: campo esca, massimo 3 invii e 30 voti al minuto per IP. Le chiavi dei limiti sono hash temporanei eliminati dopo pochi minuti. Nessun CAPTCHA richiesto.
- Paginazione dei commenti e del pannello di gestione.
- `/comments/admin.html`: accesso con il secret esistente ADMIN_TOKEN, che rimane solo in memoria nella pagina; rimozione successiva alla pubblicazione.

## Deploy

Worker collegato al branch main, root `/comments`, comando `npx wrangler deploy`. Il binding DB è in wrangler.toml. Le tabelle aggiuntive di voti e limiti vengono create automaticamente e in modo idempotente all'avvio; i commenti esistenti sono preservati. La tabella originale comments è descritta in schema.sql.

Turnstile non è più necessario. Conservare ADMIN_TOKEN come secret del Worker, mai nel repository. Il pannello amministratore rifiuta sempre le operazioni se il secret non è configurato.

## Verifica

GET `/api/comments?article=/notizie/parma-ma-che-cazzo-fai/` deve riportare `version: 2026-09-30-comments-v2` e i conteggi. Verificare invio, visibilità da un altro browser, cambio voto e rimozione con token amministratore.
