import assert from 'node:assert/strict';
export function editionWindow(date) {
  assert(/^\d{4}-\d{2}-\d{2}$/.test(date), 'Use YYYY-MM-DD');
  const end = new Date(date+'T22:00:00+09:00');
  assert(Number.isFinite(+end) && end.toISOString().slice(0,10) === date, 'Invalid date');
  return {start:new Date(+end-86400000).toISOString(),end:end.toISOString()};
}
export function latestEdition(now=new Date()) {
  const jst=new Date(+now+9*3600000);
  if(jst.getUTCHours()<22) jst.setUTCDate(jst.getUTCDate()-1);
  return jst.toISOString().slice(0,10);
}
export function normalizeTweet(raw) {
  const t=raw?.tweet??raw;
  const user=t?.core?.user_results?.result;
  if(!t?.rest_id || !t?.legacy || !user || user.legacy?.protected || user.privacy?.protected) return null;
  const legacy=t.legacy;
  const handle=user.core?.screen_name??user.legacy?.screen_name;
  const text=t.note_tweet?.note_tweet_results?.result?.text??legacy.full_text;
  const createdAt=new Date(legacy.created_at);
  if(!handle || !text || !Number.isFinite(+createdAt)) return null;
  const original=legacy.retweeted_status_result?.result;
  return {id:t.rest_id,author:handle,name:user.core?.name??user.legacy?.name??handle,text,createdAt:createdAt.toISOString(),url:`https://x.com/${handle}/status/${t.rest_id}`,isRepost:!!original,quotedId:t.quoted_status_result?.result?.rest_id??null};
}
export function parsePage(body) {
  const root=body?.data?.list?.tweets_timeline?.timeline??body?.data?.list?.tweets_timeline;
  assert(!body?.errors?.length, 'X returned API errors; do not treat as an empty day');
  assert(Array.isArray(root?.instructions), 'Unrecognized list response; collector needs updating');
  const tweets=[];let cursor=null;let skipped=0;
  const visit=(node)=>{
    if(!node || typeof node!=='object')return;
    if(node.cursorType==='Bottom')cursor=node.value;
    if(node.tweet_results?.result){const t=normalizeTweet(node.tweet_results.result);if(t)tweets.push(t);else skipped++;return;}
    for(const v of Object.values(node))if(typeof v==='object')visit(v);
  };
  visit(root.instructions);
  return {tweets,cursor,skipped};
}
export function selectPosts(posts,window) {
  return [...new Map(posts.filter(p=>p.createdAt>=window.start&&p.createdAt<window.end).map(p=>[p.id,p])).values()].sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
}
