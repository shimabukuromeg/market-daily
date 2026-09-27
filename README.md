# Market Daily — 株の観測日誌

Xで選んだ発信者の投稿を収集し、Codexで日刊ニュースレターを編集する。記事はMarkdownでレビューし、PRをmainにマージするとGitHub Pagesへ公開する。収集元のリストIDとURLは端末内だけに保存する。

## 導入状態

収集の単体テスト・静的サイトのビルド・型検査は確認済み。Xログインと実データ収集は未確認。初期PRのマージと初回収集の確認後に、停止中の毎晩22時の定期タスクを有効化する。

## この端末で使う

Node.js 22.13以上、Chrome、GitHub CLIへのログインが必要。

```sh
npm ci
mkdir -p .local
cp config.example.json .local/config.json
# .local/config.json の listId を端末内で設定する
npm run browser
npm run relay
npm run collect -- 2026-09-27
```

`npm run browser` はリモートデバッグを有効にした専用Chromeを開く。初回だけ、そのChromeでXにログインする。普段使いのブラウザプロファイルは変更しない。`npm run relay` は `twitter-api-safe-relay` をローカルホストだけで起動し、CDPで専用Chromeへ接続する。収集処理は、最初のリスト応答から現在のAPIパラメータを検出し、その後のページネーションをrelay経由で行う。

収集結果は `.local/collections/`、ブラウザ認証は `.local/x-profile/` に保存する。どちらもGit対象外。過去日は日本時間0時から翌日0時まで、当日は0時から実行時刻までを対象にする。ページ上の現行リストAPIリクエストを検出し、カーソルで開始時刻まで遡る。ページ数上限、読めない投稿、繰り返しカーソルは不完全取得として扱う。削除投稿やアクセスできない投稿まで網羅する保証はない。

## 編集・公開

Codexアプリで `prompts/daily.md` に従って編集する。アプリの定期タスクを毎日22時（Asia/Tokyo）に設定する。端末を起動し、Codexアプリを実行しておく。スリープ中の定刻実行は保証しない。

```sh
npm run content -- --sources
npm test
npm run build
npm run dev
```

記事は `content/issues/YYYY-MM-DD.md`。日付・見出し・導入・投稿数・収集範囲をfrontmatterに記載する。収集本文を公開しない。記事のPRをレビューしてマージした時だけ公開する。

GitHubリポジトリの Settings → Pages → Source を GitHub Actions に設定する。Actionsの `pages` が静的サイトを公開する。サイトの表示と記事は公開、XログインとCodexの実行環境はこの端末に残る。

## 復旧

- 認証切れ: `npm run login` を再実行。
- Chromeまたはrelayの停止: `npm run browser`、続いて別のターミナルで `npm run relay` を実行。
- 内部API形式変更: エラーで停止する。取得なしを「話題なし」と解釈しない。
- 収集ロック: 実行中プロセスがないことを確認してから `.local/collector.lock` を削除。
- 同じ日の再実行: 収集ファイルは置換する。既存記事・PRは確認してから編集。

## 参考

- https://github.com/laiso/xpaper
- https://github.com/fa0311/twitter_api_safe_relay

Xpaperのコードはコピーせず、紙面の発想を参考にしている。
