"""Validate actual Jekyll output, canonical/social metadata, images and internal links."""
from pathlib import Path
from urllib.parse import urlsplit,unquote
import sys,json
from bs4 import BeautifulSoup
from PIL import Image
root=Path(sys.argv[1] if len(sys.argv)>1 else '_site')
files=[root/'index.html',root/'chi-siamo/index.html',root/'404.html',*root.glob('notizie/*/index.html'),root/'stankovic.html']
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
    social_url=soup.select_one('meta[property="og:image"]')['content']
    social_file=root/unquote(urlsplit(social_url).path).lstrip('/')
    with Image.open(social_file) as social_cover:
        actual_width,actual_height=social_cover.size
    declared_width=int(soup.select_one('meta[property="og:image:width"]')['content'])
    declared_height=int(soup.select_one('meta[property="og:image:height"]')['content'])
    assert (declared_width,declared_height)==(actual_width,actual_height),(file,'Incorrect social dimensions')
    assert actual_width*9==actual_height*16,(file,'Social cover must be 16:9')
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

error=BeautifulSoup((root/'404.html').read_text(),'html.parser')
assert error.select_one('meta[name="robots"]')['content']=='noindex,follow'
assert error.select_one('a[href="/#argomenti"]')
from xml.etree import ElementTree as ET
sitemap=ET.parse(root/'sitemap.xml')
locations=[node.text for node in sitemap.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
assert len(locations)==len(set(locations)), 'Duplicate sitemap URL'
assert 'https://nicklasnews.it/404.html' not in locations
for url in locations:
    path=urlsplit(url).path
    target=root/path.lstrip('/')
    if path.endswith('/'):target=target/'index.html'
    assert target.is_file(), ('Broken sitemap URL',url)
    page=BeautifulSoup(target.read_text(),'html.parser')
    assert 'noindex' not in page.select_one('meta[name="robots"]')['content'],url
    assert page.select_one('link[rel="canonical"]')['href']==url,url
print(f'PASS: custom 404, noindex and {len(locations)} unique canonical sitemap URLs')
