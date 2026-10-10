import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { createRequire } from 'node:module';
const { LightTheme: { colors, borders } } = createRequire(import.meta.url)('baseui');
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
  return h(
    'div',
    style({
      width: 1200,
      height: 630,
      display: 'flex',
      position: 'relative',
      padding: 54,
      background: colors.backgroundSecondary,
      color: colors.contentPrimary,
      fontFamily: 'Noto Sans JP',
    }),
    h(
      'div',
      style({
        position: 'absolute',
        width: 360,
        height: 360,
        right: -90,
        top: -160,
        borderRadius: 999,
        background: colors.backgroundTertiary,
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
        padding: '46px 56px 42px',
        border: `2px solid ${colors.borderTransparent}`,
        borderRadius: Number.parseInt(borders.radius400),
        background: colors.backgroundPrimary,
        boxShadow: 'none',
        overflow: 'hidden',
      }),
      h(
        'div',
        style({
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 12,
          background: colors.contentPrimary,
        }),
      ),
      h(
        'div',
        style({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: colors.contentPrimary,
          fontSize: 23,
          fontWeight: 700,
          letterSpacing: 2,
        }),
        h('span', {}, 'MARKET DAILY'),
        h('span', style({ color: colors.contentSecondary, letterSpacing: 0 }), date),
      ),
      h(
        'div',
        style({
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          padding: '20px 0 18px',
        }),
        h(
          'div',
          style({ display: 'flex', flexDirection: 'column', width: '100%' }),
          h(
            'div',
            style({
              fontSize: title.length > 34 ? 52 : 60,
              fontWeight: 700,
              lineHeight: 1.35,
              letterSpacing: -2,
            }),
            title,
          ),
          summary &&
            h(
              'div',
              style({
                marginTop: 18,
                color: colors.contentSecondary,
                fontSize: 25,
                lineHeight: 1.55,
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
          paddingTop: 20,
          borderTop: `2px solid ${colors.borderTransparent}`,
          color: colors.contentSecondary,
          fontSize: 21,
        }),
        h('span', {}, '選んだ発信者から、投資アイデアと確認条件を整理'),
        posts
          ? h(
              'span',
              style({
                padding: '8px 18px',
                borderRadius: 999,
                background: colors.backgroundSecondary,
                color: colors.contentPrimary,
                fontWeight: 700,
              }),
              `${posts.toLocaleString('ja-JP')}件を収集`,
            )
          : h(
              'span',
              style({ color: colors.contentPrimary, fontWeight: 700 }),
              '株の観測日誌',
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
