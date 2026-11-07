# Story Sidecar Android Reader 0.1.8

## Update an installed BOOX or Android reader

1. On the PC, extract the Reader ZIP. Upload the **contents of `site/`** to the root of the **app repository** (`sidecar-android` for this installation). Keep the `shared/` folder. The root should contain `index.html`, `sw.js`, `update.html`, and `update-reader.js` alongside the other app files.
2. Commit the upload and wait for GitHub Pages to finish publishing.
3. On the tablet, open **Configuration → Check for app update**. If the installed version has no update button, open Chrome and visit the [Sidecar update page](https://chipzulu.github.io/sidecar-android/update.html). For another installation, open `update.html` under its own Pages address.
4. Wait for **Reader 0.1.8 is ready**, then tap **Open reader**. Configuration shows the installed version.

Keep the reader’s site data when updating. Clearing it can delete local scene drafts, highlights, the offline book, and saved credentials. If the update page says “Try again,” check that Pages has finished deploying and that the tablet is online. A 404 for `update.html` usually means the file has not reached the published site or was uploaded inside an extra `site/` folder.

## First installation

Publish the files as above, open the [reader homepage](https://chipzulu.github.io/sidecar-android/) in Chrome, and use Chrome’s **Install app** or **Add to Home screen** command. Host only the app code on the public site. Keep the book in its own private repository.

## Download or refresh a book

Open **GitHub**, enter the private book repository as `owner/repository`, enter the branch (usually `main`), and paste a fine-grained token restricted to that repository. Select **Download / refresh book**. **Contents: Read-only** is sufficient for downloading. Use **Contents: Read and write** if you also want to send highlight notes.

This button checks the latest book commit. It reuses unchanged file contents, verifies the downloaded files, and replaces the offline copy after the download completes. The app updater in Configuration updates the Reader software. One book snapshot is available offline at a time. Download limits are 25 MiB per file, 100 MiB per book, and 10,000 files.

If a refresh fails:

- **Offline or could not connect** — open [GitHub’s API](https://api.github.com/) in Chrome on the tablet. A page of text shows that Chrome can reach the public API. Retry in the reader.
- **Timed out** — retry the download. The timeout is 45 seconds per request.
- **Token expired or invalid** — paste a valid token. If GitHub denies access, check its repository and Contents permissions.
- **Repository or branch not found** — check the spelling, branch, and the token’s access to that private repository.

## Remember the GitHub token

Select **Remember token on this device**, enter the same passphrase twice (at least eight characters), then choose **Save token securely**. After reopening the reader, enter the passphrase and choose **Unlock GitHub** before refreshing or sending highlights. Offline reading works while locked.

**Lock GitHub** ends the unlocked session. **Forget saved token** removes the encrypted credential for that repository from this browser. If you forget the passphrase, use that button and save a replacement token. You may use the same passphrase on PC and tablet. Each device keeps its own encrypted token. The reader uses AES-256-GCM and PBKDF2-SHA256 with 600,000 iterations and a fresh salt and IV for each save.

## Read and write

**Outline** opens the cover, entire novel, a chapter, or one scene. The arrows move between pages in Entire Novel, chapters in chapter view, and scenes in scene view. **Configuration** sets page width, lines per page, and reference card columns. Page counts estimate the current reading layout.

Tap a paragraph, choose **Edit scene**, then tap where you want to write. On BOOX, choose the pen in the ONYX keyboard and handwrite in its scribe field. Recognized words appear at the cursor. **Done** returns to paginated reading. Committed edits are saved as a local draft associated with the repository, branch, and scene path. To take a prose draft back to the PC in this release, copy the scene text.

## Highlight and annotate

Tap **Highlight**, then tap the first and last words of the passage in the same scene. Tap the same word twice for a single-word highlight. You can also select words with the normal selection handles and press **Apply highlight**. Choose a colour and optionally write a note. Tap a painted passage to reopen it. Tap **Highlight → Saved highlights** to browse notes. To attach a note elsewhere, open it, choose **Reattach to another passage**, tap the first and last words of the new passage.

To transfer highlights, choose **GitHub → Send highlights** on the tablet. On PC Sidecar **0.1.128** or later, choose **Versioning → Get tablet highlights**. The tablet sends notes on a dedicated GitHub branch. The PC imports them as Markdown files in `Book/Notes`. Hover over a highlight for a preview or click it to open Notes. To return a PC note edit to the tablet, use **Send to GitHub** on PC, then **Download / refresh book** on the tablet.

## Release history

| Reader | Change |
| --- | --- |
| 0.1.8 | Highlight first, then tap the first and last words on the reading page. |
| 0.1.7 | Dedicated update page and Configuration update link for installed readers. |
| 0.1.6 | Download compatibility fix for browsers missing newer cancellation APIs. Clearer connection and timeout messages. |
| 0.1.5 | Brush highlights, attached notes, and manual highlight transfer to PC. |
| 0.1.4 | On-page scene editing, BOOX handwriting input, and offline drafts. |
| 0.1.3 | Optional encrypted token storage and passphrase unlock. |
| 0.1.2 | Entire-novel and single-scene reading, scope-specific page estimates, and a centred manuscript. |
| 0.1.1 | Parallel downloads, measured pagination, configurable page width, and reference cards. |
| 0.1.0 | Private GitHub book download and offline reading. |

## Development

Reader sources are in `android-reader/`. Run `scripts/package-android-reader.py` to refresh shared modules and build the release ZIP. The same guide ships as `site/README.md` for the app repository and `START-HERE.md` for anyone opening the ZIP.
