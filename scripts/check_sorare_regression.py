"""Compare built editorial content and SEO with the pre-integration templates."""
from pathlib import Path
import subprocess
import tempfile
from bs4 import BeautifulSoup

root = Path(__file__).resolve().parents[1]
base = 'b50872bf085819d2f2504fe4a20b08e5380a5e18'
files = ['_includes/affiliate-banner.html', '_includes/article-with-affiliate.html', '_includes/head.html', '_layouts/articolo.html']
saved = {name: (root/name).read_bytes() if (root/name).exists() else None for name in files}
try:
    for name in files:
        (root/name).write_bytes(subprocess.check_output(['git', 'show', f'{base}:{name}'], cwd=root))
    with tempfile.TemporaryDirectory() as folder:
        baseline = Path(folder)/'baseline'
        subprocess.run(['bundle', 'exec', 'jekyll', 'build', '--strict_front_matter', '--destination', str(baseline)], cwd=root, check=True)
        count = 0
        for file in (root/'_site').rglob('*.html'):
            oldfile = baseline/file.relative_to(root/'_site')
            assert oldfile.exists(), file
            before = BeautifulSoup(oldfile.read_text(), 'html.parser')
            after = BeautifulSoup(file.read_text(), 'html.parser')
            for selector in ('title', 'meta', 'link[rel="canonical"]', 'script[type="application/ld+json"]'):
                assert [str(x) for x in before.select(selector)] == [str(x) for x in after.select(selector)], (file, selector)
            body = before.select_one('.article-body')
            if body:
                for banner in body.select('.affiliate-banner'):
                    banner.decompose()
                assert body.get_text(' ',strip=True) == after.select_one('.article-body').get_text(' ',strip=True), file
                for selector in ('img', 'table', 'blockquote', 'a'):
                    assert [str(x) for x in body.select(selector)] == [str(x) for x in after.select_one('.article-body').select(selector)], (file, selector)
            count += 1
        check = subprocess.run(['python', 'scripts/check_site.py', str(baseline)], cwd=root, capture_output=True, text=True)
        if check.returncode:
            print('BASELINE CHECK (pre-existing failure):', check.stderr.splitlines()[-1])
        print(f'PASS: {count} HTML pages retain titles, meta, canonical, JSON-LD and editorial content/structures')
finally:
    for name, content in saved.items():
        if content is None:
            (root/name).unlink(missing_ok=True)
        else:
            (root/name).write_bytes(content)
