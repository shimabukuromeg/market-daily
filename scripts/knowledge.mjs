import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const dateFile = /^\d{4}-\d{2}-\d{2}\.md$/;

function mentionedCheckDate(item) {
  const match = item.title.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/);
  if (!match) return null;
  const origin = item.origin.match(/(\d{4})-(\d{2})-(\d{2})\.md$/);
  if (!origin) return null;
  const originYear = Number(origin[1]);
  const originMonth = Number(origin[2]);
  const month = Number(match[2]);
  if (!match[1] && month < originMonth) return null;
  const year = Number(match[1] ?? originYear);
  const date = `${year}-${String(month).padStart(2, '0')}-${String(Number(match[3])).padStart(2, '0')}`;
  const parsed = new Date(`${date}T00:00:00+09:00`);
  if (
    Number.isNaN(parsed.getTime()) ||
    new Date(parsed.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10) !== date
  ) return null;
  return { date, reason: 'date_mentioned_in_article_unverified' };
}

export function extractIssueKnowledge(file, raw) {
  const date = file.slice(0, -3);
  const lines = raw.split('\n');
  const candidates = [];
  const followups = [];
  let followupSection = false;
  let currentCandidate = null;
  let inCode = false;
  for (const line of lines) {
    if (line.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    if (line.startsWith('## ')) {
      const section = line.slice(3).trim();
      followupSection = section === '次回更新する項目';
      currentCandidate = null;
      if (/^(監視|買い候補|情報不足)[0-9]*[：:]/.test(section)) {
        currentCandidate = {
          id: `candidate-${date}-${candidates.length + 1}`,
          heading: section,
          hypothesis: null,
          excerpt: '',
        };
        candidates.push(currentCandidate);
      }
      continue;
    }
    if (followupSection) {
      const item = line.match(/^\d+\.\s+\*\*(.+?)\*\*[：:]?\s*(.+)$/);
      if (item) {
        const ordinal = followups.length + 1;
        followups.push({
          id: `followup-${date}-${ordinal}`,
          origin: `content/issues/${file}`,
          origin_section: '次回更新する項目',
          origin_hash: hash(raw),
          title: item[1],
          description: item[2],
          source_urls: [
            ...new Set(
              [...line.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map(
                (match) => match[1],
              ),
            ),
          ],
          status: 'needs_review',
          next_check_at: null,
          schedule_basis: null,
          review_note: '対象期間・公式予定・比較基準・一次資料を確認する',
        });
      }
    } else if (currentCandidate && line.trim()) {
      const hypothesis = line.match(/^-?\s*\*\*仮説\*\*[：:]\s*(.+)$/);
      if (hypothesis) currentCandidate.hypothesis = hypothesis[1];
      if (currentCandidate.excerpt.length < 600)
        currentCandidate.excerpt = `${currentCandidate.excerpt} ${line.trim()}`
          .trim()
          .slice(0, 600);
    }
  }
  return { date, file, origin_hash: hash(raw), candidates, followups };
}

export async function scanIssues(issueDir) {
  const files = (await readdir(issueDir))
    .filter((file) => dateFile.test(file))
    .sort();
  return Promise.all(
    files.map(async (file) =>
      extractIssueKnowledge(file, await readFile(join(issueDir, file), 'utf8')),
    ),
  );
}

export async function scanExplainers(explainerDir) {
  let files;
  try {
    files = (await readdir(explainerDir))
      .filter((file) => file.endsWith('.md'))
      .sort();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  return Promise.all(
    files.map(async (file) => {
      const raw = await readFile(join(explainerDir, file), 'utf8');
      const frontmatter = raw.match(/^---\n([\s\S]*?)\n---\n/);
      if (!frontmatter)
        throw new Error(`Missing explainer frontmatter: ${file}`);
      const meta = parse(frontmatter[1]);
      return {
        id: `explainer-${file.slice(0, -3)}`,
        date: String(meta.date),
        title: meta.title,
        question: meta.question,
        answer: meta.answer,
        origin: `content/explains/${file}`,
        origin_hash: hash(raw),
      };
    }),
  );
}

export async function stageBackfill(issueDir, stageDir) {
  const issues = await scanIssues(issueDir);
  const explainers = await scanExplainers(join(dirname(issueDir), 'explains'));
  await mkdir(stageDir, { recursive: true, mode: 0o700 });
  const document = {
    schema_version: 1,
    state: 'needs_review',
    generated_from: 'content/issues/',
    issues,
    explainers,
  };
  const target = join(stageDir, 'backfill.json');
  await writeFile(`${target}.tmp`, `${JSON.stringify(document, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(`${target}.tmp`, target);
  return {
    target,
    issueCount: issues.length,
    candidateCount: issues.reduce((n, issue) => n + issue.candidates.length, 0),
    followupCount: issues.reduce((n, issue) => n + issue.followups.length, 0),
    explainerCount: explainers.length,
  };
}

export async function prepareKnowledge({
  issueDir,
  stageFile,
  reviewFile,
  collectionFile,
  date,
  asOf = `${date}T23:59:59+09:00`,
  query = '',
}) {
  if (Number.isNaN(Date.parse(asOf)))
    throw new Error('Invalid preparation cutoff');
  const issues = await scanIssues(issueDir);
  const explainers = await scanExplainers(join(dirname(issueDir), 'explains'));
  const staged = JSON.parse(await readFile(stageFile, 'utf8'));
  if (staged.schema_version !== 1 || staged.state !== 'needs_review')
    throw new Error('Unsupported knowledge staging data');
  const current = new Map(
    issues.map((issue) => [issue.file, issue.origin_hash]),
  );
  const stale = staged.issues
    .filter((issue) => current.get(issue.file) !== issue.origin_hash)
    .map((issue) => issue.file);
  const stagedFiles = new Set(staged.issues.map((issue) => issue.file));
  stale.push(
    ...issues
      .filter((issue) => !stagedFiles.has(issue.file))
      .map((issue) => issue.file),
  );
  const stagedExplainers = new Map(
    (staged.explainers ?? []).map((item) => [item.origin, item.origin_hash]),
  );
  stale.push(
    ...explainers
      .filter((item) => stagedExplainers.get(item.origin) !== item.origin_hash)
      .map((item) => item.origin),
  );
  stale.push(
    ...[...stagedExplainers.keys()].filter(
      (origin) => !explainers.some((item) => item.origin === origin),
    ),
  );
  if (stale.length)
    throw new Error(
      `Backfill is stale; rerun knowledge:backfill: ${stale.join(', ')}`,
    );
  const previous = staged.issues.filter((issue) => issue.date < date);
  const followups = previous.flatMap((issue) => issue.followups);
  const reviews = await readReviews(reviewFile);
  const reviewed = [];
  const reviewQueue = [];
  for (const item of followups) {
    const review = reviews.items[item.id];
    if (
      !review ||
      review.origin_hash !== item.origin_hash ||
      Date.parse(review.reviewed_at) > Date.parse(asOf)
    )
      reviewQueue.push(item);
    else {
      const attempts = (review.attempts ?? []).filter(
        (attempt) => Date.parse(attempt.checked_at) <= Date.parse(asOf),
      );
      const last = attempts.at(-1);
      reviewed.push({
        ...item,
        ...review,
        attempts,
        status: last
          ? ['unavailable', 'inconclusive'].includes(last.outcome)
            ? 'blocked'
            : 'resolved'
          : 'pending',
        next_check_at:
          last?.next_check_at ??
          review.initial_next_check_at ??
          review.next_check_at,
      });
    }
  }
  const open = reviewed.filter(
    (item) => item.status === 'pending' || item.status === 'blocked',
  );
  const due = open.filter(
    (item) => Date.parse(item.next_check_at) <= Date.parse(asOf),
  );
  const upcoming = open.filter(
    (item) => Date.parse(item.next_check_at) > Date.parse(asOf),
  );
  const resolved = reviewed.filter((item) => item.status === 'resolved');
  const priorityReviewQueue = reviewQueue.flatMap((item) => {
    const mention = mentionedCheckDate(item);
    if (!mention || Date.parse(`${mention.date}T00:00:00+09:00`) > Date.parse(asOf)) return [];
    return [{ ...item, mentioned_check_date: mention.date, priority_reason: mention.reason }];
  });
  const search = query.toLocaleLowerCase('ja-JP').trim();
  let posts = [];
  if (collectionFile) {
    const collection = JSON.parse(await readFile(collectionFile, 'utf8'));
    if (collection.date !== date || !Array.isArray(collection.posts))
      throw new Error('Collection date or posts do not match preparation date');
    posts = collection.posts;
  }
  const candidateIndex = previous.flatMap((issue) =>
    issue.candidates.map((candidate) => ({
      ...candidate,
      origin: `content/issues/${issue.file}`,
    })),
  );
  const related = candidateIndex
    .map((candidate) => {
      const name = candidate.heading
        .replace(/^(?:監視|買い候補|情報不足)\d*[：:]\s*/, '')
        .replace(/（[^）]*）.*$/, '')
        .trim();
      const ticker = candidate.heading.match(
        /(?:東証(?:プライム)?|NASDAQ|NYSE)[：:]\s*([A-Z0-9]{2,5})/i,
      )?.[1];
      const matched = posts.filter((post) => {
        const text = String(post.text ?? '').toLocaleLowerCase('ja-JP');
        return (
          (name.length >= 3 &&
            text.includes(name.toLocaleLowerCase('ja-JP'))) ||
          (ticker && new RegExp(`\\b${ticker}\\b`, 'i').test(text))
        );
      });
      return {
        ...candidate,
        matched_post_count: matched.length,
        matched_post_ids: matched.slice(0, 10).map((post) => post.id),
      };
    })
    .filter(
      (candidate) =>
        candidate.matched_post_count > 0 ||
        (search &&
          `${candidate.heading} ${candidate.hypothesis ?? ''} ${candidate.excerpt}`
            .toLocaleLowerCase('ja-JP')
            .includes(search)),
    );
  const explainerIndex = (staged.explainers ?? []).filter(
    (item) => item.date < date,
  );
  const relatedExplainers = explainerIndex.filter((item) => {
    const words = String(item.title).match(/[A-Za-z]{2,}|[一-龯]{2,}/g) ?? [];
    return (
      (search &&
        `${item.title} ${item.question} ${item.answer}`
          .toLocaleLowerCase('ja-JP')
          .includes(search)) ||
      words.some((word) =>
        posts.some((post) =>
          String(post.text ?? '')
            .toLocaleLowerCase('ja-JP')
            .includes(word.toLocaleLowerCase('ja-JP')),
        ),
      )
    );
  });
  return {
    edition_date: date,
    as_of: asOf,
    state: 'knowledge_preparation',
    collected_post_count: posts.length,
    notice:
      '過去記事の仮説は当時の見立てです。review_queueは未検証です。dueも資料公開や数値の結果を自動確認していないため、完了扱いにしないでください。',
    due,
    upcoming,
    resolved,
    review_queue: reviewQueue,
    priority_review_queue: priorityReviewQueue,
    candidate_index: candidateIndex.map(({ id, heading, origin }) => ({
      id,
      heading,
      origin,
    })),
    related_candidates: related,
    related_explainers: relatedExplainers,
    explainer_index: explainerIndex.map(({ id, title, origin }) => ({
      id,
      title,
      origin,
    })),
    counts: {
      due: due.length,
      upcoming: upcoming.length,
      resolved: resolved.length,
      review_queue: reviewQueue.length,
      priority_review_queue: priorityReviewQueue.length,
      related_candidates: related.length,
      related_explainers: relatedExplainers.length,
    },
  };
}

async function readReviews(reviewFile) {
  if (!reviewFile) return { schema_version: 1, items: {} };
  let data;
  try {
    data = JSON.parse(await readFile(reviewFile, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return { schema_version: 1, items: {} };
    throw error;
  }
  if (
    data.schema_version !== 1 ||
    !data.items ||
    typeof data.items !== 'object'
  )
    throw new Error('Unsupported knowledge review data');
  return data;
}

export async function reviewFollowup({
  stageFile,
  reviewFile,
  id,
  nextCheckAt,
  basis,
  sourceUrl,
}) {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/.test(nextCheckAt) ||
    Number.isNaN(Date.parse(nextCheckAt))
  )
    throw new Error('next_check_at needs an ISO timestamp in JST (+09:00)');
  if (!basis?.trim()) throw new Error('Schedule basis is required');
  if (sourceUrl && !/^https?:\/\//.test(sourceUrl))
    throw new Error('Source must be an HTTP(S) URL');
  const staged = JSON.parse(await readFile(stageFile, 'utf8'));
  const item = staged.issues
    .flatMap((issue) => issue.followups)
    .find((followup) => followup.id === id);
  if (!item) throw new Error(`Unknown followup: ${id}`);
  const reviews = await readReviews(reviewFile);
  const previous = reviews.items[id];
  if (
    previous?.origin_hash === item.origin_hash &&
    previous.status === 'resolved'
  )
    throw new Error(
      'Resolved followups cannot be rescheduled; create a new followup for the next period',
    );
  reviews.items[id] = {
    origin_hash: item.origin_hash,
    status: 'pending',
    initial_next_check_at: nextCheckAt,
    next_check_at: nextCheckAt,
    schedule_basis: basis.trim(),
    schedule_source_url: sourceUrl || null,
    reviewed_at: new Date().toISOString(),
    attempts:
      previous?.origin_hash === item.origin_hash
        ? (previous.attempts ?? [])
        : [],
  };
  await mkdir(dirname(reviewFile), { recursive: true, mode: 0o700 });
  const temp = `${reviewFile}.tmp`;
  await writeFile(temp, `${JSON.stringify(reviews, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temp, reviewFile);
  return { id, status: 'pending', next_check_at: nextCheckAt };
}

export async function recordFollowupAttempt({
  stageFile,
  reviewFile,
  id,
  attempt,
}) {
  const staged = JSON.parse(await readFile(stageFile, 'utf8'));
  const item = staged.issues
    .flatMap((issue) => issue.followups)
    .find((followup) => followup.id === id);
  if (!item) throw new Error(`Unknown followup: ${id}`);
  const reviews = await readReviews(reviewFile);
  const review = reviews.items[id];
  if (!review || review.origin_hash !== item.origin_hash)
    throw new Error('Review this followup before recording an attempt');
  if (
    !['unavailable', 'inconclusive', 'observed', 'supported', 'contradicted'].includes(
      attempt.outcome,
    )
  )
    throw new Error('Invalid outcome');
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/.test(
      attempt.checked_at ?? '',
    ) ||
    Number.isNaN(Date.parse(attempt.checked_at))
  )
    throw new Error('checked_at needs an ISO timestamp in JST (+09:00)');
  if (!attempt.note?.trim() || !attempt.target_period?.trim())
    throw new Error('note and target_period are required');
  if (
    attempt.outcome !== 'unavailable' &&
    (!attempt.source_url ||
      !/^https?:\/\//.test(attempt.source_url) ||
      !attempt.comparison?.trim())
  )
    throw new Error('Available evidence needs source_url and comparison');
  if (
    ['unavailable', 'inconclusive'].includes(attempt.outcome) &&
    attempt.source_url &&
    !/^https?:\/\//.test(attempt.source_url)
  )
    throw new Error('Source must be an HTTP(S) URL');
  if (
    ['unavailable', 'inconclusive'].includes(attempt.outcome) &&
    (!attempt.next_check_at ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/.test(
        attempt.next_check_at,
      ) ||
      Date.parse(attempt.next_check_at) <= Date.parse(attempt.checked_at))
  )
    throw new Error('Unresolved evidence needs a later next_check_at in JST');
  const clean = {
    outcome: attempt.outcome,
    checked_at: attempt.checked_at,
    target_period: attempt.target_period.trim(),
    note: attempt.note.trim(),
    source_url: attempt.source_url ?? null,
    comparison: attempt.comparison?.trim() ?? null,
    next_check_at: attempt.next_check_at ?? null,
  };
  const attemptId = hash(JSON.stringify({ id, ...clean }));
  review.attempts ??= [];
  if (review.attempts.some((entry) => entry.id === attemptId))
    return {
      id,
      attempt_id: attemptId,
      status: review.status,
      duplicate: true,
    };
  review.attempts.push({ id: attemptId, ...clean });
  review.status = ['unavailable', 'inconclusive'].includes(clean.outcome) ? 'blocked' : 'resolved';
  if (clean.next_check_at) review.next_check_at = clean.next_check_at;
  await mkdir(dirname(reviewFile), { recursive: true, mode: 0o700 });
  const temp = `${reviewFile}.tmp`;
  await writeFile(temp, `${JSON.stringify(reviews, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temp, reviewFile);
  return { id, attempt_id: attemptId, status: review.status, duplicate: false };
}
