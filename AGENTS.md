# Visual and interaction conventions

Follow the user's latest instructions when they differ from this file.

- e1 is right, e2 is forward (away from the viewer), and e3 is up. Keep algebra coefficients and the metric unchanged when fixing camera conventions.
- Mouse orbit must feel like grabbing the scene: a visible point on the near side follows the drag direction. Test this using projected positions, not only camera-angle signs.
- 3D left orbit keeps e3 upright and allows elevation to just below +/-90 degrees. 3D right drag does nothing.
- All 4D Euclidean / 3D Flat and 5D CGA diagrams use independent upright left orbit and middle-button / three-finger free e1/e2/e3 rotation, without a mode selector or resets. Apply transformations in this global order: free spatial SO(3) and extra-axis e4/e5 exchange; then fold spatial up and the extra direction; finally the upright camera. Never bake upright orbit into the free frame. Added-axis directions are unaffected by middle drag. Right vertical fold is clamped to [0,180 degrees]; right horizontal CGA exchange to [0,90 degrees]. Collapsed axes retain depth.
- Normal 5D CGA starts with infinity fully visible upward. The Null Cone figure omits physical e2 (including its display axis) and receives exactly the same gesture state; its display swaps the spatial e2 component into hidden depth and unfolds the completely hidden vector in the origin/infinity plane into the initial spatial e2 direction. In 2D Round omit physical e2 in that construction section: origin starts forward, infinity up; exchange ends with origin up and negative infinity forward. Keep added axes distinguishable by color.
- Project from higher dimensions to 3D first; orthographic/perspective camera projection is a separate setting.
- Free tip dragging preserves camera depth in perspective views. Constrained dragging solves the allowed locus directly. Shift + left constrains to xy. Right and middle drag always orbit, including over handles; they never move handles.
- Dimension selectors beside each diagram control one shared dimension state. Never invent a lower-dimensional counterpart just to match figure counts.
- Orthographic projection is the default. Flat geometry is centred at half the projective-axis vector; keep-on-unit-slice starts enabled. Operation guides can be collapsed, with shared state. Do not show zoom activation buttons, page-level dimension selectors, or dimension-projection captions.
- Body/control text should be readable at ordinary desktop and phone sizes: >=14px for explanations/controls, >=16px for diagram labels. Avoid tiny 8-10px captions.
- A diagram consumes wheel zoom only after activation. Inactive diagrams allow page scrolling. Avoid trapping scrolling in control panels.
- Touch: tap to activate, one finger for left orbit, two-finger centroid motion for right orbit or pinch for zoom (lock to whichever exceeds the margin first; collect both pointer updates before classifying), three-finger centroid motion for free orbit in 4D Euclidean / 3D Flat / 3D Round. After any multi-finger gesture loses a finger, suspend until all fingers are lifted.
- Verify input transitions and projected camera behavior in tests, plus browser rendering. Responsive screenshots alone are not touch-operation verification.
- Mathematical labels need genuine subscripts/superscripts, accents, and native Unicode products; geometric projections use hats. Prefer the named p/l/g objects and actual expressions to generic u/result/first product labels.
- Complements should use stable frames and distribute scale across factors unless a specific normalized factor has geometric meaning.
- Independently editable input vectors remain the actual edges of their wedge blade; do not replace them with orthogonal or balanced factors.
- Trivector face color represents projected volume orientation before spatial camera orbit; left orbit does not change the color.
- Keep development decisions, conversational history, and future plans out of published page prose.
- Reference PDFs, Kindle files, and book captures remain ignored and outside the public build.

- Complement accents must span nested accents and scripts. On a basis symbol the accent covers e only, not its index.
- The projective reflection pattern encodes displacement between a point and its image; do not replace it with an arbitrary invariant conic. Use one source-containing section at 20% opacity.
- Show the Null Cone only in its construction figure. Later diagrams show the Horosphere alone. Use uniform display-axis lengths; keep the algebra metric unchanged.
- Except for the introductory book notice, Japanese page prose uses plain style.
