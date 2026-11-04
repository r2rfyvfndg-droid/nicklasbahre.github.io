"""Integration test: future posts, switches and campaign fallback in real Jekyll builds."""
from pathlib import Path
import subprocess
import tempfile
import yaml
from bs4 import BeautifulSoup

root = Path(__file__).resolve().parents[1]
config = root / '_data/sorare.yml'
original = config.read_text()
fixture = root / '_posts/2026-01-01-sorare-integration-fixture.md'
assert not fixture.exists()

def build(destination):
    subprocess.run(['bundle', 'exec', 'jekyll', 'build', '--strict_front_matter', '--destination', str(destination)], cwd=root, check=True)

def banners(destination):
    page = destination / 'notizie/sorare-integration-fixture/index.html'
    return BeautifulSoup(page.read_text(), 'html.parser')

try:
    # No explicit layout and no promotional markup: same defaults as future CMS posts.
    fixture.write_text('---\ntitle: Test automatico Sorare\ndescription: Test temporaneo\ndate: 2026-01-01\ncategory: Inter\nimage: /stankovic.jpeg.PNG\n---\n\nParagrafo breve di prova.\n\n> Citazione da preservare.\n\n| A | B |\n| - | - |\n| 1 | 2 |\n')
    with tempfile.TemporaryDirectory() as folder:
        out = Path(folder) / 'site'
        build(out)
        page = banners(out)
        assert len(page.select('.sorare-banner')) == 1
        assert page.select_one('.article-body').find_next_sibling() == page.select_one('.sorare-banner')
        assert page.select_one('.article-body blockquote') and page.select_one('.article-body table')
        data = yaml.safe_load(original)
        data['enabled'] = False
        config.write_text(yaml.safe_dump(data, allow_unicode=True))
        build(out)
        assert not banners(out).select('.sorare-banner')
        assert not BeautifulSoup((out/'index.html').read_text(), 'html.parser').select('.sorare-banner')
        data['enabled'] = True
        data['promotion'].update(enabled=True, verified=True, starts_at='2020-01-01T00:00:00Z', ends_at='2020-02-01T00:00:00Z', terms_url='https://sorare.com/credit-terms', title='EXPIRED OFFER', image=data['image'])
        config.write_text(yaml.safe_dump(data, allow_unicode=True))
        build(out)
        assert 'EXPIRED OFFER' not in banners(out).get_text()
        assert len(banners(out).select('.sorare-banner')) == 1
        data['promotion']['ends_at'] = '2099-01-01T00:00:00Z'
        data['promotion']['title'] = 'ACTIVE TEST OFFER'
        config.write_text(yaml.safe_dump(data, allow_unicode=True))
        build(out)
        assert 'ACTIVE TEST OFFER' in banners(out).get_text()
        data['promotion']['verified'] = False
        config.write_text(yaml.safe_dump(data, allow_unicode=True))
        build(out)
        assert 'ACTIVE TEST OFFER' not in banners(out).get_text()
    print('PASS: new post inherits banner; nested blocks intact; disable, expired, active and unverified campaigns')
finally:
    config.write_text(original)
    fixture.unlink(missing_ok=True)
