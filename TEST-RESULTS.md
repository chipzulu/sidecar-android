# Reader 0.1.0 verification — 4 November 2026

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

Still pending: hosting on HTTPS and actual Samsung/Chrome tests with the user's
private backup, particularly installation, offline lifecycle, large-book download
time, and real manuscript formatting. No claim of exact desktop/Word pagination.
