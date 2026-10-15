import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const digest = (value) => createHash('sha256').update(value).digest('hex');
const oneLine = (value) => value.replace(/\s+/g, ' ').trim();
const nameFromHeading = (heading) =>
  heading
    .replace(/^(?:監視|買い候補|情報不足)\d*[：:]\s*/, '')
    .replace(/（[^）]*）.*$/, '')
    .trim();
const label = (text) => oneLine(text).replace(/[[]]/g, '');

export function wikiPages(issues, reviews = { items: {} }, explainers = []) {
  const entities = new Map();
  const followups = [];
  for (const issue of issues) {
    for (const candidate of issue.candidates) {
      const name = nameFromHeading(candidate.heading);
      if (!name) continue;
      const path = `entities/${digest(name).slice(0, 16)}.md`;
      if (!entities.has(name))
        entities.set(name, { name, path, candidates: [], followups: [] });
      entities.get(name).candidates.push({
        ...candidate,
        origin: `content/issues/${issue.file}`,
      });
    }
    for (const item of issue.followups) followups.push(item);
  }
  const pages = new Map();
  const index = [
    '# 知識索引',
    '',
    '過去記事から抽出した仮説と確認項目です。出典の事実、記事の見立て、確認結果を混同しない。',
    '',
    '## 企業・候補',
    '',
  ];
  for (const entity of entities.values()) {
    const linked = followups.filter((item) => item.title.includes(entity.name));
    entity.followups = linked;
    const body = [
      `# ${label(entity.name)}`,
      '',
      '過去記事に書かれた当時の仮説です。現在の事実として引用する前に元資料を確認する。',
      '',
      '## 仮説の履歴',
      '',
    ];
    for (const candidate of entity.candidates)
      body.push(
        `- ${label(candidate.heading)}（${candidate.origin}）: ${oneLine(candidate.hypothesis ?? candidate.excerpt)}`,
      );
    body.push('', '## 確認項目', '');
    for (const item of linked)
      body.push(`- [${label(item.title)}](../followups/${item.id}.md)`);
    pages.set(entity.path, `${body.join('\n')}\n`);
    index.push(
      `- [${label(entity.name)}](${entity.path}) — 過去候補${entity.candidates.length}件、確認項目${linked.length}件`,
    );
  }
  index.push('', '## 確認項目', '');
  for (const item of followups) {
    const review = reviews.items?.[item.id];
    const validReview =
      review?.origin_hash === item.origin_hash ? review : null;
    const status = validReview?.status ?? 'needs_review';
    const page = `followups/${item.id}.md`;
    const body = [
      `# ${label(item.title)}`,
      '',
      `- ID: ${item.id}`,
      `- 状態: ${status}`,
      `- 元記事: ${item.origin}`,
      `- 元記事のSHA-256: ${item.origin_hash}`,
      `- 次の内部確認日: ${validReview?.next_check_at ?? '未設定'}`,
      `- 日程の根拠: ${validReview?.schedule_basis ?? '未確認'}`,
      '',
      '## 当初の確認内容',
      '',
      oneLine(item.description),
      '',
      '## 元記事で挙げた資料',
      '',
      ...item.source_urls.map((url) => `- ${url}`),
      '',
      '## 確認履歴',
      '',
    ];
    for (const attempt of validReview?.attempts ?? []) {
      body.push(
        `- ${attempt.checked_at} / ${attempt.outcome} / ${attempt.target_period}: ${attempt.note}`,
      );
      if (attempt.source_url) body.push(`  - 資料: ${attempt.source_url}`);
      if (attempt.comparison) body.push(`  - 比較: ${attempt.comparison}`);
    }
    pages.set(page, `${body.join('\n')}\n`);
    index.push(`- [${label(item.title)}](${page}) — ${status}、${item.origin}`);
  }
  index.push('', '## 解説記事', '');
  for (const item of explainers) {
    const path = `sources/${item.id}.md`;
    pages.set(
      path,
      `# ${label(item.title)}\n\n- 元記事: ${item.origin}\n- 元記事のSHA-256: ${item.origin_hash}\n- 問い: ${oneLine(item.question)}\n- 当時の記事の答え: ${oneLine(item.answer)}\n\n記事の答えは当時の整理です。現在の判断には元記事と新しい資料を照合する。\n`,
    );
    index.push(`- [${label(item.title)}](${path}) — 解説記事`);
  }
  pages.set('index.md', `${index.join('\n')}\n`);
  const history = followups
    .flatMap((item) => {
      const review = reviews.items?.[item.id];
      if (review?.origin_hash !== item.origin_hash) return [];
      return (review.attempts ?? []).map((attempt) => ({
        ...attempt,
        followup_id: item.id,
      }));
    })
    .sort((a, b) => a.checked_at.localeCompare(b.checked_at));
  const log = [
    '# 確認履歴',
    '',
    `元記事${issues.length}件、過去候補${[...entities.values()].reduce((count, entity) => count + entity.candidates.length, 0)}件、確認項目${followups.length}件。`,
    '',
    ...history.map(
      (entry) =>
        `- ${entry.checked_at} [${entry.followup_id}](followups/${entry.followup_id}.md) — ${entry.outcome}: ${oneLine(entry.note)}`,
    ),
  ];
  pages.set('log.md', `${log.join('\n')}\n`);
  return pages;
}

export async function buildWiki({ stageFile, reviewFile, knowledgeDir }) {
  const staged = JSON.parse(await readFile(stageFile, 'utf8'));
  let reviews = { items: {} };
  try {
    reviews = JSON.parse(await readFile(reviewFile, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const pages = wikiPages(staged.issues, reviews, staged.explainers ?? []);
  const revision = digest(JSON.stringify([...pages]));
  const target = join(knowledgeDir, 'generations', revision);
  await mkdir(target, { recursive: true, mode: 0o700 });
  for (const [path, content] of pages) {
    const output = join(target, path);
    await mkdir(dirname(output), { recursive: true, mode: 0o700 });
    await writeFile(output, content, { mode: 0o600 });
  }
  await mkdir(knowledgeDir, { recursive: true, mode: 0o700 });
  const pointer = join(knowledgeDir, 'CURRENT');
  await writeFile(`${pointer}.tmp`, `${revision}\n`, { mode: 0o600 });
  await rename(`${pointer}.tmp`, pointer);
  return { revision, pages: pages.size, index: join(target, 'index.md') };
}
