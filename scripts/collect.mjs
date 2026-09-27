import {chromium} from 'playwright';
import {createTwitterBrowser} from 'twitter-api-safe-request';
import {mkdir,readFile,writeFile,rename,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {editionWindow,latestEdition,parsePage,selectPosts} from './core.mjs';
const configPath=new URL('../.local/config.json',import.meta.url);
let config;
try {
  config=JSON.parse(await readFile(configPath,'utf8'));
} catch (error) {
  if (error?.code === 'ENOENT') throw new Error('Missing .local/config.json; copy config.example.json and set listId');
  throw error;
}
if (!/^\d+$/.test(config.listId ?? '')) throw new Error('Invalid listId in .local/config.json');
const login=process.argv.includes('--login');
const date=process.argv.find(x=>/^\d{4}-\d{2}-\d{2}$/.test(x))??latestEdition();
const window=editionWindow(date);
if(!login && +new Date(window.end)>Date.now())throw new Error('The edition window has not ended');
const local=resolve('.local');await mkdir(local,{recursive:true,mode:0o700});
try{await mkdir(resolve(local,'collector.lock'));}catch{throw new Error('Collector already running; inspect .local/collector.lock before retrying');}
let context;
try{
  context=await chromium.launchPersistentContext(resolve(local,'x-profile'),{channel:'chrome',headless:!login,viewport:{width:1280,height:900}});
  const page=await context.newPage();const client=createTwitterBrowser(page);await client.inject();
  if(login){
    await page.goto('https://x.com/i/flow/login');
    console.log('Log in to X in the dedicated Chrome window. Waiting up to 10 minutes.');
    await page.waitForURL(u=>u.hostname==='x.com'&&u.pathname==='/home',{timeout:600000});
    await page.goto('https://x.com/i/lists/'+config.listId);
    console.log('X login saved locally.');
  }else{
    // Discover the current operation and feature parameters from X itself.
    const firstPromise=page.waitForResponse(r=>r.url().includes('/ListLatestTweetsTimeline')&&r.request().method()==='GET',{timeout:60000});
    await page.goto('https://x.com/i/lists/'+config.listId);
    const response=await firstPromise;
    if(!response.ok())throw new Error('X list request failed with HTTP '+response.status());
    await client.waitStartup();
    const requestUrl=new URL(response.url());
    const params=Object.fromEntries(requestUrl.searchParams);
    const variables=JSON.parse(params.variables);
    let body=await response.json(),all=[],skipped=0,pages=0,coverage='partial',reason='page-limit';
    const cursors=new Set();
    while(pages<config.maxPages){
      const parsed=parsePage(body);pages++;all.push(...parsed.tweets);skipped+=parsed.skipped;
      const oldest=parsed.tweets.reduce((v,t)=>t.createdAt<v?t.createdAt:v,'9999');
      if(oldest<window.start){coverage=skipped?'partial':'window-covered';reason=skipped?'unreadable-posts':'reached-start';break;}
      if(!parsed.cursor){coverage=skipped?'partial':'timeline-exhausted';reason=skipped?'unreadable-posts':'no-more-pages';break;}
      if(cursors.has(parsed.cursor)){reason='repeated-cursor';break;}
      cursors.add(parsed.cursor);
      params.variables=JSON.stringify({...variables,cursor:parsed.cursor});
      await new Promise(r=>setTimeout(r,1500));
      const next=await client.dispatch({headers:{'content-type':'application/json'},method:'GET',path:requestUrl.pathname.replace(/^\/i\/api/,''),params});
      // dispatch usually returns the parsed response; some clients wrap it in data.
      body=next?.data?.list?next:next?.data?.data?.list?next.data:next;
    }
    const posts=selectPosts(all,window);
    const payload={date,listId:config.listId,window,collectedAt:new Date().toISOString(),coverage,reason,pages,skipped,posts};
    await mkdir(resolve(local,'collections'),{recursive:true,mode:0o700});
    const target=resolve(local,'collections',date+'.json');
    await writeFile(target+'.tmp',JSON.stringify(payload,null,2)+'\n',{mode:0o600});await rename(target+'.tmp',target);
    console.log(JSON.stringify({date,posts:posts.length,coverage,reason,path:target}));
    if(coverage==='partial')process.exitCode=2;
  }
} finally {
  try {
    await context?.close();
  } finally {
    await rm(resolve(local,'collector.lock'),{recursive:true,force:true});
  }
}
