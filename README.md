# Story Sidecar Reader 0.1.1

## New in 0.1.1

- Downloads use up to four concurrent GitHub file requests, deduplicate identical
  file contents and reuse unchanged files. All hashes must still pass before the
  offline snapshot is replaced. Real speed depends on GitHub and your connection.
- Equal-height manuscript pages, with an independent vertical scrollbar. Previous
  and Next chapter buttons now live in the top menu. Page numbers are local to the
  selected chapter, not publication numbering. Headings, subtitles and blank lines
  consume the selected line budget; the running page heading is outside that budget.
  Long paragraphs split without losing emphasis; fitting keep/quote groups stay
  together, oversized groups split. This is reading pagination, not Word layout.
- Outline and Configuration share the right-hand panel. Configuration sets page
  width, lines per page (15–60), and no cards / left cards / cards on both sides.
  When Configuration is open, drag the green handle on the page's right edge or
  use its arrow keys to resize. Text size remains in the top bar.
- The page width wins, capped at the screen. Card columns narrow and have their
  own internal scrolling; when less than 150 px per column remains, the right
  cards then left cards hide temporarily. They return when space returns. The
  right tool panel overlays the page only when it cannot fit beside it.
- Two read-only card slots per column. Select an image or Markdown card in each
  slot; select “Choose a card…” to clear it. Text cards have basic headings/plain
  paragraph rendering; full desktop Markdown/checklist/search tools are not ported.
- Layout and card choices stay on this device. Opening a panel doesn't reflow
  the manuscript unless its actual width changes.

### Update the existing installation

Upload the new ZIP's `site/` CONTENTS into your existing public app repository
(`sidecar-android`, or the name you chose). Keep the `shared/` folder. Include the
new `pages.js`, `layout.js`, and `cards.js` files. Wait for Pages deployment.
Open the app online, then close ALL its tabs/installed windows and reopen so the
new service worker can activate. Configuration should show Reader 0.1.1.
Do not clear site data: the downloaded book and reading preferences are retained.

A read-only Android web app for your private GitHub book backup. No APK, no
writing controls, no GitHub uploads. Independent of desktop release 0.1.126.

## Install from GitHub Pages

1. Create a PUBLIC repository named `sidecar-android` for the application code.
   Your existing `thetingstedcipher` book repository must remain PRIVATE.
2. Extract this ZIP. Upload everything INSIDE `site/` into the public repository
   root. Preserve the `shared/` subfolder. Do not upload the ZIP itself.
3. Settings → Pages → Deploy from a branch → main → /(root) → Save.
4. Wait for the HTTPS address, normally
   `https://chipzulu.github.io/sidecar-android/`.
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

Reading scrolls through pages within the selected chapter. It does not reproduce
the desktop page count or print layout. Notes and translations are downloaded for
snapshot completeness but do not yet have separate viewer panels. Cards can be
shown in the read-only reference slots. Git cannot
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
