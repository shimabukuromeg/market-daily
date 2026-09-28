import ReactMarkdown, { type Components } from 'react-markdown';
import Link from 'next/link';

export type Issue = {
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
  const maxPosts = Math.max(...rows.map((row) => row.posts), 1);
  const maxAuthors = Math.max(...rows.map((row) => row.authors), 1);
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
      <p>各系列は最大値を100%として表示。テーマは重複分類です。</p>
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

export function SiteHeader() {
  return (
    <header className="masthead">
      <div className="eyebrow">MARKET WATCH / CALENDAR DAY JST</div>
      <Link className="site-title" href="/">
        株の観測日誌<span>Market Daily</span>
      </Link>
      <p>選んだ発信者から、市場の話題と見方を読む。</p>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <strong>Market Daily</strong>
      <p>
        選んだ発信者の観測と意見を整理した記録です。市場全体の総意を示すものではありません。要約はAIで編集し、確認後に公開します。
      </p>
      <a href="https://github.com/shimabukuromeg/market-daily">
        記事・編集履歴 ↗
      </a>
    </footer>
  );
}

export function IssueArticle({ issue }: { issue: Issue }) {
  return (
    <article>
      <div className="issue-meta">
        <span>Market Daily</span>
        <time dateTime={issue.date}>{issue.date}</time>
      </div>
      <h1 className="issue-title">{issue.title}</h1>
      <p className="lede">{issue.summary}</p>
      <p className="coverage">{issue.coverage}</p>
      <div className="prose">
        <ReactMarkdown components={markdownComponents}>
          {issue.markdown}
        </ReactMarkdown>
      </div>
    </article>
  );
}
