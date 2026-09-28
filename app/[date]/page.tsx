import type { Metadata } from 'next';
import Link from 'next/link';
import issues from '../../lib/issues.json';
import {
  IssueArticle,
  SiteFooter,
  SiteHeader,
  type Issue,
} from '../../components/issue';

const editions = issues as Issue[];

export function generateStaticParams() {
  return editions.map((issue) => ({ date: issue.date }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  const issue = editions.find((item) => item.date === date);
  return issue
    ? { title: `${issue.title} | Market Daily`, description: issue.summary }
    : {};
}

export default async function EditionPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const issue = editions.find((item) => item.date === date);
  if (!issue) {
    return (
      <main>
        <SiteHeader />
        <section className="empty">
          <h1>記事が見つかりません</h1>
          <Link href="/">記事一覧へ戻る</Link>
        </section>
        <SiteFooter />
      </main>
    );
  }
  return (
    <main>
      <SiteHeader />
      <div className="back-link">
        <Link href="/">← 記事一覧へ</Link>
      </div>
      <IssueArticle issue={issue} />
      <SiteFooter />
    </main>
  );
}
