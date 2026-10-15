import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  exportKnowledge,
  restoreKnowledgeBackup,
  verifyKnowledgeBackup,
} from '../scripts/knowledge-backup.mjs';

test('private knowledge backup detects changes and restores into an empty location', async () => {
  const root = await mkdtemp(join(tmpdir(), 'knowledge-backup-test-'));
  const source = join(root, 'knowledge');
  const backup = join(root, 'backup');
  const restored = join(root, 'restored');
  try {
    await mkdir(join(source, 'staging'), { recursive: true });
    await writeFile(join(source, 'CURRENT'), 'revision\n');
    await writeFile(join(source, 'staging', 'backfill.json'), '{}\n');
    const result = await exportKnowledge(source, backup);
    assert.equal(result.file_count, 2);
    assert.equal((await verifyKnowledgeBackup(backup)).verified, true);
    await restoreKnowledgeBackup(backup, restored);
    assert.equal(
      await readFile(join(restored, 'CURRENT'), 'utf8'),
      'revision\n',
    );
    await writeFile(join(backup, 'CURRENT'), 'changed\n');
    await assert.rejects(verifyKnowledgeBackup(backup), /checksum mismatch/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
