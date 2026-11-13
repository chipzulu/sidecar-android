# Story Sidecar Android Reader 0.1.27

## 0.1.27 — simpler handwriting menu

Removed **Edit typed note** from the handwriting menu. Existing typed content remains readable; pen, eraser, Undo, Cancel changes, More space, Delete note and ✓ are retained. The Pages eraser is unchanged.

This Reader can be paired with BOOX APK 0.1.4 to test **Browser eraser · native pen**. Upload the site files and update the Reader inside the APK. Install the APK over the existing app. Select the combination in the APK toolbar, then choose Pen → Eraser in the note menu. Use Erase on lift · indicator to return to the confirmed native fallback.

## 0.1.26 — left-shift correction

Fixes a 0.1.25 positioning bug: the handwriting offset replaced the page’s `translateX(-50%)` centring transform, moving it right and potentially hiding ✓. The shift now uses a separate CSS variable composed with the existing centring transform. Repeated openings reset the offset before measuring available space, avoiding drift. Accept restores normal centring.

No new APK needed. Upload the site files and update the Reader. The regression test now loads the real Reader stylesheet and checks leftward movement, visible accept controls, repeated opening, full-width bounds and vertical context. Annotation-flow checks also pass. The previous simplified fixture did not include the production centring transform.

## 0.1.25 — configurable handwriting position

Configuration → Handwriting position has two independent checkboxes, remembered on this device:

- **Lift note when editing** (default on): scroll the active note upward once, leaving approximately three manuscript line-heights above it for context. Enough spare scroll space is added for the final note too. Near the beginning of a document there may be fewer context lines available.
- **Move page left when editing** (default off): shift the manuscript and note left by up to 96 CSS pixels, limited by available space so the page stays on-screen. No page-width or pagination change. On an already full-width page there is little or no room to shift. Side cards are temporarily hidden while shifted and return afterward.

Settings apply next time a handwritten note opens. Neither setting repositions after individual strokes. ✓ restores horizontal centring but keeps the vertical position; spare scrolling space is retained until navigation to avoid a jump. All pen/eraser modes remain unchanged. Keep the current APK and your preferred erase-on-lift mode; update only these Reader site files and run the Reader updater.

Chrome checks passed for positioning, final-note lift, screen bounds, unchanged width, and accept position; annotation and simulated-native pen regression checks passed. Check physical writing comfort on the BOOX.

## 0.1.24 — live BOOX erasing

Pair this Reader with **BOOX Test APK 0.1.3**. Upload the site contents, update the Reader inside the APK, and install the APK over the existing app without uninstalling. In the APK toolbar choose **Eraser: Live**; in the note menu select Eraser as usual.

The native octagon retains its independent rendering path. Eraser points are sent in small batches while the pen is down (40 ms minimum scheduling interval, only one unacknowledged batch). Whole strokes disappear in the Reader immediately; their full bounds are acknowledged to the APK for a small-area E-Ink refresh. All samples remain available for the final pen-up catch-up. One Undo restores the complete drag, regardless of batch count. Local note persistence is checkpointed at the end of the gesture, not on every display batch.

The APK toolbar retains **Erase on lift · indicator** and **Erase on lift · fast trail** as fallbacks. Pages/browser erasing is unchanged. Older APKs ignore the live request and continue pen-up erasing; older Readers do not request live batches. Stale/duplicate/out-of-gesture batch messages are ignored. Native input remains busy until the final gesture, so tools/accept cannot split Undo mid-drag.

Build/lint, mock-native live deletion and grouped Undo tests, geometry tests, and browser annotation/refresh regression checks passed. Physical BOOX live refresh/ghosting and its interaction with the smooth octagon still need device testing. Test a long drag over multiple words, lift, Undo, then switch to Pen and write; compare with the pen-up fallback if needed.

## 0.1.23 — native BOOX eraser feedback test

Use Reader 0.1.23 with **BOOX Test APK 0.1.1** for this native-only test. Install the new APK over the old one (same application ID and signing certificate); do not uninstall or clear app data. Upload the Reader site files, then use Configuration → Check for app update inside the APK.

Select Eraser in the note menu. The pad should say **BOOX native eraser · lift pen to erase**. A temporary grey native pen trail replaces the web octagon during contact. Lift the pen to apply whole-stroke erasing within the usual 36 CSS-pixel-wide area along the path. The temporary trail is not stored or sent to GitHub. Undo restores the whole gesture. Choose Pen to return to native handwriting.

This uses the proven native raw-pencil feedback channel for a gesture preview, not a hardware destructive eraser or a native moving octagon. It is a test of responsiveness; latency and trail clearing require physical BOOX validation. No hover cursor is promised. Finger input is explicitly disabled in the native pad.

Normal browsers retain the working octagonal eraser unchanged. The old APK falls back to it and displays an upgrade hint. Capability negotiation prevents an old wrapper from drawing eraser gestures as permanent ink. The new APK continues to support older Readers for handwriting.

Build and Android lint passed; mock-native tests cover native erasure, duplicate/stale messages, tool validation, grouped Undo, switching to Pen, and old-wrapper fallback. Browser annotation and clean-refresh regression checks passed. Signing certificate verified against BOOX Test 0.1.0.

## 0.1.22 — eraser responsiveness

The eraser is now an outlined octagon, using odd/even ray-crossing tests plus segment crossings so long strokes and fast eraser movements are not missed. It has the same 36 CSS-pixel width, with slightly narrower diagonal corners than the previous circle.

