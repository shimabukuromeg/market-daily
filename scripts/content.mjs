import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {parse} from 'yaml';
import assert from 'node:assert/strict';
const folder=new URL('../content/issues/',import.meta.url);
const issues=[];
for(const file of (await readdir(folder)).filter(f=>f.endsWith('.md')).sort().reverse()){
 const raw=await readFile(new URL(file,folder),'utf8');
 const m=raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
 assert(m,`Missing frontmatter: ${file}`);
 const meta=parse(m[1]);
 assert(meta.date===file.slice(0,-3),`Date mismatch: ${file}`);
 for(const k of ['date','title','summary','coverage'])assert(typeof meta[k]==='string'&&meta[k].trim(),`Missing ${k}: ${file}`);
 assert(Number.isInteger(meta.posts)&&meta.posts>=0,'Invalid post count');
 assert(!/<\/?(?:script|iframe|style)\b/i.test(m[2]),'HTML is not allowed');
 assert(m[2].includes('## 今日の要点') || m[2].includes('## 今日の判定'),'Missing editorial structure');
 assert(meta.posts===0||/https:\/\/x\.com\/[A-Za-z0-9_]+\/status\/\d+/.test(m[2]),'Missing source links');
 if(process.argv.includes('--sources') && meta.date === (process.argv.find(v=>/^\d{4}-\d{2}-\d{2}$/.test(v)) ?? (await readdir(folder)).filter(f=>f.endsWith('.md')).sort().at(-1)?.slice(0,-3))){
  const source=JSON.parse(await readFile(new URL('../.local/collections/'+meta.date+'.json',import.meta.url)));
  const allowed=new Set(source.posts.map(p=>p.url));
  for(const link of m[2].matchAll(/https:\/\/x\.com\/[A-Za-z0-9_]+\/status\/\d+/g))assert(allowed.has(link[0]),'Unknown source: '+link[0]);
  assert(source.posts.length===meta.posts,'Post count mismatch');
 }
 issues.push({...meta,markdown:m[2]});
}
await mkdir(new URL('../src/generated/',import.meta.url),{recursive:true});
await writeFile(new URL('../src/generated/issues.json',import.meta.url),JSON.stringify(issues,null,2)+'\n');
console.log(`Validated ${issues.length} editions`);
const explainFolder=new URL('../content/explains/',import.meta.url);
const explains=[];
for(const file of (await readdir(explainFolder)).filter(f=>f.endsWith('.md')).sort().reverse()){
 const raw=await readFile(new URL(file,explainFolder),'utf8');
 const m=raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
 assert(m,`Missing frontmatter: ${file}`);
 const meta=parse(m[1]);
 for(const k of ['date','title','summary','source'])assert(typeof meta[k]==='string'&&meta[k].trim(),`Missing ${k}: ${file}`);
 assert(/^\d{4}-\d{2}-\d{2}$/.test(meta.date),`Invalid date: ${file}`);
 assert(/^https:\/\/x\.com\/[A-Za-z0-9_]+\/status\/\d+$/.test(meta.source),`Invalid source: ${file}`);
 assert(!/<\/?(?:script|iframe|style)\b/i.test(m[2]),`HTML is not allowed: ${file}`);
 assert(m[2].includes(meta.source),`Missing source link: ${file}`);
 explains.push({...meta,slug:file.slice(0,-3),markdown:m[2]});
}
await writeFile(new URL('../src/generated/explains.json',import.meta.url),JSON.stringify(explains,null,2)+'\n');
console.log(`Validated ${explains.length} explainers`);
