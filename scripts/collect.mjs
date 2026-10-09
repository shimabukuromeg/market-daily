import {chromium} from 'playwright';
import {mkdir,readFile,writeFile,rename,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {editionWindow,latestEdition,pageIsBeforeStart,parsePage,selectPosts} from './core.mjs';
import {persistCollection} from './storage.mjs';

const configPath=new URL('../.local/config.json',import.meta.url);
let config;
try {
  config=JSON.parse(await readFile(configPath,'utf8'));
} catch (error) {
  if (error?.code === 'ENOENT') throw new Error('Missing .local/config.json; copy config.example.json and set listId');
  throw error;
}
if (!/^\d+$/.test(config.listId ?? '')) throw new Error('Invalid listId in .local/config.json');
if (!config.cdpEndpoint) throw new Error('Missing cdpEndpoint in .local/config.json');

const date=process.argv.find(x=>/^\d{4}-\d{2}-\d{2}$/.test(x))??latestEdition();
const window=editionWindow(date);
const local=resolve('.local');
await mkdir(local,{recursive:true,mode:0o700});
try {
  await mkdir(resolve(local,'collector.lock'));
} catch {
  throw new Error('Collector already running; inspect .local/collector.lock before retrying');
}

try {
  const browser=await chromium.connectOverCDP(config.cdpEndpoint);
  const context=browser.contexts()[0];
  if(!context)throw new Error('No Chrome context found; run npm run browser first');
  const page=await context.newPage();

  // X supplies the current query ID, authentication headers, and feature
  // parameters. Pagination reuses the logged-in browser context directly.
  const firstPromise=page.waitForResponse(r=>r.url().includes('/ListLatestTweetsTimeline')&&r.request().method()==='GET',{timeout:60000});
  await page.goto('https://x.com/i/lists/'+config.listId);
  const response=await firstPromise;
  if(!response.ok())throw new Error('X list request failed with HTTP '+response.status());
  const requestUrl=new URL(response.url());
  const params=Object.fromEntries(requestUrl.searchParams);
  const variables=JSON.parse(params.variables);
  const sourceHeaders=response.request().headers();
  const forwardedHeaders=Object.fromEntries(
    ['authorization','x-csrf-token','x-twitter-active-user','x-twitter-auth-type','x-twitter-client-language']
      .filter(name=>sourceHeaders[name])
      .map(name=>[name,sourceHeaders[name]]),
  );
  const requestThroughBrowser=async currentParams=>{
    const apiUrl=new URL(requestUrl);
    for(const [key,value] of Object.entries(currentParams))apiUrl.searchParams.set(key,value);
    const apiResponse=await context.request.get(apiUrl.href,{headers:forwardedHeaders});
    if(!apiResponse.ok())throw new Error('X request failed with HTTP '+apiResponse.status());
    return apiResponse.json();
  };
  let body=await requestThroughBrowser(params),all=[],skipped=0,pages=0,coverage='partial',reason='page-limit';
  const cursors=new Set();

  while(pages<config.maxPages){
    const parsed=parsePage(body);
    pages++;
    all.push(...parsed.tweets);
    skipped+=parsed.skipped;
    // Pinned or injected old posts can appear beside current posts. A single
    // old post does not prove that the chronological cursor crossed the
    // requested boundary; stop only when the whole page is before it.
    if(pageIsBeforeStart(parsed.tweets,window.start)){
      coverage='window-covered';
      reason='reached-start';
      break;
    }
    if(!parsed.cursor){
      coverage='timeline-exhausted';
      reason='no-more-pages';
      break;
    }
    if(cursors.has(parsed.cursor)){
      reason='repeated-cursor';
      break;
    }
    cursors.add(parsed.cursor);
    params.variables=JSON.stringify({...variables,cursor:parsed.cursor});
    await new Promise(resolveDelay=>setTimeout(resolveDelay,1500));
    body=await requestThroughBrowser(params);
  }

  const posts=selectPosts(all,window);
  const payload={date,listId:config.listId,window,collectedAt:new Date().toISOString(),collectionMethod:'playwright-cdp',coverage,reason,pages,skipped,posts};
  await mkdir(resolve(local,'collections'),{recursive:true,mode:0o700});
  const target=resolve(local,'collections',date+'.json');
  await writeFile(target+'.tmp',JSON.stringify(payload,null,2)+'\n',{mode:0o600});
  await rename(target+'.tmp',target);
  const stored=await persistCollection(payload,{localDir:local});
  console.log(JSON.stringify({date,posts:posts.length,coverage,reason,pages,path:target,rawPath:stored.rawPath,dbPath:stored.dbPath}));
  if(coverage==='partial')process.exitCode=2;
} catch {
  // Playwright request errors can contain the full request headers, including
  // the logged-in X session cookie. Never print the original error or stack.
  console.error('Collection failed before completion. Check Chrome, X login, and network connectivity.');
  process.exitCode=1;
} finally {
  await rm(resolve(local,'collector.lock'),{recursive:true,force:true});
}

// Playwright keeps the CDP WebSocket alive. Ending this short-lived collector
// disconnects the client without closing the separately managed Chrome process.
process.exit(process.exitCode??0);
