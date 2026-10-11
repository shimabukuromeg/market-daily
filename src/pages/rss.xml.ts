import type {APIRoute} from 'astro';
import {editions, sitePath} from '../lib/issues';
import {explains} from '../lib/explains';

const escapeXml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[character] ?? character);

export const GET: APIRoute = ({site}) => {
  if (!site) throw new Error('Astro site URL is required for RSS.');
  const home = new URL(sitePath(), site).href;
  const feed = new URL(sitePath('rss.xml'), site).href;
  const entries = [
    ...editions.map(issue => ({date: issue.date, title: issue.title, summary: issue.summary, path: `${issue.date}/`})),
    ...explains.map(item => ({date: item.date, title: `深掘り｜${item.title}`, summary: item.summary, path: `explains/${item.slug}/`})),
  ].sort((a,b) => b.date.localeCompare(a.date));
  const items = entries.map(issue => {
    const url = new URL(sitePath(issue.path), site).href;
    return `<item>
      <title>${escapeXml(issue.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(issue.summary)}</description>
    </item>`;
  }).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>株の観測日誌 | Market Daily</title>
    <link>${escapeXml(home)}</link>
    <description>Xの投稿から投資アイデアを探す日刊ニュースレター</description>
    <language>ja</language>
    <atom:link href="${escapeXml(feed)}" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;
  return new Response(xml, {headers: {'Content-Type': 'application/rss+xml; charset=utf-8'}});
};
