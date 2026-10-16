# Geometric Algebra · Visual Atlas

`Projective Geometric Algebra Illuminated` (Eric Lengyel) を参照して制作した、動かせる図の試作です。原著の図や本文を転載したサイトではありません。学習を補助する用途を想定し、トップに定義の変更・簡略化と、このサイトだけでの学習を想定しないことを明記しています。

18の内容ページ、49種類の図を用意しています。各図のそばの次元切替は、ページ内で共通の状態を操作します。RGAは「2D Flat · 3D algebra / 3D Flat · 4D algebra」、CGAは「2D Round · 4D algebra / 3D Round · 5D algebra」と表記します。PlaneとSphereの単独図は、それぞれ存在する次元だけを表示します。

## Local preview

Node.js 22以降。外部npm依存はありません。

```powershell
npm test
npm run build
npm run dev
```

ブラウザで `http://127.0.0.1:4173/` を開きます。サーバーの配信対象は `dist/` のみです。ルートに置かれた参照資料にはアクセスできません。

## Controls

- 背景を左ドラッグ: 掴んだ側がマウスに追従するOrbit。3Dはe₃を上に保ち、仰角は±90°の直前まで。4D Flatは自由回転。CGAは追加軸の組を縦軸として回転。5DではUpright orbit / Free orbitを選べ、切替時に姿勢をリセットします。Free orbitはe₁e₂e₃の間で回転します。
- 右ドラッグ上下: 点の上を含め、現在の上方向と追加軸の緯度を0–180°で変えます。3Dでは右ドラッグは動作しません。
- CGAで右ドラッグ左右: origin axisとPoint at infinityの軸を滑らかに交換。
- vectorの先端をドラッグ: 表示の視線に垂直な面内で移動。
- 先端をShift + 左ドラッグ: e₁e₂平面。
- 数値欄: 隠れている次元を含む成分の編集。
- Fix value: Wedge / DotではConstant-product locusへ制約。Geometric Productでは両入力を固定。
- 図をクリック／タップするとWheel / Pinchを有効化。Escか図の外で解除。非アクティブな図はページスクロールを妨げません。
- タッチは1本指が左ドラッグ、2本指の中心の移動が右ドラッグ、指間距離がPinch。2本指から1本指になった時は、全て離すまで操作を中断します。
- Complementの点線の先端: 直交factorの姿勢を調整。Scaleはfactorに均等配分します。
- Perspective / Orthographic: 高次元から3Dへの線形射影の後に適用するカメラ投影。既定はOrthographic。Home / View ↺で初期視点。
- 操作説明の開閉状態は図・ページ間で共通です。右側の操作欄は独立スクロールします。
- PNG: 現在の図と式を画像として保存。

## Reference material stays local

`.gitignore` はPDF、Kindle形式、`tmp/`、`reference/`、`references/private/`、`.private/`を除外しています。PDFからの検討用キャプチャは `tmp/pdfs/` に保存します。

`scripts/build.mjs` は `index.html`, `styles.css`, `src/`, `assets/` だけをコピーし、章のHTMLを生成します。成果物にPDF、書籍キャプチャ、その他想定外の形式が残っていればビルドを失敗させます。STIX Two MathとそのOFLライセンスを同梱し、Unicodeの積の記号を表示します。閲覧時のCDNアクセスはありません。

ローカルサーバーだけに `/__qa__/gestures.html` を用意しています。Run input checksで実際のCanvasのイベントリスナーを検証できます。このページは公開成果物に含めません。

新しい参照資料は上記の非公開用フォルダに置いてください。参照資料をGit管理に追加する必要はありません。

## GitHub Pages

公開先は `dearsip/Visualizing-Geometric-Algebra`。現在のPrivate設定を変更する操作は行いません。

`.github/workflows/pages.yml` は `main` へのpushで数値検証、静的ビルド、Pages deploymentを実行します。GitHubの **Settings → Pages → Build and deployment → Source: GitHub Actions** を選択してください。PrivateリポジトリでのPages利用はGitHubのプランに依存します。Publicへ変更する予定の場合は、変更後にPagesを有効にしてworkflowを再実行できます。

サイトはサブディレクトリで動く相対パスだけを使っています。URLはPagesが有効になった後に `https://dearsip.github.io/Visualizing-Geometric-Algebra/` となります。ソースのpushと、サイトの公開成功は別に確認してください。

## Content and remaining work

実装範囲・原著との違い・未実装項目は [CONTENT_NOTES.md](CONTENT_NOTES.md) を参照してください。計算と描画を分離しているので、将来VRChatで同じ演算例・数値検証を使える構成です。

一次資料: [Author's website](https://projectivegeometricalgebra.org/), [RGA Wiki](https://rigidgeometricalgebra.org/), [CGA Wiki](https://conformalgeometricalgebra.org/)。

Flat Geometryはunit sliceへの制約を既定で有効にし、視点の中心をprojective axisの0.5倍に置きます。CGAの通常表示とNull Coneの断面表示は別の軸配置を使います。
