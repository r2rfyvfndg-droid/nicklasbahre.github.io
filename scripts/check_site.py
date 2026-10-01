"""Validate actual Jekyll output, canonical/social metadata, images and internal links."""
from pathlib import Path
from urllib.parse import urlsplit,unquote
import sys,json
from bs4 import BeautifulSoup
root=Path(sys.argv[1] if len(sys.argv)>1 else '_site')
files=[root/'index.html',root/'chi-siamo/index.html',*root.glob('notizie/*/index.html'),root/'stankovic.html']
checked=0
for file in files:
    text=file.read_text(); soup=BeautifulSoup(text,'html.parser')
    assert '{{' not in text and '{%' not in text,file
    assert len(soup.select('h1'))==1,file
    assert len(soup.select('meta[name="description"]'))==1,file
    assert soup.select_one('meta[name="description"]')['content'],file
    canonical=soup.select_one('link[rel="canonical"]')['href']
    assert canonical.startswith('https://nicklasnews.it/'),(file,canonical)
    assert soup.select_one('meta[property="og:url"]')['content']==canonical,file
    assert soup.select_one('meta[name="twitter:card"]')['content']=='summary_large_image',file
    for prop in ['og:image','twitter:image']:
        item=soup.find('meta',attrs={'property':prop}) or soup.find('meta',attrs={'name':prop})
        assert item['content'].startswith('https://nicklasnews.it/'),(file,prop)
        assert (root/urlsplit(item['content']).path.lstrip('/')).is_file(),(file,prop)
    assert soup.select_one('meta[property="og:image:width"]')['content']=='1200',file
    assert soup.select_one('meta[property="og:image:height"]')['content']=='675',file
    for script in soup.select('script[type="application/ld+json"]'):json.loads(script.string)
    for item in soup.select('a[href],img[src],script[src],link[href]'):
        url=item.get('href',item.get('src',''));parsed=urlsplit(url)
        if parsed.scheme and parsed.netloc!='nicklasnews.it':continue
        if url.startswith(('mailto:','#')):continue
        path=unquote(parsed.path)
        if not path.startswith('/'):continue
        target=root/path.lstrip('/')
        if path.endswith('/'):target=target/'index.html'
        assert target.is_file(),(file,url)
        if item.name=='img':assert item.get('width') and item.get('height'),(file,url)
    if '/notizie/' in str(file):
        assert soup.select_one('[data-comments-article]'),file
        assert 'Nome (es. Peppino)' in text,file
        assert soup.select_one('.article-cover'),file
    checked+=1
home=BeautifulSoup((root/'index.html').read_text(),'html.parser')
assert home.select_one('meta[name="description"]')['content']=='Nicklas News: notizie, opinioni e satira sul calcio di Nicklas Bahre. Inter, Serie A e Nazionali raccontate con ironia e passione nerazzurra.'
print(f'PASS: {checked} pages, metadata, JSON-LD, canonical, local images, internal links, headings, comments')
