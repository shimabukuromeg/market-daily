import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Lexer } from 'marked';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const issues = JSON.parse(await read('src/generated/issues.json'));
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
      decoded.includes(`href="${url}"`),
      `${issue.date}: missing source ${url}`,
    );
    checkedLinks++;
  }
  assert.ok(
    !html.includes('<script async src="https://platform.x.com/widgets.js"'),
    `${issue.date}: eager X script`,
  );
  assert.ok(
    html.includes('class="source-accordion"') ||
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
    assert.ok(guide.includes(`id="${anchor}"`), `${issue.date}: guide target ${anchor}`);
    typeLinks++;
  }
}
assert.equal((guide.match(/<h1(?:\s|>)/g) ?? []).length, 1, 'guide: one page heading');
console.log(`Verified ${typeLinks} decision type links and their guide targets.`);
