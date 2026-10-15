import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  prepareKnowledge,
  recordFollowupAttempt,
  reviewFollowup,
  stageBackfill,
} from '../scripts/knowledge.mjs';
import { buildWiki } from '../scripts/knowledge-wiki.mjs';

const issue = `---
date: '2026-10-14'
---
## 監視：架空電機
- **仮説**：利益率が改善する可能性。これは見立て。
## 次回更新する項目
1. **架空電機の次回決算（未公表）**：[前回決算](https://example.com/ir.pdf)と利益率を比べる。
`;

test('stages every prior followup without inventing dates or results', async () => {
  const root = await mkdtemp(join(tmpdir(), 'market-knowledge-'));
  const issueDir = join(root, 'issues');
  const explainerDir = join(root, 'explains');
  const stageDir = join(root, 'staging');
  const reviewFile = join(root, 'reviews.json');
  const collectionFile = join(root, 'collection.json');
  await mkdir(issueDir);
  await mkdir(explainerDir);
  try {
    await writeFile(join(issueDir, '2026-10-14.md'), issue);
    await writeFile(
      join(explainerDir, '2026-10-13-company.md'),
      '---\ndate: 2026-10-13\ntitle: 架空電機の利益率をどう見るか\nquestion: 利益率は改善する？\nanswer: 次の決算で確認する。\n---\n\n本文\n',
    );
    await writeFile(
      collectionFile,
      JSON.stringify({
        date: '2026-10-15',
        posts: [{ id: 'p1', text: '架空電機の決算を確認' }],
      }),
    );
    const result = await stageBackfill(issueDir, stageDir);
    const wiki = await buildWiki({
      stageFile: result.target,
      reviewFile,
      knowledgeDir: join(root, 'knowledge'),
    });
    assert.match(await readFile(wiki.index, 'utf8'), /架空電機/);
    assert.equal(result.followupCount, 1);
    assert.equal(result.explainerCount, 1);
    const staged = JSON.parse(await readFile(result.target, 'utf8'));
    assert.equal(staged.issues[0].followups[0].next_check_at, null);
    assert.equal(staged.issues[0].followups[0].status, 'needs_review');
    const context = await prepareKnowledge({
      issueDir,
      stageFile: result.target,
      reviewFile,
      collectionFile,
      date: '2026-10-15',
      query: '架空電機',
    });
    assert.equal(context.counts.review_queue, 1);
    assert.equal(context.counts.related_candidates, 1);
    assert.equal(context.counts.related_explainers, 1);
    assert.equal(context.related_candidates[0].matched_post_count, 1);
    assert.deepEqual(context.review_queue[0].source_urls, [
      'https://example.com/ir.pdf',
    ]);
    const previousDay = await prepareKnowledge({
      issueDir,
      stageFile: result.target,
      reviewFile,
      date: '2026-10-14',
    });
    assert.equal(previousDay.counts.review_queue, 0);
    await reviewFollowup({
      stageFile: result.target,
      reviewFile,
      id: 'followup-2026-10-14-1',
      nextCheckAt: '2026-10-16T07:00:00+09:00',
      basis: '対象期間の翌日に確認する内部予定',
    });
    const upcoming = await prepareKnowledge({
      issueDir,
      stageFile: result.target,
      reviewFile,
      date: '2026-10-15',
    });
    assert.equal(upcoming.counts.upcoming, 1);
    assert.equal(upcoming.counts.review_queue, 0);
    const due = await prepareKnowledge({
      issueDir,
      stageFile: result.target,
      reviewFile,
      date: '2026-10-16',
    });
    assert.equal(due.counts.due, 1);
    assert.equal(due.due[0].status, 'pending');
    const unavailable = {
      outcome: 'unavailable',
      checked_at: '2026-10-16T07:00:00+09:00',
      target_period: '2026年度第3四半期',
      note: '公式資料が未公開',
      next_check_at: '2026-10-17T07:00:00+09:00',
    };
    const first = await recordFollowupAttempt({
      stageFile: result.target,
      reviewFile,
      id: 'followup-2026-10-14-1',
      attempt: unavailable,
    });
    assert.equal(first.status, 'blocked');
    const again = await recordFollowupAttempt({
      stageFile: result.target,
      reviewFile,
      id: 'followup-2026-10-14-1',
      attempt: unavailable,
    });
    assert.equal(again.duplicate, true);
    const retry = await prepareKnowledge({
      issueDir,
      stageFile: result.target,
      reviewFile,
      date: '2026-10-17',
    });
    assert.equal(retry.counts.due, 1);
    assert.equal(retry.due[0].attempts.length, 1);
    await assert.rejects(
      recordFollowupAttempt({
        stageFile: result.target,
        reviewFile,
        id: 'followup-2026-10-14-1',
        attempt: {
          outcome: 'supported',
          checked_at: '2026-10-17T07:00:00+09:00',
          target_period: '2026年度第3四半期',
          note: '仮説と整合',
        },
      }),
      /source_url and comparison/,
    );
    const completed = await recordFollowupAttempt({
      stageFile: result.target,
      reviewFile,
      id: 'followup-2026-10-14-1',
      attempt: {
        outcome: 'supported',
        checked_at: '2026-10-17T07:00:00+09:00',
        target_period: '2026年度第3四半期',
        note: '仮説と整合',
        source_url: 'https://example.com/new-ir.pdf',
        comparison: '利益率5%から6%へ改善',
      },
    });
    assert.equal(completed.status, 'resolved');
    const resolved = await prepareKnowledge({
      issueDir,
      stageFile: result.target,
      reviewFile,
      date: '2026-10-18',
    });
    assert.equal(resolved.counts.due, 0);
    assert.equal(resolved.counts.resolved, 1);
    await assert.rejects(
      reviewFollowup({
        stageFile: result.target,
        reviewFile,
        id: 'followup-2026-10-14-1',
        nextCheckAt: '2026-10-19T07:00:00+09:00',
        basis: '次の期を確認',
      }),
      /Resolved followups cannot be rescheduled/,
    );
    await writeFile(join(issueDir, '2026-10-14.md'), `${issue}\nchanged`);
    await assert.rejects(
      prepareKnowledge({
        issueDir,
        stageFile: result.target,
        reviewFile,
        date: '2026-10-15',
      }),
      /Backfill is stale/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
