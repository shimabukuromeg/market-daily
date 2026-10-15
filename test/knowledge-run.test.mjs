import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { stageBackfill } from '../scripts/knowledge.mjs';
import { recordSelection, savePreparation } from '../scripts/knowledge-run.mjs';

test('selection ledger requires article citation and accounts for due followups', async () => {
  const root = await mkdtemp(join(tmpdir(), 'market-knowledge-run-'));
  const issueDir = join(root, 'issues');
  const stageDir = join(root, 'staging');
  const runDir = join(root, 'runs');
  const collectionFile = join(root, 'collection.json');
  const articleFile = join(issueDir, '2026-10-15.md');
  const manifestFile = join(root, 'selection.json');
  await mkdir(issueDir);
  try {
    await writeFile(
      join(issueDir, '2026-10-14.md'),
      '## 監視：架空電機\n- **仮説**：増益する見立て。\n## 次回更新する項目\n1. **架空電機の10月15日決算**：利益を比較する。\n',
    );
    const { target: stageFile } = await stageBackfill(issueDir, stageDir);
    await writeFile(
      collectionFile,
      JSON.stringify({
        date: '2026-10-15',
        collectedAt: '2026-10-16T00:00:00Z',
        posts: [{ id: 'p1', text: '架空電機が発表' }],
      }),
    );
    await savePreparation({
      issueDir,
      stageFile,
      reviewFile: join(root, 'reviews.json'),
      collectionFile,
      runDir,
      date: '2026-10-15',
    });
    await writeFile(
      articleFile,
      '## 監視：架空電機\n[前回記事](/2026-10-14/)を参照した。\n',
    );
    const manifest = {
      date: '2026-10-15',
      read_prior_ids: ['candidate-2026-10-14-1'],
      used_prior: [
        {
          id: 'candidate-2026-10-14-1',
          article_section: '監視：架空電機',
          article_link: '/2026-10-14/',
          reason: '前回の仮説との比較',
        },
      ],
      selected_candidates: [
        {
          name: '架空電機',
          reason: '新しい発表',
          article_section: '監視：架空電機',
          source_post_ids: ['p1'],
        },
      ],
      deferred_candidates: [],
      due_actions: [],
      priority_actions: [],
      backlog_note: '過去の確認項目は日程確認待ち',
    };
    await writeFile(manifestFile, JSON.stringify(manifest));
    await assert.rejects(
      recordSelection({ date: '2026-10-15', runDir, articleFile, manifestFile, collectionFile }),
      /Every priority review followup needs an action/,
    );
    manifest.priority_actions = [{ id: 'followup-2026-10-14-1', status: 'deferred', note: '公式日程の照合待ち' }];
    await writeFile(manifestFile, JSON.stringify(manifest));
    const result = await recordSelection({
      date: '2026-10-15',
      runDir,
      articleFile,
      manifestFile,
      collectionFile,
    });
    assert.equal(result.used, 1);
    assert.equal(result.priority_handled, 1);
    const saved = JSON.parse(await readFile(result.path, 'utf8'));
    assert.deepEqual(saved.read_prior_ids, ['candidate-2026-10-14-1']);
    await writeFile(articleFile, '## 監視：架空電機\n前回を参照。\n');
    await assert.rejects(
      recordSelection({
        date: '2026-10-15',
        runDir,
        articleFile,
        manifestFile,
        collectionFile,
      }),
      /no matching citation/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
