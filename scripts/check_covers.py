"""Fail before deployment if any generated cover or social image is missing/wrong-sized."""
from pathlib import Path
import json
from PIL import Image
root=Path(__file__).resolve().parents[1]
images=json.loads((root/'_data/images.json').read_text())
for source,data in images.items():
    for key,size in [('small',(480,270)),('src',(960,540)),('large',(1600,900)),('social',(1200,675))]:
        with Image.open(root/data[key].lstrip('/')) as im:
            assert im.size==size,(source,key,im.size)
            im.verify()
    assert data['social_width']==1200 and data['social_height']==675
print(f'PASS: {len(images)} covers, all responsive and social dimensions')
