import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { prepareKnowledge } from './knowledge.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(`${path}.tmp`, json(value), { mode: 0o600 });
  await rename(`${path}.tmp`, path);
}

export async function savePreparation({
  issueDir,
  stageFile,
  reviewFile,
  collectionFile,
  runDir,
  date,
}) {
  const collectionRaw = await readFile(collectionFile, 'utf8');
  const collection = JSON.parse(collectionRaw);
  if (collection.date !== date) throw new Error('Collection date mismatch');
  const context = await prepareKnowledge({
    issueDir,
    stageFile,
    reviewFile,
    collectionFile,
    date,
    asOf: new Date().toISOString(),
  });
  const record = {
    ...context,
    collection_hash: digest(collectionRaw),
    collected_at: collection.collectedAt,
    source_post_ids: collection.posts.map((post) => post.id),
  };
  const path = join(runDir, `${date}-preparation.json`);
  await atomicJson(path, record);
  return {
    path,
    counts: record.counts,
    collection_hash: record.collection_hash,
  };
}

export async function recordSelection({
  date,
  runDir,
  articleFile,
  manifestFile,
  collectionFile,
  reviewFile,
}) {
  const preparation = JSON.parse(
    await readFile(join(runDir, `${date}-preparation.json`), 'utf8'),
  );
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  const article = await readFile(articleFile, 'utf8');
  const collectionRaw = await readFile(collectionFile, 'utf8');
  if (
    manifest.date !== date ||
    digest(collectionRaw) !== preparation.collection_hash
  )
    throw new Error('Selection does not match the prepared collection');
  const sourcePosts = new Set(preparation.source_post_ids);
  const prior = new Map([
    ...(preparation.explainer_index ?? []).map((item) => [item.id, item]),
    ...preparation.candidate_index.map((candidate) => [
      candidate.id,
      candidate,
    ]),
    ...preparation.related_candidates.map((candidate) => [
      candidate.id,
      candidate,
    ]),
    ...preparation.due.map((item) => [item.id, item]),
    ...preparation.review_queue.map((item) => [item.id, item]),
  ]);
  if (
    !Array.isArray(manifest.read_prior_ids) ||
    !Array.isArray(manifest.used_prior) ||
    !Array.isArray(manifest.selected_candidates) ||
    !Array.isArray(manifest.deferred_candidates) ||
    !Array.isArray(manifest.due_actions) ||
    !Array.isArray(manifest.priority_actions)
  )
    throw new Error('Selection manifest is missing required arrays');
  const read = new Set(manifest.read_prior_ids);
  for (const id of read)
    if (!prior.has(id)) throw new Error(`Unknown prior record: ${id}`);
  for (const used of manifest.used_prior) {
    if (
      !read.has(used.id) ||
      !used.reason?.trim() ||
      !used.article_link?.trim() ||
      !used.article_section?.trim()
    )
      throw new Error(`Incomplete use of prior record: ${used.id}`);
    if (
      !article.includes(used.article_link) ||
      !article.includes(`## ${used.article_section}`)
    )
      throw new Error(
        `Prior record has no matching citation and section in article: ${used.id}`,
      );
    const originDate = prior
      .get(used.id)
      .origin.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (originDate && !used.article_link.includes(originDate))
      throw new Error(`Prior article link does not match record: ${used.id}`);
  }
  for (const candidate of manifest.selected_candidates) {
    if (
      !candidate.name?.trim() ||
      !candidate.reason?.trim() ||
      !candidate.article_section?.trim() ||
      !Array.isArray(candidate.source_post_ids)
    )
      throw new Error('Incomplete selected candidate');
    if (!article.includes(`## ${candidate.article_section}`))
      throw new Error(`Selected candidate section missing: ${candidate.name}`);
    for (const id of candidate.source_post_ids)
      if (!sourcePosts.has(id))
        throw new Error(`Source post outside collection: ${id}`);
  }
  for (const candidate of manifest.deferred_candidates)
    if (!candidate.name?.trim() || !candidate.reason?.trim())
      throw new Error('Incomplete deferred candidate');
  const dueIds = new Set(preparation.due.map((item) => item.id));
  let latestReviews = { items: {} };
  if (reviewFile) {
    try {
      latestReviews = JSON.parse(await readFile(reviewFile, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  const handled = new Set();
  for (const action of manifest.due_actions) {
    if (
      !dueIds.has(action.id) ||
      handled.has(action.id) ||
      !['checked', 'deferred'].includes(action.status) ||
      !action.note?.trim()
    )
      throw new Error(`Invalid due action: ${action.id}`);
    if (action.status === 'checked') {
      const prior = preparation.due.find((item) => item.id === action.id);
      const current = latestReviews.items[action.id];
      if (
        !current ||
        current.origin_hash !== prior.origin_hash ||
        (current.attempts?.length ?? 0) <= (prior.attempts?.length ?? 0)
      )
        throw new Error(
          `Checked followup needs a newly recorded attempt: ${action.id}`,
        );
    }
    handled.add(action.id);
  }
  if (handled.size !== dueIds.size)
    throw new Error('Every due followup needs an action');
  const priority = new Map((preparation.priority_review_queue ?? []).map((item) => [item.id, item]));
  const priorityHandled = new Set();
  for (const action of manifest.priority_actions) {
    if (
      !priority.has(action.id) ||
      priorityHandled.has(action.id) ||
      !['reviewed', 'deferred'].includes(action.status) ||
      !action.note?.trim()
    ) throw new Error(`Invalid priority action: ${action.id}`);
    if (action.status === 'reviewed') {
      const current = latestReviews.items[action.id];
      const prior = priority.get(action.id);
      if (
        !current ||
        current.origin_hash !== prior.origin_hash ||
        !current.reviewed_at ||
        Date.parse(current.reviewed_at) < Date.parse(preparation.as_of)
      ) throw new Error(`Reviewed priority followup needs a fresh review: ${action.id}`);
    }
    priorityHandled.add(action.id);
  }
  if (priorityHandled.size !== priority.size)
    throw new Error('Every priority review followup needs an action');
  if (preparation.review_queue.length && !manifest.backlog_note?.trim())
    throw new Error('Unreviewed backlog needs a note');
  const result = {
    schema_version: 1,
    date,
    article: articleFile,
    article_hash: digest(article),
    collection_hash: preparation.collection_hash,
    retrieved_ids: [
      ...new Set(
        [
          ...preparation.related_candidates,
          ...(preparation.related_explainers ?? []),
          ...preparation.due,
          ...preparation.review_queue,
        ]
          .map((item) => item.id)
          .concat([...read]),
      ),
    ],
    read_prior_ids: [...read],
    used_prior: manifest.used_prior,
    selected_candidates: manifest.selected_candidates,
    deferred_candidates: manifest.deferred_candidates,
    due_actions: manifest.due_actions,
    priority_actions: manifest.priority_actions,
    backlog_note: manifest.backlog_note ?? null,
  };
  const path = join(runDir, `${date}-selection.json`);
  await atomicJson(path, result);
  return {
    path,
    retrieved: result.retrieved_ids.length,
    read: read.size,
    used: result.used_prior.length,
    selected: result.selected_candidates.length,
    due_handled: handled.size,
    priority_handled: priorityHandled.size,
  };
}
