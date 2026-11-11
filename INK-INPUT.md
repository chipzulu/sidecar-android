# Handwriting input contract (Reader 0.1.16)

`inkPad(host, initialInk, save, inputFactory)` owns the note and persistence.
The default `browserInkInput` owns pointer capture, coordinate conversion and live SVG painting.

An inputFactory receives `(svg, {height, remaining, begin, complete})` and returns
`{active(), finish(), dispose()}`. `begin()` pauses the idle scene-write timer.
`complete(points, optionalExistingPolyline)` submits exactly one completed stroke and returns whether it was accepted. Points are `[x,y]` pairs in the 800-unit note coordinate system; y is bounded by `height()`. Input must respect `remaining()` (24,000 total points and 2,000 strokes). Accepted strokes are immutable. An existing polyline is used by the browser; a native adapter omits it so the shared renderer creates the permanent stroke.

Only one adapter may own input. A future native adapter must disable browser pointer ink, map native screen coordinates into note coordinates, exclude UI controls, and acknowledge permanent rendering before clearing temporary hardware ink. Native API detection alone must not activate an adapter: successful capability negotiation is required. No native bridge is shipped yet. Pressure/tilt are not part of the current portable two-coordinate storage schema.

`save(ink, false)` writes the immediate recovery checkpoint; `save(ink, true)` merges pending checkpoints into scene HTML. Full scene parsing, validation of existing strokes, and layout rebuilds are excluded from pointer movement. Each stroke is validated once on receipt. App hiding and note closing flush the pending scene write. Recovery records survive a failed merge and are replayed on next load.

Desktop regression checks establish node retention, burst write coalescing, stored stroke fidelity and recovery. They do not measure E-Ink latency. Device comparison should use the same note and pen settings, short block letters and a long stroke; assess both contact-to-ink delay and delay between letters.
