import {readFile,writeFile} from 'node:fs/promises';
const path=new URL('../dist/client/index.html',import.meta.url);
let html=await readFile(path,'utf8');
// This publication is read-only: ship server-rendered HTML and CSS without hydration.
html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*(?:rel="modulepreload"|as="script")[^>]*>/gi,'');
const base=process.env.PAGES_BASE_PATH??'';
if(base)html=html.replace(/(href|src)="\/(?!\/)/g,(_,a)=>`${a}="${base}/`);
await writeFile(path,html);
console.log('Static publication ready');
