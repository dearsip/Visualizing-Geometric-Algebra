# Visual and interaction conventions

Follow the user's latest instructions when they differ from this file.

- e1 is right, e2 is forward (away from the viewer), and e3 is up. Keep algebra coefficients and the metric unchanged when fixing camera conventions.
- Mouse orbit must feel like grabbing the scene: a visible point on the near side follows the drag direction. Test this using projected positions, not only camera-angle signs.
- 3D left orbit keeps e3 upright and allows elevation to just below +/-90 degrees. 3D right drag does nothing.
- In 3D Flat / 4D algebra, left orbit is upright; middle-button drag or a three-finger centroid performs free e1/e2/e3 spatial rotation with no poles or elevation clamp. Right vertical drag changes latitude between the current up direction and e4, clamped to [0,180 degrees]. At 180 degrees e4 is screen-collapsed again, pointing away. Left orbit does not rotate the e4 display direction. Collapsed axes retain depth.
- CGA extra-axis exchange is clamped to [0,90 degrees]. 5D diagrams use upright left orbit and middle-button / three-finger free e1/e2/e3 orbit, with no mode selector or reset between gestures. Free orbit preserves the extra-axis display directions, and subsequent right orbit folds the current spatial up direction. In the 5D Null Cone diagram, vertical right drag exchanges spatial up with origin and leaves the infinity direction fixed. In 2D Round, infinity starts upward and the origin axis starts screen-collapsed; left orbit keeps the extra-axis pair upright. In the Null Cone section, omit e2 and initially use origin as forward and infinity as up; the quarter turn ends with origin up and negative infinity forward. Keep the added axes distinguishable by color.
- Project from higher dimensions to 3D first; orthographic/perspective camera projection is a separate setting.
- Free tip dragging preserves camera depth in perspective views. Constrained dragging solves the allowed locus directly. Shift + left constrains to xy. Right and middle drag always orbit, including over handles; they never move handles.
- Dimension selectors beside each diagram control one shared dimension state. Never invent a lower-dimensional counterpart just to match figure counts.
- Orthographic projection is the default. Flat geometry is centred at half the projective-axis vector; keep-on-unit-slice starts enabled. Operation guides can be collapsed, with shared state. Do not show zoom activation buttons, page-level dimension selectors, or dimension-projection captions.
- Body/control text should be readable at ordinary desktop and phone sizes: >=14px for explanations/controls, >=16px for diagram labels. Avoid tiny 8-10px captions.
- A diagram consumes wheel zoom only after activation. Inactive diagrams allow page scrolling. Avoid trapping scrolling in control panels.
- Touch: tap to activate, one finger for left orbit, two-finger centroid motion for right orbit, pinch for zoom, three-finger centroid motion for free orbit in 3D Flat / 3D Round only. After any multi-finger gesture loses a finger, suspend until all fingers are lifted.
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
