# Base Web redesign

## References and version

- https://baseweb.design/ (documentation and desktop reference, 2026-10-11)
- https://github.com/uber/baseweb (MIT)
- Installed `baseui` 18.2.0. Source of truth is the installed LightTheme, not main.
- Astro 5 + @astrojs/react 4 + React 18.3.1; Styletron Server for static surfaces and Client for sharing.

## UI mapping

| Surface                          | Implementation                                                                  | Reason                                                          |
| -------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Share controls                   | Official BaseProvider + Button (primary/secondary, compact)                     | Standard interaction and focus states                           |
| Masthead                         | Official HeaderNavigation, NavigationList/Item, tertiary Button, and StyledLink | Rendered at build time; no navigation JavaScript                |
| Older editions                   | Semantic Astro links with installed theme tokens                                | Preserve multi-line summaries and full-row links                |
| Latest edition                   | Official Card, neutral Tag, LabelSmall, and ParagraphSmall                      | Standard light surface, padding, border, radius, and typography |
| Article location                 | Official Breadcrumbs and StyledLink                                             | Static navigation with the current date                         |
| Article                          | Astro + original Markdown renderer                                              | Preserve nested content, embeds, anchors, and static reading    |
| Post previews / metrics / charts | Custom layout with semantic tokens                                              | Content-specific geometry                                       |
| OGP                              | Satori layout with installed theme colors/radii                                 | React interactive components cannot render in Satori            |

## Design rules

White and black form the reading hierarchy. Blue marks focus, link hover, and one neutral data series. Neutral chips indicate metadata. Latest is an editorial distinction, not a positive market signal. Spacing follows Base Web's 4/8/12/16/24/32/40/48/64/96px scale. Headlines use semantic HeadingSmall through DisplayMedium variables resolved from the installed theme. createLightTheme overrides only non-mono font families; all typography sizes, weights, and line heights come from LightTheme. System fonts provide Japanese glyphs; no Uber brand fonts or artwork are copied. Japanese body text uses 1.9 line-height. Reading width (720px) and site width (1200px) are content constraints.

Static official components use renderToStaticMarkup with Styletron Server CSS. Prefixes isolate each sheet from the sharing island. Public overrides change the header wrapping, Card root to an anchor, Card heading to h2, and Card hover background; component defaults supply the rest.

The share island mounts only in the browser so Styletron does not emit unstyled SSR buttons. Static X and permalink links remain available during loading and without JavaScript. Copy success/errors are announced through output; failure directs users to copy the address bar. Article URLs, canonical/OG metadata, content pipeline and X embeds are retained.

## Validation

- Astro check: no errors, warnings, or hints (after the component alignment).
- Lint for src, Astro config, and OGP generator: passed. Repository-wide lint still flags existing collect.mjs prefer-const and unawaited test() calls.
- Production build: all 14 pages and 14 OGP images generated.
- Existing tests: 8 passed.
- Browser: archive and latest article inspected at desktop and 390px; archive and article at 320px, with no horizontal overflow. Official Card navigation and the new header/breadcrumbs were verified; the narrow header may wrap. Copy success and related-post disclosure verified. Real X embeds loaded.
- Share island adds approximately 101KB gzip of React/Base Web JavaScript to article pages; archive is rendered statically with a small native search script.
- Package installation reports legacy transitive peer-range warnings from Base Web dependencies; the chosen React 18 satisfies Base Web's own peer range.

## Keep these content-specific choices

The site logo, archive arrangement, Markdown renderer, metric grid, and chart geometry remain custom. The body uses a 1.9 line height for Japanese reading, while headings and summaries use official line heights. Site and reading widths are content constraints. The X iframe controls its own UI. These are deliberate exceptions; they do not require custom replacements for available Base Web controls.

## Quality iterations (2026-10-11)

