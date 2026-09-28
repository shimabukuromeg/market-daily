import issues from '../lib/issues.json';
import { SiteFooter, SiteHeader, type Issue } from '../components/issue';
import Link from 'next/link';

export default function Home() {
  const editions = issues as Issue[];
  return (
    <main>
      <SiteHeader />
      <section className="archive" aria-labelledby="archive-title">
        <div className="archive-heading">
          <div>
            <span className="edition">DAILY MARKET BRIEFING</span>
            <h1 id="archive-title">市場を追う、毎日の投資メモ</h1>
            <p className="archive-description">
              Xで選んだ発信者の投稿から、投資アイデアと確認条件を整理します。
            </p>
          </div>
          <p className="issue-count">{editions.length}号</p>
        </div>
        {editions.length === 0 ? (
          <div className="empty">
            <h2>次の相場を考える、毎日の一枚。</h2>
            <p>初回の記事を準備しています。</p>
          </div>
        ) : (
          <div className="issue-list">
            {editions.map((issue, index) => (
              <Link
                className="issue-card"
                href={`/${issue.date}/`}
                key={issue.date}
              >
                <div className="issue-card-meta">
                  <time dateTime={issue.date}>{issue.date}</time>
                  <span>
                    {index === 0
                      ? '最新号'
                      : `${issue.posts.toLocaleString('ja-JP')}件`}
                  </span>
                </div>
                <h2>{issue.title}</h2>
                <p>{issue.summary}</p>
                <span className="read-more">読む →</span>
              </Link>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
