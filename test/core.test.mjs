import {test} from 'node:test';
import assert from 'node:assert/strict';
import {editionWindow,latestEdition,parsePage,normalizeTweet,selectPosts} from '../scripts/core.mjs';
test('JST calendar day and year boundary',()=>{
 assert.equal(latestEdition(new Date('2025-12-31T14:59:59Z')),'2025-12-31');
 assert.equal(latestEdition(new Date('2025-12-31T15:00:00Z')),'2026-01-01');
 assert.deepEqual(editionWindow('2026-01-01',new Date('2026-01-03T00:00:00Z')),{start:'2025-12-31T15:00:00.000Z',end:'2026-01-01T15:00:00.000Z',partial:false});
 assert.throws(()=>editionWindow('2026-02-30',new Date('2026-03-01T00:00:00Z')));
 assert.throws(()=>editionWindow('2026-01-04',new Date('2026-01-03T00:00:00Z')));
});
test('today ends at execution time',()=>{
 assert.deepEqual(editionWindow('2026-01-01',new Date('2026-01-01T03:34:56Z')),{start:'2025-12-31T15:00:00.000Z',end:'2026-01-01T03:34:56.000Z',partial:true});
});
test('window is start-inclusive, end-exclusive; IDs deduplicate',()=>{
 const w=editionWindow('2026-01-01',new Date('2026-01-03T00:00:00Z'));
 assert.equal(selectPosts([{id:'1',createdAt:w.start},{id:'1',createdAt:w.start},{id:'2',createdAt:w.end}],w).length,1);
});
test('API errors and changed response fail closed',()=>{assert.throws(()=>parsePage({errors:[{}]}));assert.throws(()=>parsePage({data:{}}));});
const tweet={rest_id:'123',core:{user_results:{result:{legacy:{screen_name:'example',name:'Example'}}}},legacy:{full_text:'hello',created_at:'2026-01-01T12:00:00Z'}};
test('protected users excluded and note text preferred',()=>{
 assert.equal(normalizeTweet({...tweet,core:{user_results:{result:{legacy:{protected:true}}}}}),null);
 assert.equal(normalizeTweet({...tweet,note_tweet:{note_tweet_results:{result:{text:'long'}}}}).text,'long');
 assert.equal(normalizeTweet({__typename:'TweetWithVisibilityResults',tweet}).id,'123');
});
test('parse nested timeline items and cursor without quoted tweet duplication',()=>{
 const page=parsePage({data:{list:{tweets_timeline:{timeline:{instructions:[{entries:[{content:{itemContent:{tweet_results:{result:tweet}}}},{content:{cursorType:'Bottom',value:'next'}}]}]}}}}});
 assert.equal(page.tweets.length,1);assert.equal(page.cursor,'next');
});
