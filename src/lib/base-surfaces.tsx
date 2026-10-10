import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BaseProvider } from 'baseui';
import {
  HeaderNavigation,
  StyledNavigationList,
  StyledNavigationItem,
  ALIGN,
} from 'baseui/header-navigation';
import { Button, KIND, SIZE } from 'baseui/button';
import { Tag, KIND as TAG_KIND, SIZE as TAG_SIZE } from 'baseui/tag';
import { Card } from 'baseui/card';
import { Breadcrumbs } from 'baseui/breadcrumbs';
import { StyledLink } from 'baseui/link';
import {
  LabelSmall,
  ParagraphSmall,
  ParagraphMedium,
  HeadingSmall,
  HeadingXSmall,
  HeadingXXLarge,
  DisplayMedium,
} from 'baseui/typography';
import { Grid, Cell, BEHAVIOR } from 'baseui/layout-grid';
import { Table, SIZE as TABLE_SIZE } from 'baseui/table-semantic';
import { Input } from 'baseui/input';
import { Provider } from 'styletron-react';
import { Server } from 'styletron-engine-monolithic';
import { baseTheme } from './base-theme';
import { sitePath } from './issues';

// Non-interactive official components are emitted as HTML + Styletron CSS.
// Distinct prefixes isolate static sheets from one another and the client island.
export function renderSurface(prefix: string, content: ReactNode) {
  const engine = new Server({ prefix });
  const html = renderToStaticMarkup(
    <Provider value={engine}>
      <BaseProvider theme={baseTheme}>{content}</BaseProvider>
    </Provider>,
  );
  return {
    html,
    css: engine
      .getStylesheets()
      .map((sheet) => sheet.css)
      .join('\n'),
  };
}
export function renderHeader(home: string) {
  return renderSurface(
    'md-header-',
    <HeaderNavigation
      aria-label="サイト内ナビゲーション"
      overrides={{
        Root: {
          style: { flexWrap: 'wrap', rowGap: baseTheme.sizing.scale300 },
        },
      }}
    >
      <StyledNavigationList $align={ALIGN.left}>
        <StyledNavigationItem $style={{ paddingLeft: 0 }}>
          <a
            className="site-title"
            href={home}
            aria-label="Market Daily 株の観測日誌"
          >
            <span className="brand-symbol" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="brand-name">
              <strong>Market Daily</strong>
              <small>株の観測日誌</small>
            </span>
          </a>
        </StyledNavigationItem>
      </StyledNavigationList>
      <StyledNavigationList $align={ALIGN.center} />
      <StyledNavigationList $align={ALIGN.right}>
        <StyledNavigationItem
          $style={{ paddingLeft: baseTheme.sizing.scale300 }}
        >
          <Button $as="a" href={home} kind={KIND.tertiary} size={SIZE.compact}>
            記事一覧
          </Button>
        </StyledNavigationItem>
        <StyledNavigationItem className="header-github">
          <StyledLink href="https://github.com/shimabukuromeg/market-daily">
            GitHub
          </StyledLink>
        </StyledNavigationItem>
      </StyledNavigationList>
    </HeaderNavigation>,
  );
}
export function renderLatest(
  issue: { title: string; summary: string; date: string },
  href: string,
) {
  return renderSurface(
    'md-latest-',
    <Card
      title={issue.title}
      action={<span>最新号を読む ↗</span>}
      overrides={{
        Root: {
          props: { $as: 'a', href },
          style: {
            display: 'block',
            textDecoration: 'none',
            color: baseTheme.colors.contentPrimary,
            ':hover': { backgroundColor: baseTheme.colors.backgroundSecondary },
          },
        },
        Title: { props: { $as: 'h2' } },
      }}
    >
      <div className="latest-metadata">
        <LabelSmall as="time" dateTime={issue.date}>
          {issue.date}
        </LabelSmall>
        <Tag
          closeable={false}
          kind={TAG_KIND.neutral}
          size={TAG_SIZE.small}
          noMargin
        >
          最新号
        </Tag>
      </div>
      <ParagraphSmall as="p" color="contentSecondary">
        {issue.summary}
      </ParagraphSmall>
    </Card>,
  );
}
export function renderBreadcrumbs(home: string, date: string) {
  return renderSurface(
    'md-breadcrumbs-',
    <Breadcrumbs aria-label="現在のページ">
      <StyledLink href={home}>記事一覧</StyledLink>
      <span aria-current="page">{date}</span>
    </Breadcrumbs>,
  );
}

