# Story Sidecar Android Reader 0.1.17

## Native BOOX test integration in 0.1.17

In normal Chrome/browser use, drawing follows the 0.1.16 path. Inside the separate **Sidecar BOOX Test** Android app, the reader negotiates a native pen connection. **BOOX native pen** above the handwriting area means native setup completed; **Browser pen** shows fallback and its reason. The wrapper uses its own local storage, so connect and download the book once there. A normal website cannot activate native E-Ink acceleration by itself.

See the separate wrapper README for APK installation and device tests. Native hardware performance has not been measured in this workspace. Existing notes, local recovery, GitHub transfer and desktop compatibility retain their formats.

## Handwriting foundation from 0.1.16

Stroke capture is separated from saving and manuscript layout. Existing ink stays in place after pen-up; only the active stroke is painted on animation frames. Each completed stroke gets a local recovery checkpoint. Scene HTML is updated after an 800 ms pause, or when leaving the note or hiding the app. Failed saves remain visibly reported and can be retried.

The writing area stays still between letters. Use **More space** to extend it. Chrome uses browser input; native acceleration requires the separate test wrapper and physical device testing. See `INK-INPUT.md` for the future adapter contract.

Version 0.1.12 fixed repeated welcome-screen reloads when opening a book downloaded by an older reader. The reader derives the missing identity from the stored book and preserves its drafts and highlights. If the loop prevents opening Configuration, use the update-page link below in Chrome.

## Update an installed BOOX or Android reader

1. On the PC, extract the Reader ZIP. Upload the **contents of `site/`** to the root of the **app repository** (`sidecar-android` for this installation). Keep the `shared/` folder. The root should contain `index.html`, `sw.js`, `update.html`, and `update-reader.js` alongside the other app files.
2. Commit the upload and wait for GitHub Pages to finish publishing.
3. On the tablet, open **Configuration → Check for app update**. If the installed version has no update button, open Chrome and visit the [Sidecar update page](https://chipzulu.github.io/sidecar-android/update.html). For another installation, open `update.html` under its own Pages address.
4. Wait for **Reader 0.1.17 is ready**, then tap **Open reader**. Configuration shows the installed version.

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

Paste a token and select **Remember token on this device** if you want automatic access after reopening. Choose **Save token**, or download directly. Leave the checkbox clear for this session only. The saved token is hidden from the interface and stored in browser storage without passphrase encryption.

**Replace token** opens an empty input. **Cancel** keeps the previous token. **Forget token** removes the credential from this device and ends its active session. It preserves the downloaded book. Tokens saved by older versions with a passphrase require a replacement token.

**Remove book from this device…** deletes the current offline book, its local drafts and annotations after confirmation. It preserves GitHub files and the saved token. This release still holds one downloaded manuscript at a time.

## Read and write

**Outline** opens the cover, entire novel, a chapter, or one scene. The arrows move between pages in Entire Novel, chapters in chapter view, and scenes in scene view. **Configuration** sets page width, lines per page, and reference card columns. Page counts estimate the current reading layout.

Tap a paragraph, choose **Edit scene**, then tap where you want to write. On BOOX, choose the pen in the ONYX keyboard and handwrite in its scribe field. Recognized words appear at the cursor. **Done** returns to paginated reading. Committed edits are saved as a local draft associated with the repository, branch, and scene path. To take a prose draft back to the PC in this release, copy the scene text.

## Recovery compatibility

Pending handwriting records created by 0.1.14 are recovered on opening the book. Keep existing site data when updating.

## Highlight and annotate

Tap **Highlight**, then the first and last words of a passage. A handwriting area opens below it. Write with your stylus. Each completed stroke saves on the device. Use **Undo stroke**, **More space**, or **Clear handwriting**. **Done** leaves the handwritten note visible beneath the passage. Use **Typed note** to add text or change the highlight colour. Fingers can scroll outside the writing area.

**Annotations on/off** shows or hides the highlights and handwritten notes together. Reading pages temporarily grow to hold open handwritten notes. Turning annotations off restores their usual height. Notes stay attached to their passage as the manuscript is paginated. Deleted passages leave an unattached note available under **Highlight → Saved highlights**.

Choose **GitHub → Send annotations** to send handwriting and typed notes. On PC Sidecar **0.1.132** or later, use **Versioning → Get tablet highlights**. Open a highlight or pin its annotation card to see the handwriting and type a transcription alongside it. The PC **Annotations on/off** button controls manuscript highlights and pinned annotation cards.

Handwriting recognition is not included. Test pen responsiveness on your BOOX; the browser saves the original strokes for offline reading and GitHub transfer.


## Release history

| Reader | Change |
| --- | --- |
| 0.1.17 | Add optional native BOOX pen adapter with negotiation, geometry/exclusions, stroke acknowledgement and browser fallback. |
| 0.1.16 | Separate input adapter, retain ink, defer scene rewrites and keep the writing area stationary. |
| 0.1.15 | Restored 0.1.13 input for comparison; user reported similar responsiveness. |
| 0.1.14 | Experimental incremental drawing; user reported substantially slower BOOX pen response. |
| 0.1.13 | Handwritten annotations beneath the prose, original-stroke GitHub transfer, PC display and an annotation visibility layer. |
| 0.1.12 | Fix repeated reloads for books saved without a separate identity record. |
| 0.1.11 | Remember, replace and forget tokens without a passphrase; remove the offline book. |
| 0.1.10 | Tablet scene drafts store marked passages and their notes inline. Hover or tap the mark. Deleted passages leave an unattached note under Saved highlights. |
| 0.1.9 | The installed reader and other open tabs pick up the newly downloaded book. The book status shows its repository and branch. |
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
