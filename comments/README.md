# Commenti Nicklas News

Il sito rimane statico su GitHub Pages. Il Worker `nicklas-news-comments.5s8kgf529y.workers.dev` gestisce `/api/comments` e il database D1 `nicklas-news-comments` salva i commenti. I lettori scelgono un nickname senza account. I nuovi commenti restano in attesa finché Nicklas non li approva in `/comments/admin.html`.

## Configurazione

- Il widget Turnstile per `nicklasnews.it` è stato creato. La site key pubblica è in `_config.yml`.
- Il database D1 ha la tabella `comments` e l'indice creati con `schema.sql`.
- Il Worker è collegato a GitHub con root directory `/comments`, branch `main` e deploy command `npx wrangler deploy`. `wrangler.toml` contiene il binding D1 `DB` e il rate limiter `COMMENT_LIMITER`; le modifiche in questa cartella vengono distribuite dal build automatico.
- Aggiungere nel pannello Worker i secret `TURNSTILE_SECRET` (chiave privata del widget) e `ADMIN_TOKEN` (token lungo e casuale). Non inserire i valori nel repository o in chat.
- Il dominio `nicklasnews.it` rimane su GitHub Pages; l'API usa l'indirizzo `workers.dev` senza cambiare DNS.

## Verifica e attivazione

1. Verificare GET `https://nicklas-news-comments.5s8kgf529y.workers.dev/api/comments?article=/notizie/parma-ma-che-cazzo-fai/` e la risposta `{"comments":[]}`.
2. Impostare in `_config.yml` `comments_enabled: true` e `comments_api: "https://nicklas-news-comments.5s8kgf529y.workers.dev/api/comments"` solo dopo che Worker, binding e secret sono pronti.
3. Provare un invio da un articolo e verificare che resti in moderazione.
4. Aprire `/comments/admin.html` per approvare o rifiutare i commenti. Il token amministratore va inserito solo lì e non viene salvato nel browser.

Il Worker verifica origine, token Turnstile sul server, lunghezza del testo e limite di invii. Visualizza solo commenti approvati. Le pagine non interpretano HTML nei commenti.
