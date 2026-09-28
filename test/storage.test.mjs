import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import test from 'node:test';
import { DuckDBInstance } from '@duckdb/node-api';
import { persistCollection } from '../scripts/storage.mjs';

const gunzipAsync = promisify(gunzip);

test('persists immutable raw data and idempotent normalized rows', async () => {
  const localDir = await mkdtemp(join(tmpdir(), 'market-daily-'));
  const payload = {
    date: '2026-09-27',
    listId: 'private-list-id',
    window: {
      start: '2026-09-26T15:00:00.000Z',
      end: '2026-09-27T15:00:00.000Z',
      partial: false,
    },
    collectedAt: '2026-09-28T00:00:00.000Z',
    collectionMethod: 'test',
    coverage: 'window-covered',
    reason: 'reached-start',
    pages: 2,
    skipped: 0,
    posts: [
      {
        id: '1',
        author: 'investor',
        name: 'Investor',
        text: 'sample',
        createdAt: '2026-09-27T01:00:00.000Z',
        url: 'https://x.com/investor/status/1',
        isRepost: false,
        quotedId: null,
      },
    ],
  };
  try {
    const first = await persistCollection(payload, { localDir });
    const second = await persistCollection(payload, { localDir });
    assert.equal(first.runId, second.runId);
    assert.deepEqual(
      JSON.parse((await gunzipAsync(await readFile(first.rawPath))).toString()),
      payload,
    );

    const instance = await DuckDBInstance.create(first.dbPath);
    const connection = await instance.connect();
    const result = await connection.runAndReadAll(`select
      (select count(*) from collection_runs) runs,
      (select count(*) from posts) posts,
      (select count(*) from run_posts) links,
      (select list_fingerprint from collection_runs) list_fingerprint`);
    const [row] = result.getRowObjectsJson();
    connection.closeSync();
    assert.deepEqual(
      { runs: row.runs, posts: row.posts, links: row.links },
      { runs: '1', posts: '1', links: '1' },
    );
    assert.notEqual(row.list_fingerprint, payload.listId);
  } finally {
    await rm(localDir, { recursive: true, force: true });
  }
});