The quality references are [Awwwards evaluation](https://www.awwwards.com/about-evaluation/), [Webby judging criteria](https://www.webbyawards.com/judging-criteria/), and [FWA’s description of creative excellence](https://thefwa.com/FWA25/25.html). These guide design, navigation, content, inclusion, functionality, originality, and technical care. They are not a certification or a prediction of an award.

Three review rounds improved the editorial hierarchy, useful interaction, and final detail. The archive now has a real-data observation graphic, an immediate latest-edition Button, and an official Input for title, summary, and date search. Articles use official Typography, neutral theme Tags, a responsive LayoutGrid with a sticky desktop TOC, official Table for chart values, and official Accordion for source links. Previous/next editions support continued reading. DataTable and Tabs are reserved for actual comparison and alternate-view requirements rather than inserted without a purpose.

Static source disclosures and links survive without JavaScript. X previews load their external script only after an explicit disclosure. Charts share a consistent scale, keep small values proportional, and show numeric labels outside bars. Mobile TOCs collapse initially; keyboard disclosure, focus feedback, and reduced-motion styling remain available.

The final review caught a Typography selector that did not reach through the BaseProvider wrapper; the mobile title now follows the intended HeadingMedium scale. Desktop, 390px, and 320px layouts were reviewed with no horizontal overflow. Search matches, no-results, reset, Accordion click/Enter, source preservation, and lazy X loading were exercised. `npm run verify:ui` checks all 13 articles, 206 source links, unique heading anchors, TOC targets, static fallback disclosures, table labels, metadata, and archive routes. Article JavaScript is approximately 101KB gzip shared across React, Base Web, sharing, and source enhancement; archive controls use a small native script without hydrating React.

The logo, observation graphic, archive rows, article composition, and chart geometry are custom; controls and text foundations use the installed Base Web definitions. Award-level originality and overall experience remain an external editorial judgment. No fabricated numeric self-score is assigned.

## Chart and metrics follow-up

Theme counts are shown as two separate bar-chart panels in the same theme order, stacked on mobile. Each panel scales to its own maximum, explicitly disclosed; lengths should only be compared within a panel. Counts and people have separate units. Overlapping classifications are not represented as pie-chart shares. All exact values remain available in the official Table.

Collection metrics now use an unboxed semantic definition list with official LabelSmall and HeadingSmall. CSS controls layout, dividers, and spacing only; it no longer substitutes typography sizes or mimics an official Card. This reduces competing surfaces above the article.

## Editorial quality review and exploration (follow-up)

A new review identified a weak cross-edition journey. Official secondary Buttons now filter archived editions by the exact theme labels in their source data, and combine with keyword/date search. Article Tags link to that theme’s archive URL. Selected themes are announced in the result status and stored in the URL; nested theme disclosures open on an incoming selected theme. The first iteration exposed all 20 labels, which overwhelmed the archive. The second iteration exposes the five most frequent labels plus All and places remaining labels in a keyboard-accessible disclosure. Existing classification differences are preserved rather than silently merged.

The hero’s wording now communicates the publication’s editorial point of view: follow the conversation and consider buying conditions, with sources and the next numbers to verify. All values behind the decorative hero bars are also available to screen readers. Repeated identical Styletron sheets are removed within each rendered article without changing class prefixes or HTML content.

| Quality criterion                  | Review result and evidence                                                                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editorial hierarchy and voice      | Hero states the content’s purpose; latest-edition entry remains primary; metrics are subordinate to reading.                                                                                      |
| Useful interaction and navigation  | Article-to-theme journey, keyword+theme intersection (1 result), empty state (0), and All reset (13) exercised in browser.                                                                        |
| Visual consistency                 | Base Web controls, theme tokens, official Typography; selected filters visibly outlined and expose aria-pressed.                                                                                  |
| Responsive layout                  | 1280, 390 and 320px: no horizontal overflow; mobile filters wrap; incoming hidden selection opens disclosure.                                                                                     |
| Content integrity                  | All 13 editions and 206 source links verified after build; static disclosures and article bodies retained.                                                                                        |
| Performance care                   | Archive uses static React-rendered HTML plus native filtering; duplicate article CSS eliminated, third-party previews remain opt-in. No Core Web Vitals claim made.                               |
| Originality and overall experience | Editorial positioning and source-driven theme exploration strengthened. Actual award selection and user preference require independent evaluation; no award score inferred from technical checks. |

This is an evidence-based internal review, not an assertion that every external jury criterion has been met. Remaining external validation includes audience usability sessions, cross-browser testing beyond the available browser, and measured field performance.

## 10-point self-review: three bounded iterations

Requested by the user: score the work out of ten, improve toward ten, stop if returns diminish, and do at most three iterations. This section replaces the earlier no-self-score policy for this user-requested internal review. Scores are subjective judgments against this project’s brief, not award probabilities, jury scores, or measurements. Five criteria are equally weighted. A ten requires exceptional, consistent execution across all five, not merely passing technical checks.

| Stage       | Hierarchy | Text/charts | Interaction | Distinctiveness | System consistency | Mean |
| ----------- | --------: | ----------: | ----------: | --------------: | -----------------: | ---: |
| Before      |       7.0 |         7.0 |         8.0 |             7.0 |                8.0 |  7.4 |
| Iteration 1 |       8.4 |         7.7 |         8.0 |             7.5 |                8.4 |  8.0 |
| Iteration 2 |       8.7 |         8.7 |         8.0 |             7.8 |                8.8 |  8.4 |
| Iteration 3 |       8.7 |         8.7 |         9.0 |             7.8 |                8.8 |  8.6 |

1. Condition lists had little hierarchy. The original hypothesis, buy, profit-taking, loss-cutting and next-action labels now form structured rows, horizontal on desktop and vertical on mobile. A selective Markdown renderer preserves ordinary lists, nested tokens, and links. Generated output verifies the number of transformed condition lists against source Markdown in every edition.
2. Company metadata was squeezed into one bold paragraph and chart labels were too small. The current judgment is separated from provenance/type metadata, and chart labels use the Base Web LabelSmall scale. Browser review discovered full-width whitespace creating blank flex rows; only separators between metadata strong elements were removed and the same layout was reviewed again.
3. Search and theme filters had no single recovery action. An official tertiary Button now clears both, removes the theme URL parameter, announces the full result count, and restores focus to the search input. Keyboard Enter reset verified: 13 results, empty input, archive-search focused.

Review conditions: latest article and archive; desktop1280, mobile390 and minimum320; no horizontal overflow. Graph number labels and condition reading structure reviewed in screenshots. Type/lint/build and all-edition content integrity verified.

Stopping reason: the requested maximum of three iterations was reached and gains narrowed from 0.6 to 0.4 to 0.2. Residual limitations: the visual identity remains restrained and less distinctive than exceptional creative editorial work; long source-heavy hypotheses still impose reading effort; broader Japanese-title/data combinations and independent audience evaluation would strengthen confidence. The final score is deliberately below ten.

## Motion polish

Motion uses installed Base Web timing200 (200ms), timing150 (150ms), and easeOutQuinticCurve. Official Accordion transitions use public Content, ContentAnimationContainer and ToggleIcon overrides with no added delay. Native theme, TOC and table disclosures progressively animate height when the browser supports interpolate-size and discrete transitions; other browsers retain instant native disclosure. X iframe previews retain native opening to avoid animating a changing external layout.

Theme-selection and reset feedback use a 200ms opacity/2px movement after immediate result updates, with no delay in accessibility status or interaction. Keyword typing does not trigger repeated animation. Superseded feedback is cancelled. A reduced-motion preference skips feedback, cancels feedback already running, and removes disclosure/TOC/selection transitions. There is no number counting, scroll-triggered content hiding, or initial article entrance.

## 判断の型の説明（2026-10-11）

記事の「型：業績」を「判断の型：業績 ⓘ」へ変更。型名を押すと `/decision-types/` の該当説明へ移動する。業績＋テーマなどの併記はそれぞれをリンクにした。分類・本文の意味は保持し、説明の定義は `src/lib/decision-types.ts` にまとめた。

採用部品は Base Web 18.2.0 の StyledLink と Typography。公式 Link ドキュメント（https://baseweb.design/components/link/）と導入版の `baseui/link` のAPI・スタイルを確認した。リンクは静的描画し、JavaScriptを追加しない。インラインのリンクは公開ThemeProviderでテーマを接続し、BaseProviderのブロック要素が段落に入り込むことを避ける。説明ページは通常のsectionとnavで構成し、余白・境界・フォーカスは既存トークンを使う。

内部評価は影響箇所だけを対象とする主観的な5軸評価（情報階層／文字／操作／独自性／システム整合）。開始は5／7／3／5／8、平均5.6。レビュー1回で説明導線とページを追加し、表示時に見つかったラベルとリンクの改行を修正して再確認した。最終は8／8／8／6／9、平均7.8。説明への移動と型の識別は改善したが、別ページに移動する手間は残る。追加の全面改修の効果は小さいため1回で終了。

本番ビルドで記事と説明ページ、複数型の旧号を確認。1280／768／390／320pxで確認した画面に横はみ出しなし。Enterによる説明への移動、フォーカス表示を確認。新規アニメーションはない。hoverの実機確認、動きを減らす設定の実機検証は未実施。check・変更箇所oxlint・build・verify:ui成功。クライアントバンドルのファイル名・サイズは変更前と同じ。説明ページはハイドレーションなし。既存の売買条件レイアウトにも「取り上げた理由」を追加した。

最終画面：![判断の型の説明リンク](screenshots/decision-types.png)

### 元メモとの再照合

元メモ「株の出口戦略と買いの理由のパターン」をブラウザで再読し、7型の説明を買う理由・確認材料・利確条件・損切り条件に分けた。移動平均線反発は「平均線付近での反発」から「平均線を大きく下回った価格の戻り」へ訂正。業績型の利確は成長期待の織り込み、損切りは業績前提の崩れとして区別した。編集プロンプトにも成功時と失敗時の出口を別々に書く指示を追加した。説明ページ内に元メモへの参照リンクを設けた。文章のみの改訂で、追加のデザイン採点は実施していない。check・oxlint・build・verify:ui成功、実画面で両条件の表示を確認。

![利確と損切りの説明](screenshots/decision-types-exits.png)

## OGP follow-up

OGP now uses a flat white composition with the same three-bar masthead mark, black editorial headline, muted summary/date, thin dividers and a small blue accent. Fonts and spacing resolve from installed Base Web typography/sizing. Generic sharing uses the current two-line editorial statement; edition sharing preserves the full title, summary, date and collected-post count. Satori/resvg render at 1200×630 with Japanese Noto Sans JP; no browser-only Base Web component is hydrated for OGP.

Internal review: baseline 7.2/10 → first iteration 8.6/10 → final 8.7/10. First iteration aligns hierarchy and branding, verified on the generic and longest-title images. Second iteration removes the generic image’s repeated headline from its footer; latest-edition inspection also caught oversized text overlapping its summary. Edition and generic headline scales are now separate and were rechecked. Stop after two iterations because remaining improvements are small; scores reflect internal visual judgment, not award predictions. All 14 outputs are regenerated by the existing build pipeline.

## トピックのAI深掘り導線（2026-10-11）

株価チャートリンクの直下に「AIで深掘り」を追加。Base Web 18.2のButton（secondary / tertiary・compact）、ParagraphSmall、Textareaを静的描画する。開閉だけはネイティブdetailsを公式トークンで構成し、読書を妨げず、追加のReact hydrationを避ける。質問はセクションのMarkdown全文（出典・リンク・判断条件を含む）、観測日、固定リンクを保持する。参考サイト https://taxnap.com/ の実装と同じChatGPT `/?q=` / Claude `/new?q=` を使用する。ログイン状態やサービス側の変更による初期入力の差は保証しない。URLが12,000文字を超える場合は全文を切らず、コピーと通常のAIリンクに切り替える。この閾値はサービスの公式上限ではなく互換性を優先した判断。

局所レビューは1回。変更前の該当箇所を情報階層8・文字8・操作5・独自性7・整合9（平均7.4）、改善後を8・9・8・7・9（平均8.2）とした。主観的な内部評価。コピー・全文確認の逃げ道、狭幅の折り返し、公式Textareaとトークンの整合を改善して再確認した。今回の機能範囲で追加装飾の効果が小さいため停止。残る制約は外部AIの初期入力・ログイン後の引継ぎの実機確認。

本番ベースパスのビルドで1280 / 768 / 390 / 320pxの横はみ出しを確認。株価の直下、Enterによるdetailsの開閉、全文確認、コピー成功を確認。追加アニメーションなし（動きを減らす設定の実機切替は未実施）。`npm run check`、変更箇所oxlint、本番build、verify:ui、既存8テストが成功。verify:uiに全13記事のAI質問のセクション全文・観測日・リンク・長文フォールバック検証を追加。画面記録：`/private/tmp/market-daily-ai-mobile.png`（390px）。

## 最新号と過去号の一覧表示を統一（2026-10-15）

最新号だけに使っていたBase Web Cardの分岐を削除し、全18号を既存のissue-card行で描画する。日付・投稿数・見出し・概要・読むリンクの順序、余白、境界線、hoverを共通化した。先頭の日付と新しい順の表示、およびヒーローの最新号リンクで最新号を識別できる。使われなくなったrenderLatestと専用CSSも削除した。

既存の一覧行は静的なa要素で構成する独自UIで、公式CardをCSSで変形せず、そのまま再利用した。新規部品・トークン・JavaScriptは追加していない。検索・テーマ分類のdata属性、全記事URLと内容は保持した。

今回の局所的な主観評価（情報階層／文字・図表／操作／独自性／整合）は変更前6／7／8／7／6（平均6.8）、変更後8／8／8／7／8（平均7.8）。最新号だけ情報順序と囲いが異なる問題を修正し、同じPC幅で再確認した。レビュー1回で統一できたため終了。残る制約は既存の一覧行のhover演出を維持していること。

本番ビルドで1280／768／390／320pxの横はみ出しなし。最新号を含む検索、0件表示、解除、Enterでの記事遷移を確認。新規モーションなし。hover・動きを減らす設定の実機切替は未確認。check・変更箇所oxlint・build・diffチェック成功。verify:uiは10月14日号の日本語PDF出典URLの照合で失敗した。対象記事とレンダラーは今回変更しておらず、生成HTMLに同じURLがエンコードされて残ることを確認した。

![統一した記事一覧](screenshots/archive-unified-desktop.png)

## 市場テーマを初期状態で折りたたむ（2026-10-15）

日刊号の「市場で広がったテーマ」は見出しを保持し、直下の「テーマ別の集計と投稿を見る」でグラフ・説明・出典をまとめて開く。初期表示は閉じる。個別候補を先に読み進めやすくするための変更で、テーマ集計や元の出典は省略しない。目次・ハッシュリンクから該当見出しへ移動した場合は開く。同じ目次リンクを再度押した場合も開く。

静的details/summaryと既存トークンで構成。既存の折りたたみと同様、JavaScriptなしで開閉できるようにし、追加のReact hydrationやアニメーションは導入しない。目次との連携のみ既存のSourceEnhancementへ追加した。

局所的な主観評価（情報階層／文字・図表／操作／独自性／整合）は変更前6／8／7／7／8（平均7.2）、変更後8／8／8／7／8（平均7.8）。本番ビルドの同じ記事で占有量を比較し、1回で終了。残る弱点は、図表を見比べるには明示的に開く必要があること。

全18号の初期閉状態と候補セクションまでに閉じタグがあることを生成HTMLで確認。PCと390pxで見え方を確認し、1280／768／390／320pxで横はみ出しなし。クリック・Enterによる開閉、目次からの自動展開、フォーカス表示を確認。hover・動きを減らす設定の実機切替は未確認。check・変更箇所oxlint・build成功。verify:uiは引き続き今回未変更の10月14日号のURLエンコード照合で停止する。

![折りたたんだ市場テーマ](screenshots/market-themes-collapsed.png)

## AI深掘り操作を常時表示（2026-10-15）

外側のtopic-aiをdetailsから見出し付きsectionへ変更し、ChatGPT／Claudeリンクと質問のコピーを初期表示する。Base Web LabelSmallをh3として使い、既存Button・ParagraphSmall・Textareaは保持。質問全文の確認だけはネイティブdetailsを残す。質問の内容・URL・長文時のコピー経由の動作は変更しない。

局所的な主観評価（情報階層／文字・図表／操作／独自性／整合）は変更前7／8／6／7／8（平均7.2）、変更後8／8／8／7／8（平均7.8）。操作の発見に開閉が必要だった問題を1回で修正。終了理由は依頼範囲の改善が完了したこと。常時表示の分だけ高さが増える点は残る。

本番ビルドでリンク・コピー操作の常時表示、コピー成功の通知、Enterによる質問全文の開閉を確認。1280／768／390／320pxで横はみ出しなし。新規モーション・hydrationなし。外部AIへの質問送信、hover・動きを減らす設定の実機切替は未実施。check・変更箇所oxlint・build成功。verify:uiは既存の10月14日号の日本語出典URL照合で停止した。

![常時表示のAI深掘り](screenshots/topic-ai-visible.png)

## 投稿の開閉導線をプレビューに統一（2026-10-15）

「引用元の投稿を確認」と「投稿プレビューを表示」の二重表示をやめ、件数付きのプレビュー開閉だけを残した。プレビューの静的HTMLには投稿の要旨と元投稿リンクを残し、JavaScript無効・外部通信不可でも参照できる。X widgetsは開いたときだけ読み込む。使わなくなったReact Accordionのhydration処理と専用CSSを削除した。既存のネイティブdetailsとトークンを再利用し、新規部品・モーションは追加していない。

局所的な主観評価（情報階層／文字・図表／操作／独自性／整合）は変更前6／8／7／7／8（平均7.2）、変更後8／8／8／7／8（平均7.8）。1回で重複した選択肢を解消できたため終了。元投稿へ直接進む場合にも開く必要がある点は残る。

本番ビルドで初期状態のXスクリプトなし、Enterでの開閉、開いた後の実際のXプレビュー表示、フォーカス表示を確認。390／320pxで横はみ出しなし。全18号63箇所の単一開閉と静的元投稿リンクを生成HTMLで確認した。check・変更箇所oxlint・build成功。verify:uiは既存の日本語PDF出典URL照合で引き続き停止する。hover・動きを減らす設定の実機切替は未確認。

![投稿プレビューだけに統一](screenshots/source-preview-only.png)

### 公開前の統合検証

日本語を含む出典URLについて、生のURLに加えてURL標準のエンコード後のhrefも照合するようverify:uiを修正した。リンク欠落を許容せず、同じ参照先の表記差だけを受け入れる。これにより上記で未解決だった検証エラーは解消。最終状態で型検査、変更箇所oxlint、既存8テスト、本番ベースパス付きビルド、verify:ui（18記事・280出典リンク・53型リンク・1深掘り記事）すべて成功した。

## 理解度チェックの一覧導線（2026-10-17）

共通ヘッダーに「理解度チェック」を追加し、`/quizzes/` にクイズのある日刊号だけを新しい順に表示する。各行は日付・問題数・制限時間・元記事の見出しと概要を示し、その日の `/YYYY-MM-DD/quiz/` へ進む。新しい号は記事の `quiz` ブロックから自動で一覧に加わる。記事本文と個別クイズのURLは変えない。

ヘッダーは導入済み Base Web 18.2.0 の HeaderNavigation、StyledNavigationItem、tertiary Button を公開APIで使用。320pxで3項目目が5pxはみ出したため、隣接項目の左余白を既存テーマの `scale300` に揃えた。一覧は既存の静的 `issue-card` と Base Web テーマトークンを再利用し、新しい hydration やモーションは追加しない。

局所的な主観評価（情報階層／文字・図表／操作／独自性／整合）は変更前 6／8／5／7／8（平均6.8）、一覧追加後 8／8／7／7／8（平均7.6）、狭幅調整後 8／8／9／7／9（平均8.2）。1回目はクイズが記事末尾からしか見つからない問題を解消したが320pxで横はみ出し、2回目に公式Style propで余白を修正し同条件で再確認した。依頼された導線が安定したため2回で終了。クイズのある過去号は現時点で1件なので、一覧の密度は今後の追加で変わる。

Pagesベースパス付きビルドと `verify:ui` で一覧と全クイズへのリンクを確認。1280／768／390／320pxで横はみ出しなし。キーボードのEnterでヘッダー→一覧→クイズへ移動でき、JavaScript無効でも問題と解説を開ける。hoverと動きを減らす設定の実機切替は未実施。

![理解度チェック一覧（モバイル）](screenshots/quiz-archive-mobile.png)

![理解度チェック一覧（デスクトップ）](screenshots/quiz-archive-desktop.png)
