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
  if (meta.date >= '2026-10-16') {
    const quizzes = [...m[2].matchAll(/^```quiz\n([\s\S]*?)\n```/gm)];
    assert.equal(quizzes.length, 1, `${file}: one quiz block required`);
    assert(
      /## 理解度チェック\n[\s\S]*?```quiz\n/.test(m[2]),
      `${file}: quiz section required`,
    );
    const lines = quizzes[0][1].trim().split('\n');
    assert(
      lines.length >= 2 && lines.length <= 3,
      `${file}: quiz needs 2–3 questions`,
    );
    for (const [index, line] of lines.entries()) {
      const fields = line.split(' | ').map((value) => value.trim());
      assert(
        fields.length === 6 && fields.every(Boolean),
        `${file}: quiz row ${index + 1} needs question, three options, answer letter, and reason`,
      );
      assert(['A','B','C'].includes(fields[4]), `${file}: quiz row ${index + 1} has invalid answer`);
      assert(new Set(fields.slice(1,4)).size === 3, `${file}: quiz row ${index + 1} repeats an option`);
    }
  }
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
 for(const k of ['date','title','summary','question','answer','source','sourceLabel'])assert(typeof meta[k]==='string'&&meta[k].trim(),`Missing ${k}: ${file}`);
 assert(/^\d{4}-\d{2}-\d{2}$/.test(meta.date),`Invalid date: ${file}`);
 assert(meta.source==='screenshot'||/^https:\/\/x\.com\/[A-Za-z0-9_]+\/status\/\d+$/.test(meta.source),`Invalid source: ${file}`);
 assert(!/<\/?(?:script|iframe|style)\b/i.test(m[2]),`HTML is not allowed: ${file}`);
 assert(!/```x-posts\b/.test(m[2]),`Deep dives use a compact source note: ${file}`);
 explains.push({...meta,slug:file.slice(0,-3),markdown:m[2]});
}
await writeFile(new URL('../src/generated/explains.json',import.meta.url),JSON.stringify(explains,null,2)+'\n');
console.log(`Validated ${explains.length} explainers`);
