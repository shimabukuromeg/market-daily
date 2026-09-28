import ReactMarkdown, { type Components } from 'react-markdown';
import issues from '../lib/issues.json';
type Issue = {
  date: string;
  title: string;
  summary: string;
  markdown: string;
  posts: number;
  coverage: string;
};
function XPost({ label, url }: { label: string; url: string }) {
  return (
    <blockquote className="twitter-tweet" data-dnt="true" data-theme="light">
      <p>{label}</p>
      <a href={url}>Xで元投稿を読む ↗</a>
    </blockquote>
  );
}
function XPosts({ source }: { source: string }) {
  const posts = source
    .trim()
    .split('\n')
    .map((line) => {
      const split = line.lastIndexOf('|');
      return {
        label: line.slice(0, split).trim(),
        url: line.slice(split + 1).trim(),
      };
    })
    .filter((post) => post.url.startsWith('https://x.com/'));
  if (!posts.length) return null;
  return (
    <section className="x-posts" aria-label="関連するX投稿">
      <h3>関連するX投稿</h3>
      <div className="x-posts-primary">
        {posts.slice(0, 2).map((post) => (
          <XPost key={post.url} {...post} />
        ))}
      </div>
      {posts.length > 2 && (
        <details>
          <summary>ほかの投稿を見る（{posts.length - 2}件）</summary>
          <div>
            {posts.slice(2).map((post) => (
              <XPost key={post.url} {...post} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
function Metrics({ source }: { source: string }) {
  const metrics = source
    .trim()
    .split('\n')
    .map((line) => {
      const [label, value] = line.split('|').map((part) => part.trim());
      return { label, value };
    })
    .filter((metric) => metric.label && metric.value);
  return (
    <dl className="metrics" aria-label="収集データの概要">
      {metrics.map((metric) => (
        <div key={metric.label}>
          <dt>{metric.label}</dt>
          <dd>{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}
function ThemeChart({ source }: { source: string }) {
  const rows = source
    .trim()
    .split('\n')
    .map((line) => {
      const [label, posts, authors] = line
        .split('|')
        .map((part) => part.trim());
      return { label, posts: Number(posts), authors: Number(authors) };
    })
    .filter(
      (row) =>
        row.label && Number.isFinite(row.posts) && Number.isFinite(row.authors),
    );
  const maxPosts = Math.max(...rows.map((row) => row.posts), 1),
    maxAuthors = Math.max(...rows.map((row) => row.authors), 1);
  return (
    <figure className="theme-chart">
      <figcaption>テーマ別の投稿数と投稿者数</figcaption>
      <div className="chart-legend">
        <span className="posts-key">投稿数</span>
        <span className="authors-key">投稿者数</span>
      </div>
      {rows.map((row) => (
        <div className="chart-row" key={row.label}>
          <strong>{row.label}</strong>
          <div className="chart-bar">
            <span
              className="posts-bar"
              style={{ width: `${(row.posts / maxPosts) * 100}%` }}
            >
              {row.posts}
            </span>
          </div>
          <div className="chart-bar">
            <span
              className="authors-bar"
              style={{ width: `${(row.authors / maxAuthors) * 100}%` }}
            >
              {row.authors}
            </span>
          </div>
        </div>
      ))}
      <p>
        各系列は最大値を100%として表示。テーマは重複分類のため、投稿数の合計は収集件数と一致しません。
      </p>
    </figure>
  );
}
const markdownComponents: Components = {
  blockquote: ({ children }) => (
    <blockquote className="twitter-tweet" data-dnt="true" data-theme="light">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const source = typeof children === 'string' ? children : '';
    if (className === 'language-x-posts') return <XPosts source={source} />;
    if (className === 'language-metrics') return <Metrics source={source} />;
    if (className === 'language-theme-chart')
      return <ThemeChart source={source} />;
    return <code className={className}>{children}</code>;
  },
  pre: ({ children }) => <>{children}</>,
};
export default function Home() {
  const editions = issues as Issue[];
  return (
    <main>
      <header className="masthead">
        <div className="eyebrow">MARKET WATCH / CALENDAR DAY JST</div>
        <h1>
          株の観測日誌<span>Market Daily</span>
        </h1>
        <p>選んだ発信者から、市場の話題と見方を読む。</p>
      </header>
      {editions.length === 0 ? (
        <section className="empty">
          <span className="edition">創刊準備号</span>
          <h2>次の相場を考える、毎晩の一枚。</h2>
          <p>
            初回の記事を準備しています。公開後は、今日の要点、注目銘柄、見方が分かれる論点を出典とともに掲載します。
          </p>
        </section>
      ) : (
        <>
          <nav aria-label="バックナンバー">
            {editions.map((i) => (
              <a key={i.date} href={'#issue-' + i.date}>
                {i.date}
              </a>
            ))}
          </nav>
          {editions.map((i, index) => (
            <article key={i.date} id={'issue-' + i.date}>
              <div className="issue-meta">
                <span>{index === 0 ? '最新号' : 'バックナンバー'}</span>
                <time>{i.date}</time>
              </div>
              <h2>{i.title}</h2>
              <p className="lede">{i.summary}</p>
              <p className="coverage">{i.coverage}</p>
              <div className="prose">
                <ReactMarkdown components={markdownComponents}>
                  {i.markdown}
                </ReactMarkdown>
              </div>
            </article>
          ))}
        </>
      )}
      <footer>
        <strong>Market Daily</strong>
        <p>
          選んだ発信者の観測と意見を整理した記録です。市場全体の総意を示すものではありません。要約はAIで編集し、確認後に公開します。
        </p>
        <a href="https://github.com/shimabukuromeg/market-daily">
          記事・編集履歴 ↗
        </a>
      </footer>
    </main>
  );
}
