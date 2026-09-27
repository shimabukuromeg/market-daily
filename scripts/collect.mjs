import {chromium} from 'playwright';
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
if (!config.cdpEndpoint || !config.relayBaseUrl) throw new Error('Missing cdpEndpoint or relayBaseUrl in .local/config.json');

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
  const relayHealth=await fetch(new URL('/health',config.relayBaseUrl)).catch(()=>null);
  if(!relayHealth?.ok)throw new Error('Relay is not running; start npm run relay');

  const browser=await chromium.connectOverCDP(config.cdpEndpoint);
  const context=browser.contexts()[0];
  if(!context)throw new Error('No Chrome context found; run npm run browser first');
  const page=context.pages().find(p=>p.url().startsWith('https://x.com/'))??await context.newPage();

  // X supplies the current query ID and feature parameters. Pagination is sent
  // through twitter-api-safe-relay using the logged-in browser client.
  const firstPromise=page.waitForResponse(r=>r.url().includes('/ListLatestTweetsTimeline')&&r.request().method()==='GET',{timeout:60000});
  await page.goto('https://x.com/i/lists/'+config.listId);
  const response=await firstPromise;
  if(!response.ok())throw new Error('X list request failed with HTTP '+response.status());
  const requestUrl=new URL(response.url());
  const params=Object.fromEntries(requestUrl.searchParams);
  const variables=JSON.parse(params.variables);
  const requestThroughRelay=async currentParams=>{
    const relayUrl=new URL(requestUrl.pathname,config.relayBaseUrl);
    for(const [key,value] of Object.entries(currentParams))relayUrl.searchParams.set(key,value);
    const relayResponse=await fetch(relayUrl,{headers:{'x-profile-name':'market-daily'}});
    if(!relayResponse.ok)throw new Error('Relay request failed with HTTP '+relayResponse.status());
    const result=await relayResponse.json();
    return result?.data?.list?result:result?.data?.data?.list?result.data:result;
  };
  let body=await requestThroughRelay(params),all=[],skipped=0,pages=0,coverage='partial',reason='page-limit';
  const cursors=new Set();

  while(pages<config.maxPages){
    const parsed=parsePage(body);
    pages++;
    all.push(...parsed.tweets);
    skipped+=parsed.skipped;
    const oldest=parsed.tweets.reduce((value,tweet)=>tweet.createdAt<value?tweet.createdAt:value,'9999');
    if(oldest<window.start){
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
    body=await requestThroughRelay(params);
  }

  const posts=selectPosts(all,window);
  const payload={date,listId:config.listId,window,collectedAt:new Date().toISOString(),collectionMethod:'twitter-api-safe-relay/cdp',coverage,reason,pages,skipped,posts};
  await mkdir(resolve(local,'collections'),{recursive:true,mode:0o700});
  const target=resolve(local,'collections',date+'.json');
  await writeFile(target+'.tmp',JSON.stringify(payload,null,2)+'\n',{mode:0o600});
  await rename(target+'.tmp',target);
  console.log(JSON.stringify({date,posts:posts.length,coverage,reason,pages,path:target}));
  if(coverage==='partial')process.exitCode=2;
} finally {
  await rm(resolve(local,'collector.lock'),{recursive:true,force:true});
}

// Playwright keeps the CDP WebSocket alive. Ending this short-lived collector
// disconnects the client without closing the separately managed Chrome process.
process.exit(process.exitCode??0);
