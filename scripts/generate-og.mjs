import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
const root = new URL('../public/og/', import.meta.url);
const issues = JSON.parse(
  await readFile(
    new URL('../src/generated/issues.json', import.meta.url),
    'utf8',
  ),
);
const font = (weight) =>
  readFile(
    new URL(
      `../node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-${weight}-normal.woff`,
      import.meta.url,
    ),
  );
const [regular, bold] = await Promise.all([font(400), font(700)]);
await mkdir(root, { recursive: true });
for (const file of await readdir(root))
  if (file.endsWith('.png')) await rm(new URL(file, root));
const h = (type, props, ...children) => ({
  type,
  props: {
    ...props,
    style: type === 'div' ? { display: 'flex', ...props.style } : props.style,
    children: children.flat(),
  },
});
const fonts = [
  { name: 'Noto Sans JP', data: regular, weight: 400, style: 'normal' },
  { name: 'Noto Sans JP', data: bold, weight: 700, style: 'normal' },
];
const style = (value) => ({ style: value });
function paper({ date, title, summary, posts }) {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(-2) : 'MD';
  return h(
    'div',
    style({
      width: 1200,
      height: 630,
      display: 'flex',
      position: 'relative',
      padding: 58,
      background: '#f3f0e8',
      color: '#101b19',
      fontFamily: 'Noto Sans JP',
      overflow: 'hidden',
    }),
    h(
      'div',
      style({
        position: 'absolute',
        inset: 0,
        opacity: .28,
        backgroundImage: 'linear-gradient(90deg, rgba(16,27,25,.11) 1px, transparent 1px)',
        backgroundSize: '100px 100%',
      }),
    ),
    h(
      'div',
      style({
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        borderTop: '2px solid #101b19',
        borderBottom: '2px solid #101b19',
      }),
      h(
        'div',
        style({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '22px 0',
          borderBottom: '1px solid rgba(16,27,25,.35)',
          color: '#b92f16',
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: 3,
        }),
        h('span', {}, 'MARKET DAILY / INVESTMENT BRIEFING'),
        h('span', style({ color: '#6d7773', letterSpacing: 1 }), date),
      ),
      h(
        'div',
        style({
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          gap: 54,
          padding: '28px 0 24px',
        }),
        h(
          'div',
          style({
            width: 285,
            color: '#e54b2a',
            fontSize: day === 'MD' ? 126 : 194,
            fontWeight: 400,
            lineHeight: .82,
            letterSpacing: -14,
          }),
          day,
        ),
        h(
          'div',
          style({ display: 'flex', flex: 1, flexDirection: 'column' }),
          h(
            'div',
            style({
              fontSize: title.length > 34 ? 44 : 51,
              fontWeight: 700,
              lineHeight: 1.32,
              letterSpacing: -2,
            }),
            title,
          ),
          summary &&
            h(
              'div',
              style({
                marginTop: 16,
                color: '#52605c',
                fontSize: 21,
                lineHeight: 1.5,
              }),
              summary,
            ),
        ),
      ),
      h(
        'div',
        style({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 0 20px',
          borderTop: '1px solid rgba(16,27,25,.35)',
          color: '#6d7773',
          fontSize: 17,
        }),
        h('span', {}, 'ノイズを削り、次の一手を読む。'),
        posts
          ? h(
              'span',
              style({
                padding: '8px 16px',
                borderRadius: 999,
                background: '#c9ef71',
                color: '#101b19',
                fontWeight: 700,
              }),
              `${posts.toLocaleString('ja-JP')} POSTS`,
            )
          : h(
              'span',
              style({ color: '#b92f16', fontWeight: 700 }),
              'DAILY OBSERVATION',
            ),
      ),
    ),
  );
}
async function generate(name, data) {
  const svg = await satori(paper(data), { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } })
    .render()
    .asPng();
  await writeFile(new URL(`${name}.png`, root), png);
}
await generate('market-daily', {
  date: 'DAILY MARKET BRIEFING',
  title: '市場を追う、毎日の投資メモ',
  summary:
    'Xの投稿から、投資アイデアと次に確認する数字を読みやすく整理します。',
  posts: 0,
});
for (const issue of issues) await generate(issue.date, issue);
console.log(`Generated ${issues.length + 1} OGP images`);
