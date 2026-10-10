import { decisionTypes } from './decision-types';
import { sitePath } from './issues';
import { Marked, Renderer } from 'marked';
import {
  renderTopicAI,
  renderMetrics,
  renderDecisionTypeLink,
  renderRichText,
  renderThemeTable,
  surfaceMarkup,
} from './base-surfaces';

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
  return surfaceMarkup(renderMetrics(rows(source)));
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
  const series = (key: 'posts' | 'authors', title: string, unit: string) => {
    const maximum = Math.max(...data.map((row) => row[key]), 1);
    return `<section class="chart-series" aria-label="テーマ別${title}"><h3>${title}<span>${unit}</span></h3><ol>${data.map((row) => `<li class="series-row"><div class="series-label"><span>${escape(row.label)}</span><b>${row[key]}${unit}</b></div><div class="series-track" aria-hidden="true"><span class="${key}-bar" style="width:${(row[key] / maximum) * 100}%"></span></div></li>`).join('')}</ol></section>`;
  };
  return `<figure class="theme-chart"><figcaption>テーマ別の投稿数と投稿者数</figcaption>
    <div class="chart-series-grid">${series('posts', '投稿数', '件')}${series('authors', '投稿者数', '人')}</div>
    <p>テーマは重複分類です。同じ投稿・投稿者を複数のテーマに含みます。棒の長さは各列の最大値を基準にしています。</p><details class="chart-data"><summary>集計値を表で確認</summary>${surfaceMarkup(renderThemeTable(data))}</details></figure>`;
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
  const sourceLinks = posts
    .map(
      ({ label, url }) =>
        `<li><a href="${escape(url)}" target="_blank" rel="noopener noreferrer"><span>${escape(label)}</span><span aria-hidden="true">↗</span></a></li>`,
    )
    .join('');
  return `<section class="x-posts" aria-label="関連するX投稿"><div class="source-accordion"><details><summary>引用元の投稿を確認（${posts.length}件）</summary><ul class="source-links">${sourceLinks}</ul></details></div><details class="source-previews"><summary>投稿プレビューを表示</summary><div>${posts.map(({ label, url }) => xPost(label, url)).join('')}</div></details></section>`;
}

export function renderMarkdownWithHeadings(
  source: string,
  article?: { date: string; url: string },
) {
  // Use Markdown tokens so headings inside fenced source blocks do not split a topic.
  const sections: { id: string; raw: string }[] = [];
  for (const token of new Marked().lexer(source)) {
    if (token.type === 'heading' && token.depth === 2)
      sections.push({ id: `section-${sections.length + 1}`, raw: '' });
    const section = sections.at(-1);
    if (section) section.raw += token.raw;
  }
  let currentSection = -1;
  const aiRendered = new Set<number>();
  const renderer = new Renderer();
  const headings: { id: string; title: string }[] = [];
  renderer.heading = function ({ tokens, depth, text }) {
    const html = this.parser.parseInline(tokens);
    const id = depth === 2 ? `section-${headings.length + 1}` : undefined;
    if (id) {
      headings.push({ id, title: text.replace(/\*|`/g, '') });
      currentSection++;
    }
    if (depth === 2 || depth === 3)
      return surfaceMarkup(renderRichText(depth === 2 ? 'h2' : 'h3', html, id));
    return `<h${depth}>${html}</h${depth}>`;
  };
  renderer.paragraph = function ({ tokens }) {
    const originalHtml = this.parser.parseInline(tokens);
    const html = originalHtml.replace(
      /<strong>型[：:]([^<]+)<\/strong>/g,
      (_match, label: string) => {
        const names = label.trim().split(/(＋|、または|、|または)/);
        const links = names
          .map((name) => {
            const type = decisionTypes.find(
              (type) => type.name === name.trim(),
            );
            return type
              ? surfaceMarkup(
                  renderDecisionTypeLink(
                    type.name,
                    sitePath(`decision-types/#${type.id}`),
                  ),
                )
              : escape(name);
          })
          .join('');
        return `<strong>判断の型：${links}</strong>`;
      },
    );
    let paragraph = surfaceMarkup(renderRichText('p', html));
    const section = sections[currentSection];
    if (
      article &&
      section &&
      !aiRendered.has(currentSection) &&
      originalHtml.includes('https://www.google.com/finance/quote/')
    ) {
      const prompt = `以下の内容を深掘りしたいです。根拠、反対の見方、リスク、次に確認すべき数字を整理してください。記載された観測日と現在を区別し、最新情報を確認できない点は明示してください。\n\n観測日：${article.date}\n記事：${article.url}#${section.id}\n\n以下は検討対象の記事本文です。\n\n${section.raw.trim()}`;
      paragraph += surfaceMarkup(renderTopicAI(section.id, prompt));
      aiRendered.add(currentSection);
    }
    return originalHtml.includes('<strong>現在の判定：') &&
      originalHtml.includes('<strong>型：')
      ? `<div class="analysis-meta">${paragraph.replace(/<\/strong>[\s　]*<strong>/g, '</strong><strong>')}</div>`
      : paragraph;
  };
  renderer.list = function (token) {
    const html = Renderer.prototype.list.call(this, token);
    const labels =
      /^(取り上げた理由|仮説|買う条件|利確条件|損切り条件|次の行動)$/;
    const isConditions =
      !token.ordered &&
      token.items.length >= 3 &&
      token.items.every((item) =>
        labels.test(/^\*\*([^*]+)\*\*/.exec(item.text)?.[1] ?? ''),
      );
    if (!isConditions) return html;
    return html
      .replace('<ul>', '<ul class="decision-list">')
      .replace(
        /<li><strong>([^<]+)<\/strong>([\s\S]*?)<\/li>/g,
        (_all: string, label: string, body: string) =>
          `<li><span class="decision-label">${label}</span><div class="decision-copy">${body.replace(/^\s*[：:]\s*/, '')}</div></li>`,
      );
  };
  renderer.code = ({ text, lang }) => {
    if (lang === 'metrics') return metrics(text);
    if (lang === 'theme-chart') return themeChart(text);
    if (lang === 'x-posts') return xPosts(text);
    const language = lang ? ` class="language-${escape(lang)}"` : '';
    return `<pre><code${language}>${escape(text)}</code></pre>`;
  };
  renderer.blockquote = function ({ tokens }) {
    return `<blockquote class="twitter-tweet" data-dnt="true" data-theme="light">${this.parser.parse(tokens)}</blockquote>`;
  };
  const marked = new Marked({ renderer, gfm: true });
  const html = marked.parse(source) as string;
  const styles = new Set<string>();
  const compactHtml = html.replace(
    /<style>([\s\S]*?)<\/style>/g,
    (tag, css: string) => {
      if (styles.has(css)) return '';
      styles.add(css);
      return tag;
    },
  );
  return { html: compactHtml, headings };
}
export function renderMarkdown(source: string) {
  return renderMarkdownWithHeadings(source).html;
}
