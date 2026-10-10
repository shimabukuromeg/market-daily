import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { createRequire } from 'node:module';
const {
  LightTheme: { colors, typography, sizing },
} = createRequire(import.meta.url)('baseui');
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
  const space = (name) => Number.parseInt(sizing[name]);
  const type = (name) => ({
    fontSize: Number.parseInt(typography[name].fontSize),
    fontWeight: typography[name].fontWeight,
    lineHeight:
      Number.parseInt(typography[name].lineHeight) /
      Number.parseInt(typography[name].fontSize),
  });
  const titleType = posts
    ? title.length > 60
      ? 'DisplaySmall'
      : 'DisplayMedium'
    : 'DisplayLarge';
  const logo = h(
    'svg',
    { width: 48, height: 48, viewBox: '0 0 48 48' },
    h('rect', { width: 48, height: 48, rx: 4, fill: colors.contentPrimary }),
    ...[12, 20, 28].map((height, index) =>
      h('rect', {
        x: 10 + index * 10,
        y: 38 - height,
        width: 6,
        height,
        fill: colors.backgroundPrimary,
      }),
    ),
  );
  return h(
    'div',
    style({
      width: 1200,
      height: 630,
      padding: space('scale1400'),
      background: colors.backgroundPrimary,
      color: colors.contentPrimary,
      fontFamily: 'Noto Sans JP',
      flexDirection: 'column',
    }),
    h(
      'div',
      style({
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: space('scale800'),
        borderBottom: `1px solid ${colors.borderOpaque}`,
      }),
      h(
        'div',
        style({ alignItems: 'center', gap: space('scale500') }),
        logo,
        h(
          'div',
          style({ flexDirection: 'column' }),
          h('span', style({ ...type('HeadingSmall') }), 'Market Daily'),
          h(
            'span',
            style({
              ...type('LabelSmall'),
              color: colors.contentSecondary,
              marginTop: 4,
            }),
            '株の観測日誌',
          ),
        ),
      ),
      h(
        'span',
        style({ ...type('LabelLarge'), color: colors.contentSecondary }),
        date,
      ),
    ),
    h(
      'div',
      style({
        flex: 1,
        justifyContent: 'center',
        flexDirection: 'column',
        padding: '24px 0',
      }),
      h(
        'div',
        style({
          ...type(titleType),
          letterSpacing: -1.5,
          whiteSpace: 'pre-wrap',
        }),
        title,
      ),
      summary &&
        h(
          'div',
          style({
            marginTop: space('scale700'),
            fontSize: 24,
            lineHeight: 1.6,
            color: colors.contentSecondary,
          }),
          summary,
        ),
    ),
    h(
      'div',
      style({
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: `1px solid ${colors.borderOpaque}`,
        paddingTop: space('scale700'),
        ...type('LabelMedium'),
      }),
      h(
        'div',
        style({ alignItems: 'center', gap: 12 }),
        h(
          'div',
          style({ width: 8, height: 8, background: colors.backgroundAccent }),
        ),
        h(
          'span',
          {},
          posts ? '話題を追う。買う条件を考える。' : 'MARKET DAILY / 観測日誌',
        ),
      ),
      h(
        'span',
        style({ color: colors.contentSecondary }),
        posts
          ? `収集投稿 ${posts.toLocaleString('ja-JP')}件`
          : '出典と、次に確かめる数字。',
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
  title: '話題を追う。\n買う条件を考える。',
  summary:
    '市場の話題を、出典から読み解く。次に確かめる数字まで整理する観測日誌。',
  posts: 0,
});
for (const issue of issues) await generate(issue.date, issue);
console.log(`Generated ${issues.length + 1} OGP images`);
