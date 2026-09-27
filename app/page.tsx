import ReactMarkdown from 'react-markdown';
import issues from '../lib/issues.json';
type Issue = { date: string; title: string; summary: string; markdown: string; posts: number; coverage: string };
export default function Home() {
  const editions = issues as Issue[];
  return <main>
    <header className="masthead"><div className="eyebrow">MARKET WATCH / CALENDAR DAY JST</div><h1>株の観測日誌<span>Market Daily</span></h1><p>選んだ発信者から、市場の話題と見方を読む。</p></header>
    {editions.length === 0 ? <section className="empty"><span className="edition">創刊準備号</span><h2>次の相場を考える、毎晩の一枚。</h2><p>初回の記事を準備しています。公開後は、今日の要点、注目銘柄、見方が分かれる論点を出典とともに掲載します。</p></section> : <>
    <nav aria-label="バックナンバー">{editions.map(i=><a key={i.date} href={'#issue-'+i.date}>{i.date}</a>)}</nav>
    {editions.map((i,index)=><article key={i.date} id={'issue-'+i.date}><div className="issue-meta"><span>{index===0?'最新号':'バックナンバー'}</span><time>{i.date}</time><span>{i.posts}投稿を確認</span></div><h2>{i.title}</h2><p className="lede">{i.summary}</p><p className="coverage">{i.coverage}</p><div className="prose"><ReactMarkdown>{i.markdown}</ReactMarkdown></div></article>)}
    </>}
    <footer><strong>Market Daily</strong><p>選んだ発信者の観測と意見を整理した記録です。市場全体の総意を示すものではありません。要約はAIで編集し、確認後に公開します。</p><a href="https://github.com/shimabukuromeg/market-daily">記事・編集履歴 ↗</a></footer>
  </main>;
}
