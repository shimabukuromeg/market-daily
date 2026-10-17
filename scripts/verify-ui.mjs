import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Lexer } from 'marked';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const issues = JSON.parse(await read('src/generated/issues.json'));
const explains = JSON.parse(await read('src/generated/explains.json'));
let checkedLinks = 0;
for (const issue of issues) {
  const html = await read(`dist/${issue.date}/index.html`);
  const decoded = html.replaceAll('&amp;', '&').replaceAll('&#x27;', "'");
  assert.equal(
    (html.match(/<h1(?:\s|>)/g) ?? []).length,
    1,
    `${issue.date}: one page heading`,
  );
  const sections = Lexer.lex(issue.markdown).filter(
    (token) => token.type === 'heading' && token.depth === 2,
  );
  for (let index = 1; index <= sections.length; index++) {
    assert.equal(
      (html.match(new RegExp(`id="section-${index}"`, 'g')) ?? []).length,
      1,
      `${issue.date}: unique section ${index}`,
    );
    assert.ok(
      html.includes(`href="#section-${index}"`),
      `${issue.date}: TOC target ${index}`,
    );
  }
  const topicSections = [];
  for (const token of Lexer.lex(issue.markdown)) {
    if (token.type === 'heading' && token.depth === 2) topicSections.push('');
    if (topicSections.length)
      topicSections[topicSections.length - 1] += token.raw;
  }
  const decodeText = (text) =>
    text.replace(
      /&(amp|lt|gt|quot|#x27|#39);/g,
      (_all, key) =>
        ({ amp: '&', lt: '<', gt: '>', quot: '"', '#x27': "'", '#39': "'" })[
          key
        ],
    );
  const prompts = [
    ...html.matchAll(
      /<textarea[^>]*id="ai-prompt-section-(\d+)"[^>]*>([\s\S]*?)<\/textarea>/g,
    ),
  ];
  const expected = topicSections.filter((section) =>
    /\*\*株価[：:]\*\*/.test(section),
  ).length;
  assert.equal(
    prompts.length,
    expected,
    `${issue.date}: AI action for every stock topic`,
  );
  for (const [, index, encoded] of prompts) {
    const prompt = decodeText(encoded);
    assert.ok(
      prompt.endsWith(topicSections[Number(index) - 1].trim()),
      `${issue.date}: complete section including sources`,
    );
    assert.ok(prompt.includes(`観測日：${issue.date}`));
    assert.ok(prompt.includes(`#section-${index}`));
    for (const provider of [
      'https://chatgpt.com/?q=',
      'https://claude.ai/new?q=',
    ]) {
      const link = provider + encodeURIComponent(prompt);
      assert.ok(
        html.includes(
          `href="${link.length <= 12000 ? link : provider.split('?')[0]}"`,
        ),
        `${issue.date}: full prompt or long-text fallback`,
      );
    }
  }
  if (issue.date >= '2026-10-16') {
    const quiz = /```quiz\n([\s\S]*?)\n```/.exec(issue.markdown);
    const count = quiz?.[1].trim().split('\n').length ?? 0;
    assert.equal(
      (html.match(/class="quiz-item"/g) ?? []).length,
      count,
      `${issue.date}: every quiz question renders`,
    );
    assert.equal(
      (html.match(/<details><summary><span class="quiz-number"/g) ?? []).length,
      count,
      `${issue.date}: answers use closed native disclosure`,
    );
  }
  const conditionLists = Lexer.lex(issue.markdown).filter(
    (token) =>
      token.type === 'list' &&
      !token.ordered &&
      token.items.length >= 3 &&
      token.items.every((item) =>
        /^(取り上げた理由|仮説|買う条件|利確条件|損切り条件|次の行動)$/.test(
          /^\*\*([^*]+)\*\*/.exec(item.text)?.[1] ?? '',
        ),
      ),
  );
  assert.equal(
    (html.match(/class="decision-list"/g) ?? []).length,
    conditionLists.length,
    `${issue.date}: condition structures preserved`,
  );
  const urls = new Set(issue.markdown.match(/https?:\/\/[^\s|<>")]+/g) ?? []);
  for (const url of urls) {
    assert.ok(
      decoded.includes(`href="${url}"`) ||
        decoded.includes(`href="${new URL(url).href}"`),
      `${issue.date}: missing source ${url}`,
    );
    checkedLinks++;
  }
  assert.ok(
    !html.includes('<script async src="https://platform.x.com/widgets.js"'),
    `${issue.date}: eager X script`,
  );
  assert.ok(
    html.includes('class="source-previews"') ||
      !issue.markdown.includes('```x-posts'),
    `${issue.date}: source fallback`,
  );
  assert.ok(
    html.includes('aria-label="テーマ別の集計値"') ||
      !issue.markdown.includes('```theme-chart'),
    `${issue.date}: accessible data table`,
  );
  assert.ok(
    html.includes(
      `content="${issue.title.replaceAll('&', '&amp;').replaceAll('"', '&quot;')} | Market Daily"`,
    ),
    `${issue.date}: title metadata`,
  );
}
const archive = await read('dist/index.html');
for (const issue of issues)
  assert.ok(archive.includes(`${issue.date}/`), `archive: ${issue.date}`);
console.log(
  `Verified ${issues.length} articles, all TOC targets, ${checkedLinks} unique-per-article source links, static source fallbacks, table labels, metadata, and archive routes.`,
);

const guide = await read('dist/decision-types/index.html');
let typeLinks = 0;
for (const issue of issues) {
  const html = await read(`dist/${issue.date}/index.html`);
  const links = [...html.matchAll(/href="[^"#]*decision-types\/#([a-z-]+)"/g)];
  const labels = issue.markdown.match(/\*\*型[：:]/g) ?? [];
  assert.ok(links.length >= labels.length, `${issue.date}: type explanations`);
  for (const [, anchor] of links) {
    assert.ok(
      guide.includes(`id="${anchor}"`),
      `${issue.date}: guide target ${anchor}`,
    );
    typeLinks++;
  }
}
assert.equal(
  (guide.match(/<h1(?:\s|>)/g) ?? []).length,
  1,
  'guide: one page heading',
);
console.log(
  `Verified ${typeLinks} decision type links and their guide targets.`,
);

for (const item of explains) {
  const html = await read(`dist/explains/${item.slug}/index.html`);
  const encoded = html.match(
    new RegExp(`<textarea[^>]*id="ai-prompt-explain-${item.slug}"[^>]*>([\\s\\S]*?)<\\/textarea>`),
  )?.[1];
  assert.ok(encoded, `${item.slug}: AI deep-dive prompt`);
  const prompt = encoded
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#x27;', "'");
  assert.ok(prompt.includes(`/explains/${item.slug}/`), `${item.slug}: article URL`);
  assert.ok(prompt.includes(`記事の日付：${item.date}`), `${item.slug}: article date`);
  assert.ok(prompt.includes(item.question), `${item.slug}: opening question`);
  assert.ok(prompt.includes(item.answer), `${item.slug}: article answer`);
  assert.ok(html.includes('記事のURLと問い・答えをAIに渡します。'), `${item.slug}: accurate AI guidance`);
  for (const provider of ['https://chatgpt.com/?q=', 'https://claude.ai/new?q=']) {
    assert.ok(html.includes(`href="${provider}${encodeURIComponent(prompt)}"`), `${item.slug}: AI link`);
  }
}
console.log(`Verified AI deep-dive links in ${explains.length} explainers.`);
