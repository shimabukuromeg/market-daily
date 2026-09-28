import { Marked, Renderer } from 'marked';

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );

function rows(source: string) {
  return source
    .trim()
    .split('\n')
    .map((line) => line.split('|').map((part) => part.trim()));
}

function metrics(source: string) {
  return `<dl class="metrics" aria-label="収集データの概要">${rows(source)
    .filter(([label, value]) => label && value)
    .map(
      ([label, value]) =>
        `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`,
    )
    .join('')}</dl>`;
}

function themeChart(source: string) {
  const data = rows(source)
    .map(([label, posts, authors]) => ({
      label,
      posts: Number(posts),
      authors: Number(authors),
    }))
    .filter(
      ({ label, posts, authors }) =>
        label && Number.isFinite(posts) && Number.isFinite(authors),
    );
  const maxPosts = Math.max(...data.map(({ posts }) => posts), 1);
  const maxAuthors = Math.max(...data.map(({ authors }) => authors), 1);
  const bars = data
    .map(
      ({ label, posts, authors }) => `<div class="chart-row">
        <strong>${escape(label)}</strong>
        <div class="chart-bar"><span class="posts-bar" style="width:${(posts / maxPosts) * 100}%">${posts}</span></div>
        <div class="chart-bar"><span class="authors-bar" style="width:${(authors / maxAuthors) * 100}%">${authors}</span></div>
      </div>`,
    )
    .join('');
  return `<figure class="theme-chart"><figcaption>テーマ別の投稿数と投稿者数</figcaption>
    <div class="chart-legend"><span class="posts-key">投稿数</span><span class="authors-key">投稿者数</span></div>
    ${bars}<p>各系列は最大値を100%として表示。テーマは重複分類です。</p></figure>`;
}

function xPost(label: string, url: string) {
  return `<blockquote class="twitter-tweet" data-dnt="true" data-theme="light"><p>${escape(label)}</p><a href="${escape(url)}">Xで元投稿を読む ↗</a></blockquote>`;
}

function xPosts(source: string) {
  const posts = rows(source)
    .map((parts) => ({
      label: parts.slice(0, -1).join('|'),
      url: parts.at(-1)!,
    }))
    .filter(({ url }) =>
      /^https:\/\/x\.com\/[A-Za-z0-9_]+\/status\/\d+$/.test(url),
    );
  if (!posts.length) return '';
  const primary = posts
    .slice(0, 2)
    .map(({ label, url }) => xPost(label, url))
    .join('');
  const more =
    posts.length > 2
      ? `<details><summary>ほかの投稿を見る（${posts.length - 2}件）</summary><div>${posts
          .slice(2)
          .map(({ label, url }) => xPost(label, url))
          .join('')}</div></details>`
      : '';
  return `<section class="x-posts" aria-label="関連するX投稿"><h3>関連するX投稿</h3><div class="x-posts-primary">${primary}</div>${more}</section>`;
}

const renderer = new Renderer();
renderer.code = ({ text, lang }) => {
  if (lang === 'metrics') return metrics(text);
  if (lang === 'theme-chart') return themeChart(text);
  if (lang === 'x-posts') return xPosts(text);
  const language = lang ? ` class="language-${escape(lang)}"` : '';
  return `<pre><code${language}>${escape(text)}</code></pre>`;
};
renderer.blockquote = ({ tokens }) =>
  `<blockquote class="twitter-tweet" data-dnt="true" data-theme="light">${renderer.parser.parse(tokens)}</blockquote>`;

const marked = new Marked({ renderer, gfm: true });

export function renderMarkdown(source: string) {
  return marked.parse(source) as string;
}
