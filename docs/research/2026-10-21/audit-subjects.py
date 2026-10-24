from pathlib import Path
from html.parser import HTMLParser
import csv
import re

out=Path(__file__).resolve().parent
html=Path('D:/rclone/research/ruang-belajar-2026-10-21/cambridge-subjects.html').read_text(encoding='utf-8')
start=html.index('circle firstcambridge-as-a-level')
end=html.find('To find',start)
assert end>start
class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.href=''; self.text=[]; self.rows=[]
    def handle_starttag(self,tag,attrs):
        if tag=='a': self.href=dict(attrs).get('href',''); self.text=[]
    def handle_data(self,data):
        if self.href:self.text.append(data)
    def handle_endtag(self,tag):
        if tag=='a' and self.href:
            title=' '.join(''.join(self.text).split())
            if re.search(r'/programmes-and-qualifications/cambridge-international-(as-and-a-level|as-level|a-level)-',self.href):
                code=re.search(r'\b\d{4}\b',title)
                if code:self.rows.append((code.group(),title,'https://www.cambridgeinternational.org'+self.href))
            self.href='';self.text=[]
parser=Links(); parser.feed(html[start:end])
rows=list(dict.fromkeys(parser.rows))
with (out/'cambridge-subject-scope.csv').open('w',encoding='utf-8-sig',newline='') as stream:
    writer=csv.writer(stream)
    writer.writerow(['syllabus','subject','scope_result','audit_depth','official_url'])
    for code,title,url in rows:
        related=code in {'9709','9694','9093'}
        writer.writerow([code,title,'irisan_topik_tanpa_jalur_Cambridge' if related else 'belum_ada_jalur_mata_pelajaran', 'bab_dan_komponen' if related else 'inventaris_mata_pelajaran',url])
print({'subject_entries':len(rows),'detailed_subjects':3,'other_entries':len(rows)-3})