The cursor updates once per display frame; all sampled movement segments are retained for erasing. Note geometry is cached during a drag, stroke bounds are prepared once, and only erased stroke elements are removed. No per-sample note measurements or full-note redraws. Undo still restores a whole erasing drag; palm input remains ignored.

A local maximum-note geometry benchmark (2,000 strokes / 24,000 points / 150 movement samples) measured 65.3 ms before and 9.5 ms after. This is desktop computation time, not measured BOOX pen-to-display latency. Browser and simulated-native checks pass; physical tablet response needs testing.

Update the site files and use the existing APK’s Reader updater. No APK reinstall is needed. Erasing still uses browser pen input; selecting Pen restores native handwriting. The SDK’s native eraser path was investigated but is not enabled in this release.

## 0.1.21 — whole-stroke eraser

Hold the note’s corner triangle (or right-click in a browser) and choose **Eraser**. Move the pen’s circular cursor across handwriting to erase whole strokes. Touch/palm input is ignored; a mouse also works for desktop testing. Choose **Pen** from the same menu to write again. **Undo** restores a complete erasing drag, including all strokes it removed. The last 50 actions are undoable during the editing session. ✓ accepts and Cancel changes restores the editing-session starting contents.

The eraser uses a 36 CSS-pixel-wide circle. On BOOX it temporarily closes native raw drawing and uses browser pen events; selecting Pen reconnects the fast native handwriting adapter. No new APK is needed. Physical eraser ends/buttons and partial-stroke cutting are not included in this first step. Existing note storage and PC transfer formats are unchanged.

Upload the ZIP’s site contents to GitHub Pages, then update inside the installed APK or browser Reader. Automated browser and mock-native tests cover erasing, palm rejection, grouped Undo, tool switching and the existing annotation/refresh flow. Physical BOOX eraser responsiveness still needs a device check.

## 0.1.20 — explicit handwriting finish and fresh-copy refresh

Tap a note to edit; tap ✓ to accept. Palm contacts on surrounding prose no longer end or switch the edit. Hold the corner triangle for Undo, Cancel changes, or Delete note. Recovery saving continues while writing.

GitHub → Refresh with fresh copy… asks for confirmation, downloads and verifies the complete book, then clears local drafts, annotations and reading position for that repository. Failed/cancelled downloads retain local work. The remote book and saved token are unchanged. Upload the site files and update inside the existing BOOX APK; no APK reinstall needed.

## Native ink correction and deletion in 0.1.19

Update through Configuration inside the existing BOOX APK after publishing this reader. No APK replacement is required. Native BOOX strokes are no longer classified as menu holds, and browser context-menu events over the active native ink surface are ignored. Native ink remains ink regardless of stroke duration. This addresses a plausible source of the reported 0.1.18 interaction problem; physical-device confirmation is still needed.

**On BOOX, hold the corner triangle** for the note menu (Undo, More space, Delete note, Edit typed note). A short tap on the triangle collapses/expands. Ordinary browser notes still support the existing hold/right-click menu. Tap ✓ to finish writing (updated in 0.1.20).

**Delete note** removes handwriting and typed content after confirmation. Prose and any highlight remain. The deletion state is retained in annotation metadata and can be sent using Send annotations. A later deliberate tap on the retained highlight can start a new note. PC 0.1.135 recognises this state and offers inline collapse and deletion without automatically opening a handwriting transcription card.

## Quiet annotations in 0.1.18

The existing **BOOX Test 0.1.0 APK** works with this release; update the reader through GitHub Pages, then Configuration → Check for app update inside the APK. No APK reinstall is needed.

- Hold the pen on prose to open **Add note here**, **Highlight and annotate**, or **Highlight only**. A mouse right-click also opens the menu.
- **Add note here** creates an inline note attached to nearby text without highlighting it. Its internal anchor is an adjacent character, so deleting that character can leave the note unattached for review. Empty/whitespace-only paragraphs are not position anchors yet.
- For either highlighting action, drag across the passage. The paint follows the selection and settles on words. A tap without dragging cancels the mode. Selection stays within one scene; cross-page selection requires the target text to be reachable in the viewport (automatic edge scrolling is not included).
- Tap an expanded handwritten note to edit. A stronger border indicates the active pad. Tap ✓ to save and finish; the note stays visible.
- Press **▾** in the corner to collapse. **▸** expands it. Collapse state is remembered on this device for each book.
- No permanent Done/Edit/Undo toolbar is shown in the note. In an ordinary browser, hold the pen still inside the active writing area and lift to open **Undo**, **More space**, and **Edit typed note**. On native BOOX, hold the corner triangle instead. Inactive notes also accept a right-click/normal context-menu gesture. Short pen taps remain ink dots.
- **Undo** in the note menu removes the last stroke. The prose menu can undo the most recently created local highlight/note in this session. Undo is local; it does not revoke an annotation already sent to GitHub.
- Handwriting does not open the keyboard. **Edit typed note** is an explicit text-editing action and can use the normal Android keyboard.

Handwriting, highlights, offline recovery and GitHub transfer keep the existing format. PC Sidecar **0.1.134** understands the unpainted position anchor. Freehand arrows/drawing layers and floating thumbnails are deferred.

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
4. Wait for **Reader 0.1.19 is ready**, then tap **Open reader**. Configuration shows the installed version.

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
