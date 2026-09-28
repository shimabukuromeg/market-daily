import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { persistCollection } from './storage.mjs';

const collections = resolve('.local', 'collections');
const files = (
  await readdir(collections).catch((error) =>
    error?.code === 'ENOENT' ? [] : Promise.reject(error),
  )
)
  .filter((file) => file.endsWith('.json'))
  .sort();
for (const file of files) {
  const payload = JSON.parse(
    await readFile(resolve(collections, file), 'utf8'),
  );
  const stored = await persistCollection(payload);
  console.log(
    JSON.stringify({
      date: payload.date,
      posts: payload.posts.length,
      runId: stored.runId,
    }),
  );
}
console.log(JSON.stringify({ imported: files.length }));
