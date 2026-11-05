# Story Sidecar Reader 0.1.0

A read-only Android web app for your private GitHub book backup. No APK, no
writing controls, no GitHub uploads. Independent of desktop release 0.1.126.

## Install from GitHub Pages

1. Create a PUBLIC repository named `sidecar-reader` for the application code.
   Your existing `thetingstedcipher` book repository must remain PRIVATE.
2. Extract this ZIP. Upload everything INSIDE `site/` into the public repository
   root. Preserve the `shared/` subfolder. Do not upload the ZIP itself.
3. Settings → Pages → Deploy from a branch → main → /(root) → Save.
4. Wait for the HTTPS address, normally
   `https://chipzulu.github.io/sidecar-reader/`.
5. On the tablet open that address in Chrome, not the index.html file in Downloads.
6. Enter `chipzulu/thetingstedcipher`, branch `main`, and a fine-grained token
   restricted to that private repository with **Contents: Read-only**.
   The existing read/write token also works, but a separate read-only one is better.
7. Tap Download / refresh book. Keep the app open during download. Your first
   download reads every backed-up file; subsequent refreshes reuse unchanged files.
8. Once downloaded, the cover appears. Use Next or Outline to read chapters/scenes.
   Text offers four sizes. The reader remembers the chapter and scroll position.
9. Open GitHub controls and wait for “Reader cached for offline opening”. Use
   Chrome → Install app / Add to Home screen. Read offline without a token.

Use a separate site from the earlier `sidecar-android-test`; do not overwrite the
test app. If you prefer another static HTTPS host, upload the same site files.

## How to use

- Outline: expand a chapter, choose Read chapter or a scene.
- Next / Previous: move through chapters, starting with the cover.
- GitHub: show connection controls; Download / refresh gets the latest backup.
- Forget token: clear session credentials without removing the offline book.
- One offline book is retained at a time. Changing repositories asks before
  replacing that copy. A failed or cancelled refresh preserves the previous copy.
- No token is persisted by this app. Your browser/password manager may offer
  to remember credentials; decline for this version. A fresh session needs a
  token only to download/refresh, never to read the offline copy.

## What this version displays

Cover.png, Cover.jpeg, then Cover.jpg in Book/Cards (case-insensitive lookup),
Title.md metadata, original manuscript and chapter/scene outline. Desktop
ordering and formatting helpers are reused: a00 front matter, numeric chapters,
z00 back matter, hidden ! section headings, scene subtitles, emphasis and block
indents. Equals-marked italics are rendered as italics; keep-group markers are
hidden. Original bytes are retained unchanged.

Reading scrolls chapter by chapter. It does not reproduce the desktop page count
or print layout. Notes, other cards, images and translations are downloaded for
snapshot completeness but do not yet have separate viewer panels. Git cannot
represent empty folders. Local desktop .git history is not part of the backup.
Browser-only desktop settings are not in the GitHub snapshot.

## Privacy and limits

Only GET requests to api.github.com; no proxy, analytics, external scripts or
remote manuscript images. Tokens stay in memory; content is sanitized before
display. The public hosting repository contains app code only. The private book
is saved in IndexedDB on the tablet, not uploaded to the hosting site. Public
hosting under the same GitHub Pages origin shares browser origin access with
your other sites there; only host code you trust and protect your account.

Each download pins one Git commit, verifies Git blob hashes, then stores the
complete snapshot in one transaction. It does not mark partial downloads as
complete. Limits match the desktop backup: 25 MiB/file, 100 MiB/book, 10,000 files.
GitHub may rate-limit requests; retry later. Refresh downloads metadata and only
changed file contents. There is no resumable download across app restarts yet.

Clearing site data or browser storage eviction removes offline books. GitHub
and your desktop files remain intact. Do not rely on this tablet as your only
backup. This is not end-to-end encryption or an independent security audit.

## Your acceptance checklist

- [ ] Cover and title match the desktop book.
- [ ] Outline order and scene navigation work, including front/back sections.
- [ ] Italics, blank paragraphs, quotes and block indents look correct.
- [ ] Larger text is comfortable in portrait and landscape.
- [ ] Airplane mode: close/reopen and read several chapters.
- [ ] Reopen online: token is not saved, but the book and reading position remain.
- [ ] Make a desktop change, Send to GitHub, refresh reader, confirm new text.
- [ ] Wrong token or interrupted refresh leaves the earlier offline book readable.

Report tablet model, Chrome version, and any failed item. Never send the token.

## Development

See DEVELOPMENT-PLAN.md in the workspace. `scripts/package-android-reader.py`
refreshes exact copies of the shared desktop modules and creates the ZIP.
Run `node --test tests/android-reader.test.js` and
`node tests/android-reader-browser.cjs` (Playwright required).
