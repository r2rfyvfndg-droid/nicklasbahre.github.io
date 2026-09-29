# Commenti Nicklas News

Il sito rimane statico su GitHub Pages. Un Cloudflare Worker gestisce `/api/comments` e un database D1 salva i commenti. I lettori scelgono un nickname senza account. I nuovi commenti restano in attesa finché Nicklas non li approva in `/comments/admin.html`.

## Attivazione su Cloudflare

1. Crea un widget Turnstile per `nicklasnews.it`. Copia la **site key** pubblica e conserva la **secret key** privata.
2. Crea un database D1 chiamato `nicklas-news-comments` e applica `schema.sql` al database remoto.
3. Copia `wrangler.toml.example` in `wrangler.toml`, inserisci l'ID del database D1 e distribuisci il Worker. La configurazione richiede Wrangler 4.36 o successivo.
4. Aggiungi al Worker i secret `TURNSTILE_SECRET` e `ADMIN_TOKEN` (token lungo e casuale). Non inserire i loro valori nel repository.
5. Configura il dominio su Cloudflare in modalità proxy e la route Worker `nicklasnews.it/api/comments*`, mantenendo GitHub Pages come origine delle altre pagine.
6. Verifica GET `/api/comments?article=/notizie/parma-ma-che-cazzo-fai/`, poi imposta in `_config.yml` `comments_enabled: true` e `comments_sitekey: "<site key pubblica>"`. La sezione commenti comparirà automaticamente in ogni articolo.
7. Apri `/comments/admin.html` per approvare o rifiutare i commenti. Il token amministratore va inserito solo lì e non viene salvato nel browser.

Il Worker verifica origine, token Turnstile sul server, lunghezza del testo e limite di invii. Visualizza solo commenti approvati. Le pagine non interpretano HTML nei commenti.
