import {copyFile,mkdir,readFile} from 'node:fs/promises';
await mkdir(new URL('../study/lib/',import.meta.url),{recursive:true});
for(const [source,target] of [['marked/lib/marked.esm.js','marked.mjs'],['dompurify/dist/purify.es.mjs','purify.mjs'],['marked/LICENSE','marked-LICENSE.md'],['dompurify/LICENSE','purify-LICENSE.txt']]) {
const from=new URL('../node_modules/'+source,import.meta.url),to=new URL('../study/lib/'+target,import.meta.url);
if(process.argv.includes('--check')) {if(!(await readFile(from)).equals(await readFile(to)))throw Error('Vendor drift: '+target);}
else await copyFile(from,to);
}
