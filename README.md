\# web



ウクレレ練習アプリ 新構成版



\## ローカル作業場所

`C:\\Users\\manab\\OneDrive\\デスクトップ\\web`



\## 基本方針

\- ホームは縦

\- 練習画面は横優先

\- 4弦レーンは残す

\- 標準UIは Pulse Split

\- prompt は捨てず、仕様資産としてコード化する



\## フォルダ役割

\- `app/` 画面HTML

\- `src/core/` 譜面データ・拍子・休符・検証

\- `src/import/` xlsx読込・補完ルール・prompt資産

\- `src/practice/` 再生・ループ・判定・演出

\- `src/audio/` 音再生・メトロノーム・音声操作

\- `src/ui/` 画面ロジック

\- `src/styles/` デザイントークン・画面CSS

\- `data/` サンプル曲・先生曲

\- `tests/` 検証用



\## GitHub Pages

\- `main` push で Actions から公開

\- 入口はルート `index.html`

\- 実アプリ本体は `app/index.html`



\## ブランチ運用

\- `main` 公開用

\- `dev` 統合作業用

\- `feature/...` 個別修正用



\## 修正ルール

\- 1修正 = 1責務

\- UI修正で import を触らない

\- import 修正で practice を触らない

\- 関係ない箇所を触らない

