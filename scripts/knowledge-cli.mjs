import { resolve } from 'node:path';
import { access, readFile } from 'node:fs/promises';
import {
  prepareKnowledge,
  recordFollowupAttempt,
  reviewFollowup,
  stageBackfill,
} from './knowledge.mjs';
import { buildWiki } from './knowledge-wiki.mjs';
import { recordSelection, savePreparation } from './knowledge-run.mjs';
import {
  exportKnowledge,
  restoreKnowledgeBackup,
  verifyKnowledgeBackup,
} from './knowledge-backup.mjs';

const [command, ...args] = process.argv.slice(2);
const issueDir = resolve('content/issues');
const stageDir = resolve('.local/knowledge/staging');
const knowledgeDir = resolve('.local/knowledge');
const stageFile = resolve(stageDir, 'backfill.json');
const reviewFile = resolve('.local/knowledge/reviews.json');
const runDir = resolve('.local/knowledge/runs');
if (command === 'backfill') {
  const result = await stageBackfill(issueDir, stageDir);
  console.log(
    JSON.stringify(
      {
        ...result,
        wiki: await buildWiki({ stageFile, reviewFile, knowledgeDir }),
      },
      null,
      2,
    ),
  );
} else if (command === 'prepare') {
  const [date, query = ''] = args;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? ''))
    throw new Error('Usage: npm run knowledge:prepare -- YYYY-MM-DD [keyword]');
  const collectionFile = resolve('.local/collections', `${date}.json`);
  const collectionPresent = await access(collectionFile).then(
    () => true,
    () => false,
  );
  console.log(
    JSON.stringify(
      {
        ...(await prepareKnowledge({
          issueDir,
          stageFile,
          reviewFile,
          collectionFile: collectionPresent ? collectionFile : undefined,
          date,
          query,
        })),
        collection_present: collectionPresent,
      },
      null,
      2,
    ),
  );
} else if (command === 'prepare-run') {
  const [date] = args;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? ''))
    throw new Error('Usage: npm run knowledge:prepare-run -- YYYY-MM-DD');
  console.log(
    JSON.stringify(
      await savePreparation({
        issueDir,
        stageFile,
        reviewFile,
        collectionFile: resolve('.local/collections', `${date}.json`),
        runDir,
        date,
      }),
      null,
      2,
    ),
  );
} else if (command === 'selection') {
  const [date, manifestFile] = args;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || !manifestFile)
    throw new Error(
      'Usage: npm run knowledge:selection -- YYYY-MM-DD manifest.json',
    );
  console.log(
    JSON.stringify(
      await recordSelection({
        date,
        runDir,
        articleFile: resolve('content/issues', `${date}.md`),
        manifestFile: resolve(manifestFile),
        collectionFile: resolve('.local/collections', `${date}.json`),
        reviewFile,
      }),
      null,
      2,
    ),
  );
} else if (command === 'review') {
  const [id, nextCheckAt, basis, sourceUrl] = args;
  if (!id || !nextCheckAt || !basis)
    throw new Error(
      'Usage: node scripts/knowledge-cli.mjs review ID YYYY-MM-DDTHH:mm:ss+09:00 "basis" [source-url]',
    );
  const result = await reviewFollowup({
    stageFile,
    reviewFile,
    id,
    nextCheckAt,
    basis,
    sourceUrl,
  });
  console.log(
    JSON.stringify(
      {
        ...result,
        wiki: await buildWiki({ stageFile, reviewFile, knowledgeDir }),
      },
      null,
      2,
    ),
  );
} else if (command === 'record') {
  const [id, attemptFile] = args;
  if (!id || !attemptFile)
    throw new Error(
      'Usage: node scripts/knowledge-cli.mjs record ID attempt.json',
    );
  const attempt = JSON.parse(await readFile(resolve(attemptFile), 'utf8'));
  const result = await recordFollowupAttempt({
    stageFile,
    reviewFile,
    id,
    attempt,
  });
  console.log(
    JSON.stringify(
      {
        ...result,
        wiki: await buildWiki({ stageFile, reviewFile, knowledgeDir }),
      },
      null,
      2,
    ),
  );
} else if (command === 'build') {
  console.log(
    JSON.stringify(
      await buildWiki({ stageFile, reviewFile, knowledgeDir }),
      null,
      2,
    ),
  );
} else if (command === 'backup') {
  if (!args[0])
    throw new Error('Usage: node scripts/knowledge-cli.mjs backup DESTINATION');
  console.log(
    JSON.stringify(
      await exportKnowledge(knowledgeDir, resolve(args[0])),
      null,
      2,
    ),
  );
} else if (command === 'verify-backup') {
  if (!args[0])
    throw new Error(
      'Usage: node scripts/knowledge-cli.mjs verify-backup DIRECTORY',
    );
  console.log(
    JSON.stringify(await verifyKnowledgeBackup(resolve(args[0])), null, 2),
  );
} else if (command === 'restore') {
  if (!args[0])
    throw new Error(
      'Usage: node scripts/knowledge-cli.mjs restore BACKUP_DIRECTORY',
    );
  console.log(
    JSON.stringify(
      await restoreKnowledgeBackup(resolve(args[0]), knowledgeDir),
      null,
      2,
    ),
  );
} else {
  throw new Error(
    'Usage: npm run knowledge:backfill or npm run knowledge:prepare -- YYYY-MM-DD [keyword]',
  );
}
