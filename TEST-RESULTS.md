# Reader 0.1.2 verification — 5 November 2026

- Added Chrome checks for Entire Novel, true scene-only views, sequential page
  headings and total scope page estimates. Reopening retains Entire Novel scope.
- Measured manuscript x-coordinate before/after opening Configuration: unchanged.
  The panel ends at the right workspace edge; no unused gap beyond it.
- Synthetic 122,400-word book: all 40 chapters and 120 scenes rendered; all words
  retained, 760 measured pages at the test settings, no overflowing page bodies.
  Desktop Chrome completed that pagination in about 1.4 seconds and yielded 43
  times. This is a synthetic desktop result, not a Samsung speed claim.
- Six reader unit tests and the expanded Chrome integration suite passed.

## Prior 0.1.1 verification

- Six reader unit tests passed, including four concurrent requests maximum,
  duplicate-content request reuse, and manuscript-first layout allocation.
- Chrome integration additionally verified multi-page splitting preserves the
  exact source text and bold spans, equal page body heights without overflowing,
  a fitting keep group on one page, manuscript-only vertical scrolling, right-hand
  Configuration, both card columns on a wide monitor, and narrow-screen overlay.
- Wide and 390px screenshots inspected. Samsung download speed remains to be
  measured by the user; no real-network performance multiplier is claimed.

## Existing checks retained

- Four unit tests passed: GET-only pinned snapshot download, byte/hash checks,
  reuse of unchanged files, rejection of public repositories/truncated lists/
  corrupt bytes/missing scenes, section ordering, note exclusion, cancellation.
- Desktop Chrome with touch viewport passed: cover, outline and scene navigation,
  hidden section headings, equals italics, block indentation, keep-marker hiding,
  removal of scripts/images from manuscript HTML, offline reload/navigation,
  remembered chapter and text size, failed refresh preserving the old copy,
  successful refresh showing the new ending, and no persisted token/API cache.
- Every GitHub request in the integration test was GET. GitHub responses were
  simulated; no personal repository was accessed or changed.
- A 390px-wide screenshot was inspected: controls and reading surface fit without
  horizontal overflow. Shared modules are copied directly from desktop sources.

Reader 0.1.0 was confirmed working by the user on the real device. The new 0.1.1
layout/pagination and download improvement still need the user's Samsung test.
No claim of exact desktop/Word pagination.
