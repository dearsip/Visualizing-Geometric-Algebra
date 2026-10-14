# Geometric Algebra · Visual Atlas

`Projective Geometric Algebra Illuminated` (Eric Lengyel) を参照して制作した、動かせる図の試作です。本書の図や本文を転載したサイトではありません。学習を補助する用途を想定し、トップに定義の変更・簡略化と、本書との併用を明記しています。

15ページ、45種類の図を用意しています。各ページには原則3図。Exterior / Euclidean / RGAは3Dと4D、CGAは2D Round Geometry (4D algebra) と3D Round Geometry (5D algebra) を切り替えられます。2D Flat Geometryに存在しないPlaneを使うProjectionの項目は、4Dで表示します。

## Local preview

Node.js 22以降。外部npm依存はありません。

```powershell
npm test
npm run build
npm run dev
```

ブラウザで `http://127.0.0.1:4173/` を開きます。サーバーの配信対象は `dist/` のみです。ルートに置かれた参照資料にはアクセスできません。

## Controls

- 背景を左ドラッグ: e₃を上に保つOrbit。
- 背景を右ドラッグ上下: e₃–e₄の回転。CGAでは追加軸の表示も切り替わります。
- CGAで右ドラッグ左右: origin axisとPoint at infinityの軸を滑らかに交換。
- vectorの先端をドラッグ: 表示の視線に垂直な面内で移動。
- 先端をShift + 左ドラッグ: e₁e₂平面。
- 先端をShift + 右ドラッグ: 見えている追加の縦軸方向。
- 数値欄: 隠れている次元を含む成分の編集。
- Fix value: 指定のConstant-product locusへ移動を制約。
- Wheel / Pinch: Zoom。Home / View ↺: 初期視点。
- Complementの点線の先端: 直交factorの姿勢を調整。スライダーからも操作できます。

## Reference material stays local

`.gitignore` はPDF、Kindle形式、`tmp/`、`reference/`、`references/private/`、`.private/`を除外しています。PDFからの検討用キャプチャは `tmp/pdfs/` に保存します。

`scripts/build.mjs` は `index.html`, `styles.css`, `src/` だけをコピーし、章のHTMLを生成します。成果物にPDF、書籍キャプチャ、その他想定外の形式が残っていればビルドを失敗させます。依存・閲覧時のCDNアクセスもありません。

新しい参照資料は上記の非公開用フォルダに置いてください。参照資料をGit管理に追加する必要はありません。

## GitHub Pages

公開先は `dearsip/Visualizing-Geometric-Algebra`。現在のPrivate設定を変更する操作は行いません。

`.github/workflows/pages.yml` は `main` へのpushで数値検証、静的ビルド、Pages deploymentを実行します。GitHubの **Settings → Pages → Build and deployment → Source: GitHub Actions** を選択してください。PrivateリポジトリでのPages利用はGitHubのプランに依存します。Publicへ変更する予定の場合は、変更後にPagesを有効にしてworkflowを再実行できます。

サイトはサブディレクトリで動く相対パスだけを使っています。URLはPagesが有効になった後に `https://dearsip.github.io/Visualizing-Geometric-Algebra/` となります。ソースのpushと、サイトの公開成功は別に確認してください。

## Content and remaining work

実装範囲・本書との違い・未実装項目は [CONTENT_NOTES.md](CONTENT_NOTES.md) を参照してください。計算と描画を分離しているので、将来VRChatで同じ演算例・数値検証を使える構成です。

一次資料: [Author's website](https://projectivegeometricalgebra.org/), [RGA Wiki](https://rigidgeometricalgebra.org/), [CGA Wiki](https://conformalgeometricalgebra.org/)。
