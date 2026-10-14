# Content notes

## Conventions

本文の長い再掲、原図の転載、実装技術の解説は行わず、操作する図と短い日英コメントで構成。

- Algebraic element、vector、basis elementは太字。数値係数はscalar。
- Scalar basis elementは太字の **1**、Antiscalarは𝟙。体積elementはe₁ ∧ … ∧ eₙの向きに固定。
- Geometric product: ⟑ (U+27D1)、Geometric antiproduct: ⟇ (U+27C7)。Unicodeを保持し、CSSの字形で表示を補う。
- Exterior Algebraは計量非依存。前置きのEuclidean Geometric Algebraではg = identity。Flat Geometryではg = diag(1, …, 1, 0)。CGAは空間方向の対角成分1、追加二軸の自己積0、交差積−1。
- 3D/4Dはalgebraの次元。RGAではそれぞれ2D/3D Flat Geometry。CGAでは2D/3D Round Geometryに対応する4D/5D algebraを表示。
- e₁が右、e₂が前、e₃が上。e₄は手前から、右ドラッグで上に回す。高次元は3Dへの線形射影とOrbitによって表示。
- Bivectorは平行四辺形。向きの反転で暖色／寒色を交換。Trivector以上は内向きのboundary windingを使う。ラベルはvectorの先端、bladeの領域の中心。
- 依存するfactor・locusは点線。高gradeのfactorは直交frameを使い、factorの積の大きさを維持する。射影で重なる面には可視性の限界がある。
- Scalarの表示用半径は|coefficient|^(1/3)に比例。符号は数値欄で示す。これは可視化の便宜であり、scalarに空間的広がりがあるという定義ではない。

## Mathematical adjustments and cautions

1. Constant-product locus / 積を一定に保つ軌跡と呼ぶ。Wedgeのvector pairには直線、trivectorには平面が対応する。
2. 分配法則のLHS / RHSを切り替えても同じelementなので符号は変わらない。Anticommutativityの順序切り替えで符号を変える。
3. 非零Euclidean vectorにはa⁻¹ = a/(a·a)がある。a·b = 0でも成立する。RGAのnull vectorには一般にこのinverseがない。
4. u ∧ rightComplement(u) = 𝟙という定義はbasis elementに対して成立。線形に拡張した一般のuでは、標準のcoefficient normを使って‖u‖²𝟙となる。Complementをinverseと混同しない。
5. RGA lineのBulkはmoment、Weightはdirection。PointのBulkはposition、Weightはhomogeneous weight。PlaneのBulkはoffset、Weightはnormal。
6. Horizonは正負の方向を同一視する。表示用の境界の円・球は視野を切り取る便宜上のもの。有限なunit sliceの境界点を無限遠点とは同一視しない。
7. att(u)とHorizonとの交わりは区別する。Pointのattitudeはscalar、Line/PlaneのHorizon intersectionは低gradeのdirection element。
8. 前置きのReflectionはv₁ = −a ⟑ v₀ ⟑ a⁻¹を採用。これはaのcomplementを鏡映面とする。Figure 3.2の符号をそのまま使ったものではなく、対応する−v₁も描く。
9. Complement-conjugated sandwichを説明用にSandwich Antiproductと呼ぶ。g = leftComplement(a)とすると、−g ⟇ v₀ ⟇ g/(a • a)と一致する。本書にもsandwich antiproductという表現があり、独立した新しい積として定義する必要はない。
10. MotorはScrew motionで補間。Flectorは一つの固定ReflectionとMotorに分け、Reflectionから目的のFlectorまで補間する。det = −1の変換をidentityから連続なisometryで結ぶことはできない。
11. 本書はHorosphereという名称を使う。Null coneとの交わりで、origin axisの係数が1のslice。2D版ではz = 1、3D版ではw = 1。
12. Round point (4.28)は無限遠成分に½(|x|² + r²)。unit weightではa • a = −r²。実のSphereを表すdual vectorの符号と取り違えない。
13. CGAのaxis表示の長さ1/√2と√2は、metric normではなく描画上の長さ。Null cone / Horosphereは断面をサンプリングしたmeshで示す。
14. 図中のImaginaryは位置と|r|を表す補助表示。実の交点として描くものではない。

## Current pages

| Page | Figures |
| --- | --- |
| Wedge Product | Vector pair, distributivity, trivector; constant-product constraints |
| Basis & Complements | Basis sequence; right/left complement; antiwedge construction |
| Geometric Product | Wedge+dot loci; reflection; rotation of vectors/blades; reverse and multiplication table |
| Homogeneous Coordinates | Point; line; plane in 4D / whole flat space in 3D; bulk/weight; horizon |
| Join, Meet & Attitude | Join; meet; attitude and horizon intersection |
| Dot Products & Norms | Bulk dot; weight antidot on antivectors; homogeneous/projected norms |
| Distance & Duals | Point–point/line/plane distance; metric duals; expansion/contraction definitions |
| Four Projection pages | Orthogonal/central projection/antiprojection; all three cases in 4D; dual and two products |
| Sandwich & Isometry | Projective sandwich; complementary isometry; 2–6 reflections and motor/flector interpolation |
| Conformal Construction | Null cone/Horosphere; general round point; four-part norms |
| Round Objects | Dipole/flat point; circle/line; sphere/plane in 5D; carrier, cocarrier, container, duals, partner, attitude, conjugate |
| Conformal Operations | Null point dot/containment; circle/sphere meet and expansion; selected conformal transformations |

## Limits of this first prototype

- Projectionの意味が直ちに確認できることを優先し、中間bladeの可視化はunit slice・Horizon・直交factorを併用。高次元の積の全てを一つの3D視点で区別できるわけではない。
- Null pointをfactorに持つDipole/Circle/Sphereを主に編集する。Round pointは半径を直接編集できる。その他の任意のRound objectの全成分編集、Imaginary objectの一般入力は次の拡張対象。
- CGA Dot/ContainmentはまずNull pointとCircle/Sphereで実装。実・虚のRound pointの全配置、Sphere pairの接平面角など、本書の全ての図はまだ網羅していない。
- CGA Join/Meet/Expansionは代表例。任意gradeの組み合わせと全てのCGA Projectionは未実装。
- Conformal transformationsはTranslation、Rotation、Dilation、Sphere inversion。Transversionとその他のOperation dualityは未実装。
- Projective sandwichの補助meshはサンプル点と移動経路。Figure 3.13の全てのgreen shadingを連続面として再現したものではない。
- 5Dの完全なNull cone/Horosphereではなく、断面のサンプルmesh。VRChatでは同じデータから視点・断面の操作を再設計する予定。

## Verification

`npm test`はClifford relation、basis triplesの結合法則、Complementの左右inverse、Projectionとhomogeneous scaling、Reflectionのantiproductとの一致、CGAのNull/radius/partner、Screw interpolationの端点と距離保存を検証する。

全45種類の図の両次元版に対し、select / toggleの切り替え、finite geometry、Fix valueの保存も検証。ブラウザでは全ページの両次元版、数式と記号、数値編集、先端ドラッグ、レスポンシブ表示を確認する。
