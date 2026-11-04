"""Check actual built placements, affiliate links, images and disclosures."""
from pathlib import Path
import sys
from bs4 import BeautifulSoup
from PIL import Image

root = Path(sys.argv[1] if len(sys.argv) > 1 else '_site')
checked = 0
for file in root.rglob('*.html'):
    text = file.read_text()
    assert 'tacchettee' not in text.lower(), file
    soup = BeautifulSoup(text, 'html.parser')
    is_article = bool(soup.select_one('.article-heading .article-kicker'))
    is_home = file == root / 'index.html'
    banners = soup.select('.sorare-banner')
    assert len(banners) == int(is_article or is_home), (file, len(banners))
    if not banners:
        continue
    banner = banners[0]
    if is_article:
        body = soup.select_one('.article-body')
        assert body.find_next_sibling() == banner, file
        assert not body.select('.sorare-banner'), file
        assert banner.find_next_sibling().get('class') == ['share-bar'], file
    if is_home:
        assert banner.find_previous_sibling().get('class') and 'feature-card' in banner.find_previous_sibling()['class'], file
    assert 'Pubblicità · Link affiliato' in banner.get_text(), file
    assert 'commissione sugli acquisti idonei' in banner.get_text(), file
    for a in banner.select('.sorare-cta, .sorare-image-link'):
        assert a['href'] == 'https://sorare.pxf.io/c/7902118/878695/12209', file
        assert {'sponsored', 'noopener', 'noreferrer'} <= set(a['rel']), file
        assert a['target'] == '_blank', file
    img = banner.select_one('img')
    with Image.open(root / img['src'].lstrip('/')) as image:
        assert image.size == (int(img['width']), int(img['height'])), file
    assert img['loading'] == 'lazy' and img['alt'], file
    assert not banner.select('script'), file
    checked += 1
assert checked > 2
print(f'PASS: Sorare on {checked} pages, single placement, links, dimensions, disclosure; no previous affiliate')
