import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath,pathToFileURL} from 'node:url';

const out=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(out,'../../..');
const context={}; vm.createContext(context);
for(const [file,name] of [['data.js','curriculum'],['tracker-data.js','trackerData']]) {
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8')+`\nthis.${name}Value=${name};`,context);
}
const modern=fs.readFileSync(path.join(root,'index.html'),'utf8').includes('/study/app.mjs');
const active=modern?await import(pathToFileURL(path.join(root,'study/catalog.mjs')).href):{curriculum:context.curriculumValue,trackerData:context.trackerDataValue};
const curriculum=active.curriculum, tracker=active.trackerData;
const sessions=curriculum.weeks.flatMap(w=>w.sessions.map(s=>({...s,week:w.number})));
const summary={
  auditedDate:'2026-10-21', activeEntry:modern?'index.html > study/app.mjs > study/academic-ui.mjs > study/catalog.mjs':'index.html: classic data.js + tracker-data.js',
  equivalentToLegacyCatalog:JSON.stringify(curriculum)===JSON.stringify(context.curriculumValue)&&JSON.stringify(tracker)===JSON.stringify(context.trackerDataValue),
  weeks:curriculum.weeks.length,sessions:sessions.length,topics:tracker.topics.length,
  stages:tracker.topics.length*3,sharedTopics:tracker.topics.filter(t=>t.subjects.length>1).length,
  subjects:tracker.subjects.map(s=>({...s,topics:tracker.topics.filter(t=>t.subjects.includes(s.code)).length})),
  sessionsWithLinks:sessions.filter(s=>s.links.length).length,
  sessionsWithoutLinks:sessions.filter(s=>!s.links.length).length,
  genericPracticeSessions:sessions.filter(s=>s.topics.every(t=>/^Latihan Soal$/i.test(t))).length,
  uniqueUrls:new Set([...sessions.flatMap(s=>s.links),...curriculum.literacy.flatMap(g=>g.links)]).size,
  sourceYear:tracker.sourceYear,
  topicFields:[...new Set(tracker.topics.flatMap(t=>Object.keys(t)))],
};
fs.writeFileSync(path.join(out,'catalog-audit.json'),JSON.stringify({summary,topics:tracker.topics,sessions,literacy:curriculum.literacy},null,2)+'\n');
const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';
fs.writeFileSync(path.join(out,'existing-topics.csv'),'id,subjects,group,title\n'+tracker.topics.map(t=>[t.id,t.subjects.join('/'),t.group,t.title].map(quote).join(',')).join('\n')+'\n');
const indexPath='D:/rclone/research/ruang-belajar-2026-10-21/index.json';
if(fs.existsSync(indexPath)) {
  const index=JSON.parse(fs.readFileSync(indexPath,'utf8').replace(/^\uFEFF/,''));
  const files=index.filter(f=>!f.IsDir), pdfs=files.filter(f=>/\.pdf$/i.test(f.Name));
  const roots={}; for(const f of files){const key=f.Path.split('/')[0]; roots[key]=(roots[key]||0)+1;}
  const hashes=new Map(); for(const f of files){const h=f.Hashes?.md5;if(h)hashes.set(h,(hashes.get(h)||0)+1);}
  const drive={folderId:'1ZSaGixqJ28Q9J9gb0CDdS5ypq6YeEtIp',entries:index.length,folders:index.length-files.length,files:files.length,pdfs:pdfs.length,bytes:files.reduce((n,f)=>n+Math.max(0,f.Size),0),roots,cambridgeNamed:index.filter(f=>/cambridge|9694|9709|9093|a.level|as.level/i.test(f.Path)).map(f=>f.Path),duplicateHashGroups:[...hashes.values()].filter(n=>n>1).length,dangling:index.filter(f=>/dangling/.test(f.MimeType)).length};
  fs.writeFileSync(path.join(out,'drive-summary.json'),JSON.stringify(drive,null,2)+'\n');
  fs.writeFileSync(path.join(out,'drive-index.csv'),'path,is_directory,size,drive_id,md5\n'+index.map(f=>[f.Path,f.IsDir,f.Size,f.ID,f.Hashes?.md5||''].map(quote).join(',')).join('\n')+'\n');
  console.log(JSON.stringify({summary,drive},null,2));
} else console.log(JSON.stringify(summary,null,2));
