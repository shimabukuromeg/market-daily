import {test} from 'node:test';
import assert from 'node:assert/strict';
import {editionWindow,latestEdition,parsePage,normalizeTweet,selectPosts} from '../scripts/core.mjs';
test('JST cutoff and year boundary',()=>{
 assert.equal(latestEdition(new Date('2026-01-01T12:59:59Z')),'2025-12-31');
 assert.equal(latestEdition(new Date('2026-01-01T13:00:00Z')),'2026-01-01');
 assert.deepEqual(editionWindow('2026-01-01'),{start:'2025-12-31T13:00:00.000Z',end:'2026-01-01T13:00:00.000Z'});
 assert.throws(()=>editionWindow('2026-02-30'));
});
test('window is start-inclusive, end-exclusive; IDs deduplicate',()=>{
 const w=editionWindow('2026-01-01');
 assert.equal(selectPosts([{id:'1',createdAt:w.start},{id:'1',createdAt:w.start},{id:'2',createdAt:w.end}],w).length,1);
});
test('API errors and changed response fail closed',()=>{assert.throws(()=>parsePage({errors:[{}]}));assert.throws(()=>parsePage({data:{}}));});
const tweet={rest_id:'123',core:{user_results:{result:{legacy:{screen_name:'example',name:'Example'}}}},legacy:{full_text:'hello',created_at:'2026-01-01T12:00:00Z'}};
test('protected users excluded and note text preferred',()=>{
 assert.equal(normalizeTweet({...tweet,core:{user_results:{result:{legacy:{protected:true}}}}}),null);
 assert.equal(normalizeTweet({...tweet,note_tweet:{note_tweet_results:{result:{text:'long'}}}}).text,'long');
});
test('parse nested timeline items and cursor without quoted tweet duplication',()=>{
 const page=parsePage({data:{list:{tweets_timeline:{timeline:{instructions:[{entries:[{content:{itemContent:{tweet_results:{result:tweet}}}},{content:{cursorType:'Bottom',value:'next'}}]}]}}}}});
 assert.equal(page.tweets.length,1);assert.equal(page.cursor,'next');
});
