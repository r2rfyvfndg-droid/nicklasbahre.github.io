# Nicklas News

Blog calcistico di **Nicklas Bahre**, pubblicato con Jekyll/GitHub Pages su https://nicklasnews.it. Logo ufficiale e palette scura/nerazzurra sono mantenuti.

## Pubblicare un articolo

Caricare la copertina nel repository (root oppure `images/`), quindi creare il post in `_posts/` con titolo, descrizione, data, categoria e percorso `image`. Formato consigliato **1600×900**. Il workflow prepara WebP 480/960/1600 e JPEG social **1200×675**, conservando l’immagine intera; gli originali con proporzioni diverse ricevono margini scuri, senza ritagli. L’automazione prepara anche nuove immagini non ancora collegate a un post.

I percorsi ottimizzati contengono un hash: sostituire la copertina genera URL nuovi, evitando vecchie immagini in cache. Il campo `satire` è `true` di default; usare `false` per contenuti non satirici. `topics: [Inter, Nazionali]` permette filtri trasversali senza cambiare la categoria. L’autore visualizzato è sempre Nicklas Bahre.

## Controlli

- `python scripts/prepare_images.py` e `python scripts/check_covers.py`
- `node tests/comments.mjs` (Node 24)
- `bundle install` e `bundle exec jekyll build --strict_front_matter`
- `python scripts/check_site.py _site`

Dipendenze Python: Pillow, PyYAML, beautifulsoup4. Il workflow **Verifica sito e commenti** esegue i controlli su push/PR. `/admin/layout-check.html` è una pagina tecnica non indicizzabile per verificare homepage, articolo e pagina informativa a larghezze 320–1920px; non simula motori Safari/Android o dispositivi fisici.

Font Barlow Condensed e DM Sans serviti localmente in WOFF2, con licenze OFL in `assets/fonts/`. Le copertine hanno dimensioni dichiarate, srcset e caricamento differito; la principale usa priorità alta. La cache HTTP di produzione è gestita da GitHub Pages. Non vengono dichiarati risultati Core Web Vitals senza misure reali.

Commenti e moderazione: `comments/README.md`. Nessun segreto deve essere inserito nel frontend; il token pubblico Cloudflare Web Analytics non è un token amministrativo.

## Affiliazione Sorare

Configurazione unica: `_data/sorare.yml`. Modificare URL, titolo, descrizione, pulsante, immagine o `enabled`, poi pubblicare la modifica con una nuova build Jekyll. Per rimuovere tutti i moduli impostare `enabled: false`. Il link Impact viene utilizzato esattamente come configurato.

`_includes/affiliate-banner.html` genera HTML statico, senza JavaScript o richieste a Impact/Sorare prima del clic. La homepage lo include dopo il primo articolo. `_layouts/articolo.html` lo include una sola volta dopo il contenuto editoriale, prima di condivisione, commenti e correlati. Vale anche per tutti i nuovi post creati dal CMS (`admin/config.yml`) o direttamente in `_posts/`, grazie al layout predefinito in `_config.yml`. Nessun inserimento intermedio.

La creatività generale Stellar Nights è derivata dall'originale fornito, senza ritaglio, in WebP 320×400 e 640×800. Non sono attive le creatività da 150 €: termini e contratto Impact dell'account non verificati. Commissioni e attribuzione non sono promesse ai lettori.

### Campagne temporanee

`promotion` è disattivata. Per attivarla occorrono `enabled: true`, `verified: true`, `starts_at`, `ends_at`, `terms_url` e un oggetto `image` completo (src, width, height, alt ed eventualmente srcset). Impostare titolo e descrizione con le condizioni effettivamente verificate. Le date ISO includono il fuso (es. `+01:00`). Fuori dall'intervallo si usa la creatività generale. **La scadenza è valutata durante la build: programmare una nuova build alla scadenza o disattivare e ripubblicare prima di allora.** Non è un timer nel browser. Per disattivare solo l'offerta: `promotion.enabled: false` e nuova build.

Verifica automatica: `python scripts/check_sorare.py _site`. `python scripts/test_sorare_build.py` verifica anche un nuovo articolo temporaneo e gli stati disattivato/scaduto; i file di prova sono rimossi dopo il test.
