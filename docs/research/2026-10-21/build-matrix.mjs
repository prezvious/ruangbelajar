import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const out=path.dirname(fileURLToPath(import.meta.url));
const baseline=JSON.parse(fs.readFileSync(path.join(out,'catalog-audit.json'),'utf8'));
const ids=new Set(baseline.topics.map(t=>t.id));
const sources={
  '9709':'https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf',
  '9694':'https://www.cambridgeinternational.org/Images/697412-2026-2027-syllabus.pdf',
  '9093':'https://www.cambridgeinternational.org/Images/721359-2027-2028-syllabus.pdf'
};
// These are editorial judgements about the current LIST, not scores of a learner
// or claims that a broad existing title fully teaches a syllabus learning outcome.
const raw={
'9709':`
1.1|Kuadrat|math-20
1.2|Fungsi|math-19,math-41
1.3|Koordinat|math-6,math-18
1.4|Ukuran sudut melingkar|math-26
1.5|Trigonometri|math-26
1.6|Deret|math-35,math-36,math-37
1.7|Diferensiasi|math-42
1.8|Integrasi|
2.1|Aljabar menengah|math-10,math-11,math-12,math-13
2.2|Logaritma dan eksponensial|math-15,math-16
2.3|Trigonometri menengah|math-26
2.4|Diferensiasi menengah|math-42
2.5|Integrasi menengah|
2.6|Pencarian akar numerik|
3.1|Aljabar lanjutan|math-10,math-11,math-12,math-13
3.2|Logaritma dan eksponensial lanjutan|math-15,math-16
3.3|Trigonometri lanjutan|math-26
3.4|Diferensiasi lanjutan|math-42
3.5|Integrasi lanjutan|
3.6|Akar numerik lanjutan|
3.7|Vektor|
3.8|Persamaan diferensial|
3.9|Bilangan kompleks|
4.1|Gaya dan kesetimbangan|
4.2|Kinematika satu dimensi|
4.3|Momentum|
4.4|Hukum Newton|
4.5|Energi usaha daya|
5.1|Representasi data|math-31,math-32
5.2|Susunan dan pemilihan|math-34
5.3|Peluang|math-33,math-34
5.4|Variabel acak diskret|
5.5|Distribusi normal|
6.1|Distribusi Poisson|
6.2|Kombinasi variabel acak|
6.3|Variabel acak kontinu|
6.4|Sampel dan estimasi|
6.5|Pengujian hipotesis|`,
'9694':`
1.1|Memahami penyajian informasi|pu-19
1.2|Menghubungkan informasi secara logis|pu-5,pu-6
2.1|Mengolah informasi|pu-20
2.2|Menelusuri solusi berbatasan|
2.3|Menarik deduksi|pu-7,pu-8,pu-9,pu-12
3.1|Mengubah representasi data|pu-19
3.2|Menjelaskan pola data|pu-13,pu-15
4.1|Menguji perubahan skenario|
4.2|Mengembangkan model|
5.1|Menilai mutu bukti|pu-11
5.2|Menggunakan bukti lintas sumber|pu-11,pu-12
6.1|Membedah struktur argumen|pu-12
7.1|Menguji kesalahan argumen|pu-10,pu-15
7.2|Menilai kelemahan argumen|pu-10,pu-14
8.1|Membangun argumen persuasif|`,
'9093':`
P1|Pembacaan analitis|lbe-4,lbe-9,lbe-10,lbe-20
P2|Produksi tulisan|
P3A|Perubahan bahasa|
P3B|Pemerolehan bahasa anak|
P4A|Bahasa Inggris di dunia|
P4B|Bahasa dan identitas|`
};
const rows=Object.entries(raw).flatMap(([syllabus,text])=>text.trim().split('\n').map(line=>{
 const [section,title,related]=line.split('|');
 const existing=related?related.split(','):[];
 for(const id of existing)if(!ids.has(id))throw Error(`Unknown topic ${id}`);
 return {syllabus,section,title,status:existing.length?'judul_umum_terkait':'belum_tercantum',existing_ids:existing,source:sources[syllabus]};
}));
if(new Set(rows.map(r=>r.syllabus+':'+r.section)).size!==rows.length)throw Error('Duplicate matrix sections');
if(rows.filter(r=>r.syllabus==='9709').length!==38)throw Error('Math section count mismatch');
if(rows.filter(r=>r.syllabus==='9694').length!==15)throw Error('Thinking section count mismatch');
const summary=Object.fromEntries(Object.keys(raw).map(s=>[s,{rows:rows.filter(r=>r.syllabus===s).length,broadRelated:rows.filter(r=>r.syllabus===s&&r.existing_ids.length).length,absent:rows.filter(r=>r.syllabus===s&&!r.existing_ids.length).length}]));
fs.writeFileSync(path.join(out,'cambridge-matrix.json'),JSON.stringify({method:'Editorial comparison of explicit list entries; broad related titles do not establish full coverage; alternative exam routes are not cumulative requirements.',summary,rows},null,2)+'\n');
const quote=v=>'"'+String(v).replaceAll('"','""')+'"';
fs.writeFileSync(path.join(out,'cambridge-matrix.csv'),'syllabus,section,title,status,existing_ids,source\n'+rows.map(r=>[r.syllabus,r.section,r.title,r.status,r.existing_ids.join(';'),r.source].map(quote).join(',')).join('\n')+'\n');
console.log(JSON.stringify(summary,null,2));
