# Commenti Nicklas News

Frontend Jekyll e Worker `nicklas-news-comments.5s8kgf529y.workers.dev`, con binding D1 `DB`.

- Solo nickname e commento; nessun account, email, CAPTCHA o approvazione preventiva.
- Reazioni e voti disattivati. Le vecchie tabelle di voti non vengono cancellate.
- Il browser può ricordare soltanto il nickname; nessun nuovo identificatore per votare.
- Rendering con `textContent`, query SQL parametrizzate, JSON massimo 8 KB, testo massimo 1000 caratteri; nickname 2–24 caratteri, nome della redazione riservato.
- Campo esca, limite 3 tentativi/minuto e 20/ora per IP, massimo 2 link per commento, deduplicazione dei retry entro un minuto. Il limite nativo Cloudflare aggiunge un filtro prima delle query D1, se disponibile.
- Le chiavi dei limiti sono hash con finestre temporali, eliminate dopo 2 ore. Nessun IP salvato in chiaro nelle tabelle.
- Schema inizializzato in modo idempotente, anche su database vuoto. Nessun commento esistente eliminato dalla migrazione.
- `/comments/admin.html`: gestione con il secret `ADMIN_TOKEN`; nessun token nel codice o in localStorage. L’azione Elimina nasconde il commento tramite stato `rejected`.

## Deploy e verifica

Il progetto Cloudflare esistente è configurato per il branch `main`, directory `/comments`, comando `npx wrangler deploy`. La connessione effettiva va verificata osservando la versione restituita dall’API dopo il commit.

`GET /api/comments?article=/notizie/parma-ma-che-cazzo-fai/` deve restituire `version: 2026-10-01-comments-v3`.

Conservare il secret esistente `ADMIN_TOKEN` nel Worker, mai nel repository. Se manca, tutte le operazioni amministrative restano negate. Il proprietario inserisce il token soltanto nel pannello amministratore.

Test locale con SQLite reale: `node tests/comments.mjs` (Node 24). Verifica schema, scrittura/lettura immediata, rimozione autenticata, CORS, limiti, injection, paginazione e disattivazione voti. Per confermare anche i secret del servizio online occorre un test autenticato nel pannello.
