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

## Banner Tacchettee

`_includes/affiliate-banner.html` contiene il link affiliato esatto e il testo comuni. La home lo mostra dopo il primo articolo; il layout `articolo` lo inserisce in fase di build dopo il terzo paragrafo, al primo confine esterno ai blocchi annidati (oppure in fondo agli articoli brevi). Vale anche per articoli esistenti e futuri, senza JavaScript né richieste a Tacchettee prima del clic. Per cambiare destinazione aggiornare solo l’href nel componente, preservando tutti gli eventuali parametri di tracking.
