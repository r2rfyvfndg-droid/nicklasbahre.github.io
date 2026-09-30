"""Generate complete, uncropped responsive covers and social cards from post images."""
from pathlib import Path
from PIL import Image, ImageOps
import hashlib, json, re, yaml
ROOT=Path(__file__).resolve().parents[1]
BG=(5,10,17)
VERSION='v1'
def framed(im,size):
    out=Image.new('RGB',size,BG)
    fit=ImageOps.contain(im,size,Image.Resampling.LANCZOS)
    out.paste(fit,((size[0]-fit.width)//2,(size[1]-fit.height)//2))
    return out
def main():
    images={}; original_bytes=0; optimized_bytes=0
    (ROOT/'assets/covers').mkdir(parents=True,exist_ok=True)
    for post in sorted((ROOT/'_posts').glob('*.md')):
        data=yaml.safe_load(post.read_text().split('---',2)[1]) or {}
        source=data.get('image','')
        if not source or source in images:continue
        path=(ROOT/source.lstrip('/')).resolve()
        if not path.is_relative_to(ROOT) or not path.is_file():raise ValueError(f'Missing cover: {source} ({post.name})')
        digest=hashlib.sha256(path.read_bytes()+VERSION.encode()).hexdigest()[:12]
        stem=re.sub(r'[^a-z0-9-]+','-',path.stem.lower()).strip('-')
        base=f'/assets/covers/{stem}-{digest}'
        with Image.open(path) as original:im=ImageOps.exif_transpose(original).convert('RGB')
        entries=[]
        for width in (480,960,1600):
            name=f'{base}-{width}.webp';target=ROOT/name.lstrip('/')
            if not target.exists():framed(im,(width,width*9//16)).save(target,'WEBP',quality=84,method=6)
            entries.append(f'{name} {width}w')
        social=f'{base}-social.jpg';target=ROOT/social.lstrip('/')
        if not target.exists():framed(im,(1200,600)).save(target,'JPEG',quality=88,optimize=True,progressive=True)
        images[source]={'src':f'{base}-960.webp','large':f'{base}-1600.webp','small':f'{base}-480.webp','srcset':', '.join(entries),'social':social,'width':1600,'height':900,'social_width':1200,'social_height':600,'social_type':'image/jpeg'}
        original_bytes+=path.stat().st_size;optimized_bytes+=(ROOT/(base+'-960.webp').lstrip('/')).stat().st_size
    (ROOT/'_data').mkdir(exist_ok=True)
    (ROOT/'_data/images.json').write_text(json.dumps(images,ensure_ascii=False,indent=2)+'\n')
    brand=ROOT/'assets/brand';brand.mkdir(parents=True,exist_ok=True)
    logo=Image.open(ROOT/'nicklas-news-logo.jpg.PNG').convert('RGB')
    # Remove the original empty margins, preserving the complete existing mark.
    logo=logo.crop((265,280,1010,1030))
    framed(logo,(384,384)).save(brand/'logo-384.png',optimize=True)
    framed(logo,(256,256)).save(brand/'logo-256.webp','WEBP',quality=92,method=6)
    for size in (48,192,512):framed(logo,(size,size)).save(ROOT/f'favicon-{size}x{size}.png',optimize=True)
    framed(logo,(180,180)).save(ROOT/'apple-touch-icon.png',optimize=True)
    framed(logo,(48,48)).save(ROOT/'favicon.ico',sizes=[(16,16),(32,32),(48,48)])
    framed(logo,(1200,600)).save(brand/'nicklas-news-social.jpg','JPEG',quality=90,optimize=True)
    print(f'{len(images)} copertine: originali {original_bytes/1e6:.1f} MB, versioni 960px {optimized_bytes/1e6:.1f} MB ({100*(1-optimized_bytes/original_bytes):.0f}% in meno).')
if __name__=='__main__':main()
