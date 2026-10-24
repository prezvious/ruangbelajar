from pathlib import Path
import json
import re
from pypdf import PdfReader
import pypdfium2 as pdfium
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[3]
source = Path('D:/rclone/research/ruang-belajar-2026-10-21/pdf')
work = Path('D:/rclone/research/ruang-belajar-2026-10-21/rendered')
work.mkdir(parents=True, exist_ok=True)
records = []
for file in sorted(source.glob('*.pdf')):
    reader = PdfReader(str(file))
    texts = [page.extract_text() or '' for page in reader.pages]
    (work / (file.stem + '.txt')).write_text('\n\n'.join(f'=== PAGE {i+1} ===\n{text}' for i, text in enumerate(texts)), encoding='utf-8')
    record = dict(file=file.name, pages=len(texts), text_characters=sum(map(len,texts)), page_characters=list(map(len,texts)))
    # Inspect every page of short modules. Long books receive a documented sample.
    pages = list(range(len(texts))) if len(texts) <= 14 else list(range(min(4,len(texts))))
    if file.name.startswith('cambridge-'):
        pages = {'9709':[8,14,15,18,21,25,30,33,36], '9694':[7,8,10,13,18], '9093':[8,9,11,12,14,16]}[re.search(r'cambridge-(\d+)',file.name).group(1)]
    pdf = pdfium.PdfDocument(str(file))
    page_images=[]
    for number in pages:
        page=pdf[number]
        bitmap=page.render(scale=1.4)
        img=bitmap.to_pil().convert('RGB')
        single=work/f'{file.stem}-p{number+1}.png'
        img.save(single)
        img.thumbnail((660,950))
        page_images.append((number,img.copy()))
        bitmap.close(); page.close()
    for offset in range(0,len(page_images),6):
        group=page_images[offset:offset+6]
        sheet=Image.new('RGB',(1360,1020*((len(group)+1)//2)), '#dedede')
        draw=ImageDraw.Draw(sheet)
        for i,(number,img) in enumerate(group):
            x=20+(i%2)*680; y=30+(i//2)*1020
            draw.text((x,y-20),f'{file.name} / PDF page {number+1}',fill='black')
            sheet.paste(img,(x,y))
        sheet.save(work/f'{file.stem}-contact-{offset//6+1}.jpg',quality=92)
    record['rendered_pages']=[p+1 for p in pages]
    records.append(record)
    pdf.close()
(root/'docs/research/2026-10-21/pdf-inspection.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(records,ensure_ascii=False,indent=2))