export function surfaceMarkup(surface: { html: string; css: string }) {
  return `<style>${surface.css}</style>${surface.html}`;
}
export function renderTopics(topics: string[]) {
  return renderSurface(
    'md-topics-',
    <div className="topic-tags" aria-label="観測したテーマ">
      {topics.map((topic) => (
        <StyledLink
          key={topic}
          href={`${sitePath()}?theme=${encodeURIComponent(topic)}#editions`}
          aria-label={`${topic}の過去号を探す`}
          $style={{ textDecoration: 'none' }}
        >
          <Tag
            closeable={false}
            kind={TAG_KIND.neutral}
            size={TAG_SIZE.small}
            noMargin
          >
            {topic} ↗
          </Tag>
        </StyledLink>
      ))}
    </div>,
  );
}
export function renderRichText(
  kind: 'h1' | 'h2' | 'h3' | 'p',
  html: string,
  id?: string,
) {
  const Component =
    kind === 'h1'
      ? HeadingXXLarge
      : kind === 'h2'
        ? HeadingSmall
        : kind === 'h3'
          ? HeadingXSmall
          : ParagraphMedium;
  return renderSurface(
    `md-type-${kind}-`,
    <Component
      as={kind}
      id={id}
      $style={kind === 'p' ? { lineHeight: 1.9 } : {}}
      dangerouslySetInnerHTML={{ __html: html }}
    />,
  );
}
export function renderThemeTable(
  data: { label: string; posts: number; authors: number }[],
) {
  return renderSurface(
    'md-table-',
    <Table
      columns={['テーマ', '投稿数', '投稿者数']}
      data={data.map((row) => [
        row.label,
        row.posts.toLocaleString('ja-JP'),
        row.authors.toLocaleString('ja-JP'),
      ])}
      size={TABLE_SIZE.compact}
      overrides={{
        Table: { props: { 'aria-label': 'テーマ別の集計値' } },
        TableHeadCell: { props: { scope: 'col' } },
      }}
    />,
  );
}
export function renderArticleGrid(
  html: string,
  headings: { id: string; title: string }[],
) {
  return renderSurface(
    'md-article-grid-',
    <Grid
      behavior={BEHAVIOR.fluid}
      gridMargins={0}
      gridGutters={[16, 24, 48]}
      gridMaxWidth={1136}
    >
      <Cell span={[4, 8, 4]} order={[0, 0, 1]}>
        <aside className="article-rail">
          <details className="article-toc" open>
            <summary>この記事の目次</summary>
            <nav aria-label="この記事の目次">
              <LabelSmall>IN THIS EDITION</LabelSmall>
              <ol>
                {headings.map((heading, index) => (
                  <li key={heading.id}>
                    <a href={`#${heading.id}`}>
                      <span aria-hidden="true">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {heading.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </details>
          <p>
            話題の量と、買う根拠を分ける。
            <br />
            次に確認する数字まで読む。
          </p>
        </aside>
      </Cell>
      <Cell span={[4, 8, 8]} order={[1, 1, 0]}>
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
      </Cell>
    </Grid>,
  );
}
export function renderArchiveSearch() {
  return renderSurface(
    'md-search-',
    <Input
      type="search"
      placeholder="銘柄名・キーワード・日付で探す"
      aria-label="観測日誌を検索"
      overrides={{ Input: { props: { id: 'archive-search' } } }}
    />,
  );
}
export function renderArchiveHero(
  count: number,
  date: string,
  topics: { label: string; posts: number; authors: number }[],
) {
  const max = Math.max(...topics.map((topic) => topic.posts), 1);
  return renderSurface(
    'md-hero-',
    <Grid
      behavior={BEHAVIOR.fluid}
      gridMargins={0}
      gridGutters={[16, 24, 48]}
      gridMaxWidth={1136}
    >
      <Cell span={[4, 8, 8]}>
        <div className="hero-copy">
          <LabelSmall>MARKET DAILY / 観測日誌</LabelSmall>
          <DisplayMedium
            as="h1"
            id="archive-title"
            $style={{ textWrap: 'balance' }}
          >
            話題を追う。
            <br />
            買う条件を考える。
          </DisplayMedium>
          <ParagraphMedium color="contentSecondary">
            市場の話題を、出典から読み解く。
            <br className="desktop-break" />
            次に確かめる数字まで整理する観測日誌。
          </ParagraphMedium>
          <div className="hero-action">
            {count > 0 && (
              <Button $as="a" href={sitePath(`${date}/`)} size={SIZE.compact}>
                最新号を読む ↗
              </Button>
            )}
          </div>
          <div className="hero-footnote">
            <span>{count} EDITIONS</span>
            <span>最新観測 / {date}</span>
          </div>
        </div>
      </Cell>
      <Cell span={[4, 8, 4]}>
        <figure className="observation-map">
          <figcaption>
            <span>観測の広がり</span>
            <span>{date.slice(5).replace('-', ' / ')}</span>
          </figcaption>
          <p className="visually-hidden">
            {topics
              .map((topic) => `${topic.label} ${topic.posts}件`)
              .join('、')}
          </p>
          <div className="signal-field" aria-hidden="true">
            {topics.map((topic, index) => (
              <div
                key={topic.label}
                style={{ height: `${(topic.posts / max) * 120}px` }}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
              </div>
            ))}
          </div>
          <ol>
            {topics.slice(0, 3).map((topic, index) => (
              <li key={topic.label}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <span>{topic.label}</span>
                <strong>{topic.posts}</strong>
              </li>
            ))}
          </ol>
          <p>
            最新号のテーマ別投稿数。
            <br />
            市場の騰落や推奨順位ではありません。
          </p>
        </figure>
      </Cell>
    </Grid>,
  );
}

export function renderMetrics(data: string[][]) {
  return renderSurface(
    'md-metrics-',
    <dl className="metrics" aria-label="収集データの概要">
      {data
        .filter(([label, value]) => label && value)
        .map(([label, value]) => (
          <div key={label}>
            <LabelSmall as="dt" color="contentSecondary">
              {label}
            </LabelSmall>
            <HeadingSmall as="dd">{value}</HeadingSmall>
          </div>
        ))}
    </dl>,
  );
}

export function renderThemeFilters(topics: { label: string; count: number }[]) {
  const button = (
    { label, count }: { label: string; count: number },
    index: number,
  ) => (
    <Button
      key={label}
      kind={KIND.secondary}
      size={SIZE.compact}
      aria-pressed={index === 0}
      data-theme-filter={index === 0 ? '' : label}
    >
      {label}
      {count > 0 && <span className="theme-edition-count">{count}号</span>}
    </Button>
  );
  const choices = [{ label: 'すべて', count: 0 }, ...topics];
  return renderSurface(
    'md-filters-',
    <fieldset className="theme-filter-group">
      <legend className="visually-hidden">観測テーマで絞り込む</legend>
      <div className="theme-filter-buttons">
        {choices.slice(0, 6).map(button)}
      </div>
      {choices.length > 6 && (
        <details className="more-themes">
          <summary>ほかのテーマを見る（{choices.length - 6}件）</summary>
          <div className="theme-filter-buttons">
            {choices.slice(6).map((choice, index) => button(choice, index + 6))}
          </div>
        </details>
      )}
    </fieldset>,
  );
}

export function renderArchiveReset() {
  return renderSurface(
    'md-reset-',
    <Button kind={KIND.tertiary} size={SIZE.compact} id="archive-reset">
      絞り込みを解除
    </Button>,
  );
}
