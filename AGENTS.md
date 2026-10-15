# Visual and interaction conventions

Follow the user's latest instructions when they differ from this file.

- e1 is right, e2 is forward (away from the viewer), and e3 is up. Keep algebra coefficients and the metric unchanged when fixing camera conventions.
- Mouse orbit must feel like grabbing the scene: a visible point on the near side follows the drag direction. Test this using projected positions, not only camera-angle signs.
- 3D left orbit keeps e3 upright and allows elevation to just below +/-90 degrees. 3D right drag does nothing.
- In 4D, left orbit is free spatial rotation with no poles or elevation clamp. Right vertical drag changes latitude between the current up direction and e4, clamped to [0,90 degrees]. Left orbit does not rotate the e4 display direction. Collapsed axes retain depth.
- CGA extra-axis exchange is also clamped to [0,90 degrees]. Keep the added axes distinguishable by color.
- Project from higher dimensions to 3D first; orthographic/perspective camera projection is a separate setting.
- Free tip dragging preserves camera depth in perspective views. Constrained dragging solves the allowed locus directly. Shift + left constrains to xy. Right drag always orbits, including over handles; it never moves handles.
- Dimension selectors beside each diagram control one shared dimension state. Never invent a lower-dimensional counterpart just to match figure counts.
- Orthographic projection is the default. Operation guides can be collapsed, with shared state.
- Body/control text should be readable at ordinary desktop and phone sizes: >=14px for explanations/controls, >=16px for diagram labels. Avoid tiny 8-10px captions.
- A diagram consumes wheel zoom only after activation. Inactive diagrams allow page scrolling. Avoid trapping scrolling in control panels.
- Touch: tap to activate, one finger for left orbit, two-finger centroid motion for right orbit, pinch for zoom. A remaining finger after a two-finger gesture must not unexpectedly move a handle or orbit.
- Verify input transitions and projected camera behavior in tests, plus browser rendering. Responsive screenshots alone are not touch-operation verification.
- Mathematical labels need genuine subscripts/superscripts, accents, and native Unicode products; geometric projections use hats. Prefer the named p/l/g objects and actual expressions to generic u/result/first product labels.
- Complements should use stable frames and distribute scale across factors unless a specific normalized factor has geometric meaning.
- Independently editable input vectors remain the actual edges of their wedge blade; do not replace them with orthogonal or balanced factors.
- Trivector face color represents projected volume orientation before spatial camera orbit; left orbit does not change the color.
- Keep development decisions, conversational history, and future plans out of published page prose.
- Reference PDFs, Kindle files, and book captures remain ignored and outside the public build.
