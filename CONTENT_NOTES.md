# Content notes

## Conventions

図と短い日英コメントを中心に構成する。原著の本文・原図は転載しない。

- Algebraic elementとbasis elementは太字、数値係数はscalar。Geometric productは⟑ (U+27D1)、antiproductは⟇ (U+27C7)。STIX Two Mathを同梱して字形を表示する。
- Exterior Algebraの演算は計量非依存。前置きのEuclidean Geometric Algebraはidentity metric。RGAはdiag(1,…,1,0)。CGAはspatial directionsの自己積1、追加二軸の自己積0、交差積−1。
- 2D Flatは3D algebra、3D Flatは4D algebra。2D Roundは4D algebra、3D Roundは5D algebra。存在しない次元の図を数合わせで作らない。
- e1は右、e2は前（視点から遠ざかる向き）、e3は上。3D左回転はe3を上に保つ。4Dでは制限のない自由回転とし、e4の表示方向を左回転から独立させる。初期状態でe4は手前、fold終端で現在の上方向にあったspatial directionは奥を向き、画面上で潰れても奥行きは保持する。追加軸のfoldとCGAの交換角は0–90°。
- 高次元から3Dへの線形射影と、3DカメラのPerspective / Orthographicは別の設定。
- Bivectorのfillは向きで暖色／寒色を使い分け、family colorは辺に使う。Trivectorはカメラの左回転以前の3D投影の体積の符号に色を揃え、向きの曲線矢印は原点側の面だけに描く。3Dへ潰れる4D Antiscalarは、固定したambient basisの向きで色を区別する。
- Vectorのラベルは先端、bladeは中心。幾何学的なunit-slice表示にはhatを付ける。Bulk / Weightの丸やDualの星は下付き／上付きで組む。
- Complementは連続する直交frameを使う。直接操作できないbladeのscaleはfactorに均等配分する。独立に操作する入力vectorはそのまま辺にする。Lineの分解では意味のある正規化したdirectionを使う。
- Scalarの表示半径は|coefficient|^(1/3)に比例する。空間的な広がりをscalarの定義に加えるものではない。

## Mathematical choices

1. 積を一定に保つ軌跡をConstant-product locusと呼ぶ。Wedgeのvector pairは相手に平行な線。Trivectorの図はlocus / Fix valueを置かない。
2. Distributivityの両辺は同じelementなので、切り替えで符号を変えない。順序の交換では向きを反転する。
3. 非零Euclidean vectorはa/(a·a)をinverseに持つ。RGAでは純粋なprojective-axis vectorのinverseは存在しない。
4. Complementはbasis elementの定義を線形に拡張する。一般のuでu∧RC(u)はcoefficient normの二乗×𝟙となり、常に𝟙とは限らない。
5. RGA PointのBulkはposition、Weightはhomogeneous weight。Lineはmoment / direction、Planeはoffset / normal。Lineのbulkは(−unit direction)∧weighted support、weightはprojective axis∧directionとして描く。
6. Attitudeはu∨RC(e_n)。Pointではscalar、Lineではdirection vector、Planeではdirection bivectorとなる。境界の円・球は無限遠の方向と有限な表示範囲を描くために使い、有限の境界点を無限遠点と同一視しない。
7. Euclidean Reflectionの表示はv1=a⟑v0⟑a⁻¹。これはaを軸とするReflection。−v1がcomplementを鏡映面とするReflection。二つのReflectionによるRotationもこの符号で統一する。
8. RGA Sandwichも全体をnegateしない。Complementを介するSandwichはLC(a⟑RC(v0)⟑a⁻¹)で、g=LC(a)によるg⟇v0⟇g/(a•a)と一致する。unit sliceの代表を取り直すとEuclidean Reflectionになる。
9. Projective Sandwichの補助面は、|x|²−k(w−a_h(a_bulk·x)/|a_bulk|²)²=0という不変quadricの断面。unit sliceだけに描く。Euclidean Reflectionでは鏡映面から等距離の平面を描く。
10. Motor / Flectorは2Dでも成立する。2D Motorは回転／平行移動、Flectorは鏡映／映進。Motorをscrew motionで補間し、Flectorは固定ReflectionとMotorに分けて補間する。det=−1の変換をidentityから連続なisometryで結ぶことはできない。
11. Angleは同gradeならsigned contractionを使い、違うgradeならそのbulk normを使う。Parametric formはp(α)=hat(sup(u))+att(u)∨α★。Parameterのgradeはobject grade−2。
12. 原著の名称はHorosphere。Null coneのunit-origin-axis断面を描く。Round pointはInfinity係数に½(|x|²+r²)を使い、unit weightで自己dotは−r²。
13. CGAの追加軸の表示長1/√2と√2はmetric normとは違う。Null coneの断面、直交するspatial parabola、Horosphereのcoarse meshを描く。
14. Round objectはHorosphere上の形とu=0の形を両方表示する。Dipoleの両端、Circleのellipse、Sphereのellipsoid、Flat objectのparabolic sectionを実際のnull embeddingで計算する。Imaginaryの場合は実のHorosphere交点を描かず、中心と|r|を補助表示する。

## Contents

20の内容ページ、51の図。Euclidean DotをGeometric Productの前に置く。Flat Normsは式だけを補足に置く。DistanceはPoint–Point / Point–Line / Point–Plane / Line–Line、DualはPoint / Line / PlaneのBulk / Weightを同時表示する。Projectionは4種の演算を1ページにまとめ、各演算に1図を置き、gradeの組み合わせを選ぶ。

Projective Product / Antiproductを独立した図にし、SandwichとIsometry、Motor / Flectorへ続ける。CGAはConstruction、Round objects、概念ごとのCarrier / Cocarrier / Container / Dual / Partner / Attitude / Conjugateと後置のNorm、Join、Meet、Expansion、Dot / Containment、Translation / Rotation / Dilation / Sphere inversionを扱う。Join / Meet / Expansionではdimensionに応じたgrade pairとFlat化を選べる。

## Bounds of the visualization

- 高次元の全ての面を一つの3D射影で分離して見せることはできない。Fold、カメラ、トグルで確認する。
- CGAのNull coneとHorosphereは断面とmeshの表示。SphereのHorosphere intersectionはgreat circles、latitude mesh、シルエットで示す。
- Round objectの入力factorは主にunit-weight Null point。Round pointとDotの図ではRadiusを直接変えられる。任意の非simple multivectorを幾何学的bladeとして描かない。
- CGAの全てのProjection、Operation duality、Transversionは今回の図に含めない。
- Source PDFsと検討用画像はGitにも公開成果物にも入れない。

## Verification

`npm test`: 143 checks. Clifford relation、basis associativity、Complement、Projection、CGA embedding、Motor / Flector、全図とcontrols、cameraの向きとfold端点、斜めlocusのdrag速度、連続frame、Attitude / Distance、Line分解、Parametric form、不変quadricを検証する。

ブラウザでは全20ページの両次元版、1280pxと375pxの表示、横溢れと描画例外、共通の次元切替と編集値の保持、操作の有効化／解除を確認する。ローカルのgesture pageは18の入力試験を行う。実機スマホでの操作感は未確認。

CGAのNull pointのドラッグは、投影された移動先を反復的に解き、origin coefficientを1に戻してnull条件を保つ。右ドラッグは点を捕捉せず回転に専用する。
