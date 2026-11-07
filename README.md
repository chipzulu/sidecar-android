## Reader 0.1.5 — Highlight notes

Select words in one scene on the reading page and tap Highlight. Choose a colour and optionally write a note with the ONYX keyboard. Tap the painted text to open its note. Tap Highlight without selecting words to browse saved notes. To move one, open it, tap Reattach, select its new passage and confirm with Reattach highlight.

Local highlights work offline. To transfer them, unlock the book repository with a fine-grained token with Contents read and write. Under GitHub choose Send highlights. PC Sidecar 0.1.128 can import them with Versioning → Get tablet highlights. Files are Markdown in Book/Notes. After editing a note on PC, Send to GitHub and refresh the book on Android. A locally changed note on PC is preserved if a competing edit arrives. A note whose passage disappears keeps its quotation, and you can reattach it on the tablet.

## Reader 0.1.4 — Write a scene on the tablet

Open a scene from Outline, or tap a paragraph while reading a chapter or the whole novel. Choose **Edit scene**, tap where you want to write, and use the pen in the ONYX input method. **Done** returns to paginated reading. Committed edits are saved in this browser on the tablet. You can reopen the app offline. Keep browser site data to keep drafts. Drafts are separate from downloaded files and are shown when the same repository, branch and scene path are opened again. To take a draft back to the PC in this version, select and copy the scene text.

# Story Sidecar Reader 0.1.3

## New in 0.1.3 — Remember your GitHub token

1. Open **GitHub**, enter the book repository and your token.
2. Check **Remember token on this device**.
3. Choose a passphrase (at least eight characters; a few memorable words are
   preferable to a short PIN), enter it twice, then **Save token securely**.
4. The token is now encrypted on this device and unlocked for the current session.
   Press Download / refresh book as usual.
5. After reopening, enter only your passphrase and press **Unlock GitHub**, then
   refresh. Offline reading never requires unlocking.

**Lock GitHub** clears the in-memory session but keeps the encrypted credential.
**Forget saved token** removes that repository's saved credential and locks the
session. It does not remove your offline book, reading settings or GitHub files,
and it does not revoke the token on GitHub. If you forget the passphrase, forget
the saved credential, create a replacement token in GitHub, and save it with a
new passphrase. You can revoke the old token in GitHub as well.

Saving is optional: entering a token and refreshing without checking Remember
still works for the session only. One encrypted credential is kept per repository
on this browser/device. Expired/revoked tokens still need replacement. Your browser
or password manager may independently offer to save input; that is outside the app.

The token uses browser Web Crypto AES-256-GCM, with a random 16-byte salt and
12-byte IV per save. PBKDF2-HMAC-SHA256 (600,000 iterations) derives a non-exportable
key from the passphrase. Authenticated data binds the ciphertext to its repository.
Only ciphertext and public derivation parameters go into a separate IndexedDB
credential database; the passphrase and key are never persisted. Input fields are
cleared after use. This protects stored credentials, not a device/app already
compromised while unlocked. A weak phrase can still be guessed offline.

References: [Web Crypto deriveKey](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey),
[OWASP cryptographic storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html),
[PBKDF2 parameters](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

Update the existing app repository with all `site/` contents, including the new
`token-vault.js` and `credentials-ui.js`. Open online, close every reader tab/app
window, then reopen. Configuration should show **Reader 0.1.3**. Do not clear site
data; that would delete both the offline book and saved credentials.

## New in 0.1.2

- Outline now offers **Entire Novel**, **Read chapter**, and true single-scene
  selection. A scene selection displays only that scene, not its entire chapter.
  The selected entry is highlighted. Scope and reading position survive reopening.
- The menu shows **Page X / Y · estimate** for the selected scope. Entire Novel
  uses continuous numbering, with each chapter/section starting a new page. The
  cover is separate and is not counted. Chapter and scene views start at page 1.
  Width, text size and line-budget changes recalculate the displayed estimate.
  This is a reading estimate, not a guarantee of Word/publication pagination.
- Previous/Next step pages in Entire Novel, chapters in chapter view, and scenes
  in scene view. Whole-novel pagination yields between chapters so another
  selection can interrupt it without leaving stale pages behind.
- The manuscript stays centred on the screen when Outline/Configuration opens.
  The tool panel is anchored to the far right. Cards use the space on their side;
  on narrow screens the tool panel overlays rather than moving the manuscript.

Update by uploading `site/` contents to the existing app repository. Open online,
close ALL reader tabs/windows, and reopen. Configuration shows **Reader 0.1.2**.
Keep site data to preserve the offline book. No desktop update is needed.

## New in 0.1.1

- Downloads use up to four concurrent GitHub file requests, deduplicate identical
  file contents and reuse unchanged files. All hashes must still pass before the
  offline snapshot is replaced. Real speed depends on GitHub and your connection.
- Equal-height manuscript pages, with an independent vertical scrollbar. Previous
  and Next buttons now live in the top menu. Page numbers describe the selected
  reading scope, not publication numbering. Headings, subtitles and blank lines
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
new service worker can activate. Configuration should show Reader 0.1.3.
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
- Lock GitHub: clear session credentials without removing the offline book or encrypted credential.
- One offline book is retained at a time. Changing repositories asks before
  replacing that copy. A failed or cancelled refresh preserves the previous copy.
- Tokens are persisted only when you explicitly save them with a passphrase,
  and then only encrypted. A fresh session needs the passphrase (or a manually
  entered token) to download/refresh, never to read the offline copy.

## What this version displays

Cover.png, Cover.jpeg, then Cover.jpg in Book/Cards (case-insensitive lookup),
Title.md metadata, original manuscript and chapter/scene outline. Desktop
ordering and formatting helpers are reused: a00 front matter, numeric chapters,
z00 back matter, hidden ! section headings, scene subtitles, emphasis and block
indents. Equals-marked italics are rendered as italics; keep-group markers are
hidden. Original bytes are retained unchanged.

Reading scrolls through pages within the selected novel, chapter or scene. It does not reproduce
the desktop page count or print layout. Notes and translations are downloaded for
snapshot completeness but do not yet have separate viewer panels. Cards can be
shown in the read-only reference slots. Git cannot
represent empty folders. Local desktop .git history is not part of the backup.
Browser-only desktop settings are not in the GitHub snapshot.

## Privacy and limits

Only GET requests to api.github.com; no proxy, analytics, external scripts or
remote manuscript images. Unlocked tokens stay in memory; optional saved tokens
are encrypted with your passphrase. Manuscript content is sanitized before
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
- [ ] Reopen online: saved credentials are locked; the book and reading position remain.
- [ ] Unlock with the passphrase and refresh without pasting the token again.
- [ ] Forget saved token, save a replacement, and verify the book stays intact.
- [ ] Make a desktop change, Send to GitHub, refresh reader, confirm new text.
- [ ] Wrong token or interrupted refresh leaves the earlier offline book readable.

Report tablet model, Chrome version, and any failed item. Never send the token.

## Development

See DEVELOPMENT-PLAN.md in the workspace. `scripts/package-android-reader.py`
refreshes exact copies of the shared desktop modules and creates the ZIP.
Run `node --test tests/android-reader.test.js` and
`node tests/android-reader-browser.cjs` (Playwright required).
