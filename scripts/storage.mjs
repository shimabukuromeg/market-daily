import { DuckDBInstance } from '@duckdb/node-api';
import { createHash } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';

const gzipAsync = promisify(gzip);
const schema = `
create table if not exists collection_runs (
  run_id varchar primary key, edition_date date not null, list_fingerprint varchar not null,
  window_start timestamptz not null, window_end timestamptz not null, partial boolean not null,
  collected_at timestamptz not null, collection_method varchar not null, coverage varchar not null,
  reason varchar not null, pages integer not null, skipped integer not null,
  post_count integer not null, raw_path varchar not null
);
create table if not exists posts (
  post_id varchar primary key, author_handle varchar not null, author_name varchar,
  text varchar not null, created_at timestamptz not null, url varchar not null,
  is_repost boolean not null, quoted_post_id varchar,
  first_seen_at timestamptz not null, last_seen_at timestamptz not null
);
create table if not exists run_posts (
  run_id varchar not null references collection_runs(run_id),
  post_id varchar not null references posts(post_id),
  primary key (run_id,post_id)
);
`;
const digest = (value) => createHash('sha256').update(value).digest('hex');

export async function persistCollection(
  payload,
  { localDir = resolve('.local') } = {},
) {
  const runId = digest(
    [payload.date, payload.collectedAt, payload.collectionMethod].join('\0'),
  );
  const [year, month, day] = payload.date.split('-');
  const rawDir = resolve(localDir, 'raw', year, month, day);
  const stamp = payload.collectedAt.replace(/[-:.]/g, '');
  const rawPath = resolve(rawDir, `${stamp}-${runId.slice(0, 12)}.json.gz`);
  await mkdir(rawDir, { recursive: true, mode: 0o700 });
  await writeFile(
    rawPath + '.tmp',
    await gzipAsync(JSON.stringify(payload) + '\n'),
    { mode: 0o600 },
  );
  await rename(rawPath + '.tmp', rawPath);

  const dbPath = resolve(localDir, 'market-daily.duckdb');
  const instance = await DuckDBInstance.create(dbPath);
  const connection = await instance.connect();
  try {
    await connection.run(schema);
    await connection.run('begin transaction');
    await connection.run(
      `insert into collection_runs values (
      $run_id,cast($edition_date as date),$list_fingerprint,
      cast($window_start as timestamptz),cast($window_end as timestamptz),$partial,
      cast($collected_at as timestamptz),$collection_method,$coverage,$reason,
      $pages,$skipped,$post_count,$raw_path
    ) on conflict (run_id) do update set
      coverage=excluded.coverage,reason=excluded.reason,pages=excluded.pages,
      skipped=excluded.skipped,post_count=excluded.post_count,raw_path=excluded.raw_path`,
      {
        run_id: runId,
        edition_date: payload.date,
        list_fingerprint: digest(payload.listId),
        window_start: payload.window.start,
        window_end: payload.window.end,
        partial: payload.window.partial,
        collected_at: payload.collectedAt,
        collection_method: payload.collectionMethod,
        coverage: payload.coverage,
        reason: payload.reason,
        pages: payload.pages,
        skipped: payload.skipped,
        post_count: payload.posts.length,
        raw_path: relative(localDir, rawPath),
      },
    );
    for (const post of payload.posts) {
      await connection.run(
        `insert into posts values (
        $post_id,$author_handle,$author_name,$text,cast($created_at as timestamptz),
        $url,$is_repost,$quoted_post_id,cast($seen_at as timestamptz),cast($seen_at as timestamptz)
      ) on conflict (post_id) do update set
        author_handle=excluded.author_handle,author_name=excluded.author_name,text=excluded.text,
        created_at=excluded.created_at,url=excluded.url,is_repost=excluded.is_repost,
        quoted_post_id=excluded.quoted_post_id,last_seen_at=excluded.last_seen_at`,
        {
          post_id: post.id,
          author_handle: post.author,
          author_name: post.name ?? null,
          text: post.text,
          created_at: post.createdAt,
          url: post.url,
          is_repost: post.isRepost,
          quoted_post_id: post.quotedId ?? null,
          seen_at: payload.collectedAt,
        },
      );
      await connection.run(
        `insert into run_posts values ($run_id,$post_id)
        on conflict (run_id,post_id) do nothing`,
        { run_id: runId, post_id: post.id },
      );
    }
    await connection.run('commit');
  } catch (error) {
    await connection.run('rollback').catch(() => {});
    throw error;
  } finally {
    connection.closeSync();
  }
  return { runId, dbPath, rawPath };
}
