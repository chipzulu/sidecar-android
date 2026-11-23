# Story Sidecar Android Reader 0.1.71

## Reader 0.1.71 — manuscript menus

Tap to place a caret, or swipe across words with the pen and lift. Space (␣), New line (↵), and Backspace (⌫) edit at the caret or replace the selected text. The new caret and menu stay available for the next correction. New line starts a paragraph. Backspace at the start of a paragraph joins it to the previous one within the scene.

| Passage | Annotation actions |
| --- | --- |
| Plain words | Highlight, Add Note |
| Highlight only | Remove Highlight, Add Note |
| Highlight with a note | Remove Highlight, Open Note, Delete Note |
| Note without colour | Highlight, Open Note, Delete Note |

Removing a highlight keeps any note. Deleting a note keeps any highlight. Annotation-only books offer the annotation and selection actions. Close and tapping outside dismiss the menu. The BOOX pen continues to use the existing APK.

Tapping a working draft also offers Edit Draft, Assimilate and Delete Draft. Space and Backspace keep the draft editable in place.

## Reader 0.1.70 — manuscript caret and selection

Tap manuscript prose to place the caret, or drag the pen across words and lift to select them. Choose Edit for Writer, Keyboard Input for typing, Add Note, Highlight, or Close. Finger swipes scroll.


## Reader 0.1.69 — recognition preview inside the text box

After Aa, recognized text appears inside the conversion text box at the remembered insertion/replacement target. The preview uses the same font size and a lighter grey-green colour with a fine dotted underline. Proposed replacements temporarily take the place of selected words in the display; the original accepted text remains saved unchanged until Accept. Re-conversion replaces the proposal rather than adding another preview. The separate preview below the text box is hidden.

The text box uses the proposed layout for correct wrapping and scrolling, while local storage keeps accepted text and the pending proposal separate. A preview below the visible area is brought into view. Accept commits the proposal and clears the handwriting only after the save succeeds. New handwriting makes the proposal stale and restores the original display until conversion is repeated. While a valid proposal is shown, direct text editing, Backspace/Space/New line and Paste back are disabled to prevent edits using misleading offsets; Accept, reconvert, Clear and Cancel editing remain available.

Validation: Writer conversion browser suite passed, including initial insertion preview, replacement in place, same font size, hidden lower preview, re-conversion, stale-preview removal, accepted text/scene unchanged before acceptance, save-failure retention, successful acceptance and the existing clipboard/Paste back flows. Visual preview checked at 1200×1000. Native bridge mocked; check the lighter text on BOOX. Reader-only update: APK stays 0.1.20, PC stays 0.1.143.


## Reader 0.1.68 — one compact conversion toolbar

The conversion frame now has one toolbar above the text: Accept, ⌫ (Backspace), ␣ (Space), ↵ (New line), Clear and Paste back. Cancel editing appears only when editing manuscript text. The separate bottom toolbar, Append and permanent Copy accepted text button are removed. Origin, target and feedback share a compact information line; existing pending conversion previews remain visible when needed.

Opening a new draft-edit session places the caret at the end of the draft and scrolls the local text box to it. Selection still defines the handwriting replacement target. Backspace deletes selected text or the previous character; Space replaces selected text or inserts at the caret. Accept remains disabled without a valid pending conversion. Clear works on both local writing and manuscript editing without modifying the manuscript until Paste back.

Selecting text in the manuscript or conversion frame offers a small Copy popup. Copy copies the selected words only, without changing the remembered replacement target. Popup display does not pause resumed handwriting. Clipboard access failures produce a message so the system Copy command can be used.

Validation: Writer-conversion browser regression passed, including single-toolbar layout, removed controls, end caret, disabled Accept, Space/Backspace and selected-only Copy in both panes with the replacement target retained. Writer workspace and annotation-flow regressions also passed (the old layout test now expects the conversion textarea introduced in 0.1.66); visual layout checked at 1200×1000. Native input is mocked in browser tests: verify the pen/clipboard interaction on BOOX. Reader update only; APK stays 0.1.20, PC stays 0.1.143.


## Reader 0.1.67 — handwriting revisions at a remembered text position

The conversion frame is now an editable local text surface for ordinary Writer text as well as manuscript drafts. Tap with the pen to place a caret; drag to mark text for replacement. The caret/selection stays visible when you return to handwriting. With no chosen position, recognized text appends at the end (as a new passage). Append resets that default. Delete removes selected text, or backspaces at a caret; Enter inserts a line break. Clear text and Copy accepted text remain available; neither changes the manuscript. Pen selection is implemented in Sidecar and the text field uses inputmode=none to avoid requesting the system handwriting keyboard.

Aa produces a preview with its remembered replacement target. Accept replaces the selection or inserts at the caret and clears the accepted handwriting. A changed text/ink state makes the preview stale, so recognition must be repeated. Draft editing remains plain text in this first editor; existing rich formatting inside rewritten text is not preserved.

Paste back replaces the originating non-assimilated draft while retaining its identity, or the exact manuscript selection that initiated editing. To edit selected ordinary prose, select it, long-press/right-click within it, then choose Edit. With an insertion point, Insert → Write here opens an empty Writer edit tied to that point. Existing whole-scene Edit without a selection remains available. For local writing without an origin, Paste back asks you to tap a manuscript position; tap elsewhere to reposition, then ✓ to insert or × to cancel. No manuscript write happens until Paste back/confirmation. Stale scene contents block replacement rather than silently overwriting newer work.

Validation: Writer integration, working-draft and annotation-flow browser suites passed. Coverage includes pen selection, persistent target, recognized replacement, Delete/Enter/default append, selected manuscript Paste back, repeated occurrences, fresh insertion confirmation/cancellation, local save failures, stale text/scene rejection, accepted text recovery and existing annotations. Native pen/recognition are mocked; physical BOOX verification remains required. Update Reader files on GitHub Pages. APK stays 0.1.20; PC stays 0.1.143.


## Reader 0.1.66 — edit working drafts in the conversion frame

Tap a non-assimilated manuscript block for Assimilate, Edit draft, Close or Delete. Edit draft opens Writer mode and loads the group's text into an editable text box in the Text Conversion Frame. Apply changes replaces that same group, preserving its draft identifier and non-assimilated status. Cancel editing (confirmed) leaves the manuscript unchanged. Delete confirms before removing the whole group and keeps surrounding prose. Existing annotations whose marked text is removed remain in the scene metadata as unattached notes.

Accepted Writer passages remain separate and are restored to view after editing. Converting and accepting handwriting while a draft is open appends the recognized text to that draft. Typed edits and the editing target are saved locally with the Writer state and can be resumed. They are sent to the PC only after Apply changes updates the manuscript scene and Send changes is used. Apply refuses to overwrite a scene changed since editing started. Closing Writer does not apply edits.

This first editor is plain text: unchanged drafts retain formatting; rewriting a draft replaces its internal rich formatting with plain text. Paragraphs and surrounding prose are preserved. A keyboard or the existing handwriting-to-text workflow can edit the text; richer editor tools remain for later.

Validation: Writer-conversion and working-draft browser suites passed. Coverage includes menu labels, editable text, handwriting acceptance into the draft, apply/cancel, stable identity, retained accepted Writer text, blank paragraphs, stale-scene rejection, deletion cancellation and removal without damaging adjacent prose. Native pen input/recognition are mocked in browser tests; verify on BOOX. Reader-only release: APK stays 0.1.20; PC stays 0.1.143.


## Reader 0.1.65 — compact floating manuscript menu

Long-press or right-click prose to open Insert, Edit, Highlight and Note, with a drag handle and × close button. Dragging moves the menu without changing the original insertion/note target; the handle also supports arrow keys. Escape closes the menu. The manuscript toolbar is nonmodal so Highlight can paint words while it remains visible. After painting, Note attaches to the newly highlighted passage. Dialogs and handwriting editing close the menu.

Inside a highlight, Highlight becomes Remove highlight. Removing its colour preserves the prose, annotation identity, attached typed text and ink; it remains anchored and saved through the existing scene/annotation sync format. Note opens the existing annotation instead of creating a second one. Outside a marked passage, Note creates an unhighlighted point note.

Removed Insert accepted text from the conversion panel. Use the manuscript menu's Insert action; in Writer mode it still prefills accepted text. Writer handwriting pauses before manuscript menus and inline-note editing, and resuming Writer closes the inline note editor before taking pen ownership.

Validation: annotation-flow and Writer-conversion browser suites cover compact labels, dragging, highlighting then Note, removing colour with ink retained after reload, insertion, clipboard handling, cancellation and Writer/inline-note input handoff. Native save and recognition regression suites also passed, including 24-stroke save/accept/reload and recognition failures with ink preserved; the native bridge is mocked in these browser tests. Physical BOOX testing remains needed. Reader update only: APK stays 0.1.20 and PC stays 0.1.143.


## Reader 0.1.64 — accepted Writer text at the chosen manuscript location

In Writer mode, long-press manuscript prose and choose Insert text / working draft. The insertion dialog now contains the accepted Writer text, with the selected location preserved; copying first is unnecessary. Pending, unaccepted conversion text is excluded. Review the text, then choose Insert normally or Insert as working draft. Cancelling does not clear accepted text.

Paste clipboard is also available in the insertion dialog. It pastes plain text at the text-box selection/caret. If browser clipboard access is unavailable, the dialog explains how to use the system Paste command. A delayed clipboard read never overwrites edits made while it was pending.

Validation: Writer conversion browser suite passed, including accepted-text prefill, manuscript menu lock release, clipboard success/denial and delayed-paste protection. APK stays 0.1.20; PC stays 0.1.143. Update the Reader files on GitHub Pages; no new APK is needed.


## Reader 0.1.63 — release Writer input lock for manuscript menus

Opening the manuscript context menu now pauses Writer handwriting and releases the native palm lock before showing the popup. Insert-text and working-draft dialogs also pause Writer. Dismissing the menu leaves handwriting paused; tap the Writer pen to resume. Accepted conversion text and handwriting remain saved. APK stays 0.1.20; no new APK installation is needed.

Validation: Writer conversion and annotation-flow browser suites passed. The new regression long-presses prose during active Writer capture, checks native unlock, opens insertion using touch, cancels without losing accepted text, and resumes pen capture. Physical BOOX verification remains required.


## Reader 0.1.62 / APK 0.1.20 — retire BOOX Notes companion; clear conversion text

PC stays 0.1.143. Update the Pages Reader to 0.1.62 and install APK 0.1.20 over the existing app. Sidecar's handwriting recognition, inline working drafts and the native palm/Back protections remain.

Removed the experimental BOOX Notes configuration button, companion dialogs, notebook launcher bridge, companion overlay rendering and creation/assimilation code. Existing companion data is not deleted: pending older text is available read-only under About → Recover older draft text (shown only when there is text), and existing local companion records continue to back up as note files. Recovery never inserts old text into the manuscript automatically. The old modules are no longer packaged or cached; a small legacy-data reader supports preservation only.

The Text Conversion Frame now has Clear text… beside its other controls. Confirm to clear both accepted passages and the pending conversion result. The operation commits the empty text state with the existing ink before clearing the display; cancellation or save failure retains text. Handwriting and manuscript passages already inserted are unchanged. Use the pen to operate controls when the native Writer palm guard is active.

Validation: four browser suites passed (Writer conversion/clear, legacy-data recovery, inline working drafts, handwriting recognition). Clear tests cover cancellation, forced storage failure, successful clearing, retained ink, unchanged inserted manuscript and stored empty text. APK assembly, existing recognition tests and lint passed. Physical-device verification remains needed.


## Working-draft foundation — PC 0.1.143 / Reader 0.1.61

Keep BOOX APK 0.1.19. Update both PC extension and Pages Reader before editing these blocks: older versions do not understand or preserve the new marker.

Non-assimilated text now lives inside the scene HTML as a validated `data-working-draft` span identifier, shared by paragraphs belonging to one inserted block. It has a faint green background and subtle underline, with full-contrast text. The status survives sanitization, scene saving and the normal full Send changes / Receive changes path. It is independent of annotation highlights. Assimilate removes the draft status from that group in the scene without changing its prose or intentional emphasis.

PC: right-click inside manuscript prose to open Insert normally / Insert as working draft. Paste or type into the dialog; insertion uses the saved cursor/selection. Ordinary Ctrl+V remains ordinary paste. Existing working-draft text can be edited directly; right-click it for Assimilate this block. New draft insertion uses direct marked DOM insertion because Chromium's insertHTML was observed stripping the marker; multiline PC insertions use soft breaks inside the group.

Reader: after accepting Writer conversions, choose Insert accepted text… and select a scene and paragraph position (or the beginning of the scene). Choose Insert normally or Insert as working draft. The source accepted text remains available in Writer; insertion does not delete it. In Reader mode, the manuscript context menu offers Insert text / working draft for pasted or typed text. The recognized-handwriting dialog also offers Insert into manuscript… with the same choices. Insertions are explicit paragraph positions in this step, not arbitrary character offsets. Tap a marked draft for Assimilate or Edit scene. The existing annotations-only restriction blocks text insertion/assimilation.

Manuscript DOCX retains ordinary 12 pt prose and emits draft text at 10 pt, without an added label or forced italics; intentional emphasis remains. Publication DOCX (both sizes) and EPUB stop with the affected chapter/scene list until working drafts are assimilated, including empty marked blocks. The old BOOX Notes companion notes remain separate notes; they are not silently converted to this new inline format.

Still for subsequent steps: reopen an inline block in Writer and replace that same block after editing; highlight-removal controls. This release supplies the shared format, insertion, direct scene editing, assimilation, sync and export safeguards.

Validation: 196 unit tests plus five browser suites passed. Working-draft tests cover grouped marker round-trip, preservation of italics, manuscript 10/12 pt output, publication/EPUB rejection, PC insertion/assimilation, tablet insertion/assimilation and Send preparation preserving markers. Writer conversion tests now exercise inserting accepted text into a scene. Existing handwriting, recognition and receive/conflict tests pass.


## Reader 0.1.60 — remove invisible Writer pen exclusion

Step 1 only. Keep BOOX APK 0.1.19 and PC 0.1.142. Update the Pages Reader using this ZIP; no new APK is needed. Non-assimilated draft insertion/export is not implemented in this release.

Reproduced an exclusion below the Writer toolbar caused by descendants of the closed More (⋯) menu retaining layout bounds. The native bridge previously accepted any nonzero button rectangle, even when closed details content was not painted. Closed Writer menu content now explicitly has display:none, and pen exclusions reject hidden/closed-details ancestors. Visible exclusion rectangles are clipped to the actual writing surface and clipping ancestors; controls outside the surface do not create holes. The full visible More popup is protected while open and excluded bounds disappear when it closes. Existing ink coordinates, pressure and save behavior are unchanged.

Validation: the new regression failed before the fix with a blocked point beneath the closed menu. It now passes, including opening/closing the menu and deliberately retained nonzero hidden bounds. Four browser suites pass: Writer ink, native pen bridge, native annotation save/reload, and Writer conversion. Hardware remains mocked in automated tests.

Device test: write strokes through the former dead rectangle below Aa. Open and close ⋯ and repeat, then move/scroll the writing area and repeat. The entire unobscured frame should accept ink. Retain APK 0.1.19's palm/Back protection.


## Native Writer palm gate and input diagnostics — Reader 0.1.59 / APK 0.1.18

Install APK 0.1.18 over the existing app (do not uninstall), and update the Pages Reader to 0.1.59. Both parts are needed. PC remains 0.1.141.

While Writer pen/eraser capture or conversion is active, the Reader signals a native touch lock. The APK rejects non-stylus touch events in Activity.dispatchTouchEvent before they reach the WebView. Stylus and stylus eraser events are passed through. A blocked touch sequence remains blocked through release even if the lock changes. Use the PEN to tap ✓, Aa or other controls while writing; ✓ releases the native lock and restores finger controls. Browser-only Reader retains its existing deliberate-touch toolbar behaviour. The native pen engine and stroke storage are unchanged. Android system gestures may run before Activity dispatch and are not disabled by this gate; Back remains an escape route.

Recent input events appear in About, the update page, and the native reload confirmation. Copy event log is available on About/update. WEB and APK sections each retain at most 120 entries, across reloads/app restarts. Logs contain timestamps, event/tool types, fixed UI identifiers, guard state, navigation category, Back and activity/window focus changes. No manuscript contents, form values, tokens or full URLs are logged. Native input events are rate-limited; drawing movement is not logged. The native reload confirmation shows native events; About/update combine web and native logs. These diagnostics cannot identify an Android overlay by name, but focus/pause/Back events help distinguish system interruptions from app navigation.

Device test: enter Writer, write with your palm resting on the other panel, then press Aa and ✓ using the pen. After ✓, test finger controls. If an unexpected screen opens, copy the event log there, or open Configuration → About and copy it. Include the Reader/APK versions and whether the pen or finger was used. This is a diagnostic test release, not a claim that system-level palm gestures are resolved.

Validation: Writer ink and conversion browser suites pass, including native-lock signaling and event-log persistence on the update page without token values. APK build, existing recognition unit tests and Android lint are checked separately; physical BOOX behavior remains to be tested.


## Writer toolbar tap regression — Reader 0.1.58

Keep BOOX APK 0.1.17. The whole-interface guard in 0.1.57 was too restrictive around the handwriting toolbar. Deliberate small finger taps now work on handwriting and converted-text controls, including ✓ and Aa. Broad/resting contacts and touch navigation elsewhere remain blocked while writing. Pen tool taps are activated on pointer-up; their subsequent WebView compatibility click is suppressed so touch classification cannot swallow the action or invoke it twice. A new pointer gesture resets duplicate suppression, allowing repeated deliberate taps. Resizing is not needed to unlock the tools.

Validation covers native-stroke fixtures followed by pen Aa taps with a touch-classified compatibility click, single recognition invocation, deliberate finger Eraser and Pause, repeated toolbar use, broad palm rejection, header/link protection, conversion/accept/recovery, and workspace layout. All three browser suites pass. Actual Note Max input still requires device confirmation.


## Whole-interface Writer palm protection — Reader 0.1.57

Keep BOOX APK 0.1.17. While Writer handwriting is active, touch contacts are blocked throughout the Reader, including the header, configuration, menus, links and converted-text controls. Previously protection covered selected writing surfaces/tools only. Pen and mouse controls remain available. A short, small finger tap on ✓ pauses writing and restores ordinary finger controls; broad/resting contacts cannot pause. A brief 900 ms quarantine suppresses compatibility mouse clicks left over from blocked touch gestures. Keyboard activation remains available.

This prevents touch-triggered application navigation but cannot intercept Android system navigation or firmware edge gestures. The reported physical BOOX sequence leading to the update page has not been reproduced on hardware; the identified unprotected application controls are now covered. Test with handwriting on the left and your palm on the right: menus should stay closed, pen tools should work, and ✓ should deliberately restore finger navigation. If Android system UI still opens, adjust the BOOX System Navigation bottom gestures separately; Navigation Ball can be positioned away from the palm.

Validation: Writer ink browser suite covers touch contacts on header/mode/library/About/update link/Accept, delayed synthetic mouse clicks, pen menu operation, deliberate Pause, ink persistence and recovery. Conversion and layout suites also pass. Update the Pages site from this ZIP and verify About shows Reader 0.1.57; no APK rebuild is required.


## Writer conversion, step 3 — Reader 0.1.56

Keep BOOX APK 0.1.17 and PC 0.1.141. Upload the ZIP's `site/` contents to Pages and update Reader until About shows 0.1.56. No new APK is needed.

Configuration no longer has a Close button: tap Configuration again or outside the panel. Native Eraser style now lives in Configuration, rather than About.

In Writer mode, use **Aa (Convert)** in the Handwriting strip. BOOX recognition fills one pending passage in Converted text without deleting ink. Convert again replaces only that pending passage. Changing handwriting makes the pending result stale; convert again before accepting. **Accept** atomically saves the passage and clears the handwriting only after the database commit. Earlier accepted passages remain. Failed saves retain ink and text; Retry save is in ⋯. Copy accepted text copies the accumulated passages. Writer ink and text recover per book after closing/reloading and remain local to this device; manuscript insertion and GitHub transfer are later steps. Removing a book or refreshing/overwriting it removes these local drafts after confirmation.

Test: write, Convert, amend ink, Convert again, Accept, then write and accept another passage. Reopen the book and verify both passages. Browser tests cover pending replacement, stale rejection, forced acceptance failure without ink loss, committed acceptance, append/recovery, and existing handwriting/layout behavior. Physical BOOX recognition and palm behavior still need device testing.

For system navigation, BOOX Settings → System Navigation offers navigation-bar/bottom-gesture settings and side gestures (firmware-dependent). The Navigation Ball can be dragged away from the writing hand, for example to the upper left. A swipe down from the top right opens Control Center. Android navigation is outside Reader's touch protection; this release does not change system settings.


## Writer palm and full-height surface fix — Reader 0.1.55

Keep APK 0.1.17 and PC 0.1.141. Two Writer-mode defects are addressed: touch contact on a divider previously paused the pen immediately, and a saved ink surface could occupy only part of a larger handwriting frame.

While handwriting is enabled, palm/finger contacts on the dividers are ignored. Use the pen to resize, or deliberately tap ✓ first and then drag by finger. Tool touches must be a short completed tap with little movement and a small contact area; broad or resting contacts do not trigger Pen/Eraser/Pause. Pen and keyboard controls retain normal behaviour. Hardware may report contact sizes differently, so Note Max palm testing is still needed.

The drawing surface now grows to cover the visible frame when reopening or resizing. Existing stroke coordinates and pressure are preserved; resizing does not stretch or delete the recorded stroke data. Growth waits until the current stroke is finished and is saved with the draft. Undo cannot restore a canvas smaller than the current visible area. The whole handwriting frame uses white to match the native writing surface, eliminating the deliberate colour boundary outside the old shorter canvas. Native refresh quality still requires physical-device verification.

Validation covers broad palm contacts on both dividers and Pause, deliberate short finger taps, reopening a short saved surface, a stroke near the frame bottom, growth after resizing without changes to existing points, saved-draft recovery and save acknowledgements.


## Writer handwriting, step 2 — Reader 0.1.54

Keep BOOX APK 0.1.17 and PC 0.1.141. Upload the Reader ZIP's `site/` contents to the existing Pages repository; use the Reader update flow until About shows 0.1.54. No APK installation is required.

**Reader / Writer** is now a dropdown directly beside the Story Sidecar name. The large workspace toolbar has gone. Writing-side and top/bottom placement controls are under **Configuration → Writer layout**; both draggable edges and remembered proportions remain.

The Handwriting frame now uses the existing native BOOX pen/eraser interface, pressure and thickness settings, with browser pen fallback. A compact icon row contains **Pen, Eraser, Undo, Pause (✓), and More (⋯)**. More offers extra writing space, Clear (with confirmation), Retry save, and Copy ink data (JSON). The browser also offers Save ink copy as a download. Resizing or swapping panels pauses handwriting; select Pen or Eraser to resume. While pen input is enabled, palm/finger contacts cannot draw or scroll the manuscript/converted-text surfaces. Pause allows finger scrolling again. UI controls and Android system controls remain available. Editing annotation handwriting requires returning to Reader mode, so the native pen cannot be attached to two drawing surfaces at once.

One writer draft is saved per book in IndexedDB, separately from annotation localStorage. Completed strokes trigger a transaction immediately; subsequent updates coalesce while a write is in flight. The native saved receipt is emitted only after the database confirms the current draft. Failed saves retain the ink on screen and block leaving the draft until saving succeeds; Retry save or Copy ink data is available. A revision check rejects overwriting a draft changed by another Reader window. Drafts recover after mode changes, book changes, and app reload. Library status shows stored writer strokes. Normal GitHub send/receive retains writer drafts but does **not** send them in this step. Refresh/overwrite and removing a book delete its writer draft after the existing destructive confirmation. Native notebook files are not used.

The Converted text frame remains a placeholder: **Convert and Accept are step 3**; manuscript insertion is step 4. Writer ink is local to this installation for now, not part of GitHub backup. Copy ink data puts JSON on the clipboard so it can be pasted into a text file; the browser also offers a file download. In-app importing that recovery data is not implemented yet. Draft capacity remains 240,000 points / 20,000 strokes, with existing maximum canvas height. No handwriting detail is reduced.

Test on Note Max: choose Writer, write/erase/undo, pause and scroll, resume, change panel layout and resume, then switch Reader/Writer and reopen the app. Check the same strokes return. Compare native writing feel against annotation handwriting. Browser checks cover native-bridge simulation, browser fallback, real mouse/touch divider handling, palm-event filtering, saved draft recovery, per-book isolation, stale-write rejection, and delayed/failed saves without false acknowledgements. Physical BOOX latency and palm ergonomics still require device testing.


## Writer workspace, step 1 — Reader 0.1.53

Use BOOX APK 0.1.17; no APK update is required. PC stays 0.1.141. This release adds a layout preview for a dedicated handwriting workspace, distinct from annotation notes and the external BOOX Notes companion.

Open a book, then **Configuration → Writer mode**. The familiar manuscript remains scrollable and paginated alongside two labelled placeholder frames: Handwriting and Converted text. **Writing side** places the workspace left/right; **Handwriting** places its frame top/bottom. Drag the full shared vertical edge to resize manuscript/workspace, and the shared horizontal edge to resize handwriting/converted text. The green grips indicate the draggable edges, with 28 CSS-pixel hit regions. Keyboard users can focus either separator and use arrow keys or Home/End.

Choose **Reader mode** in the workspace toolbar to leave. Normal manuscript page width and card preferences are retained; corner cards hide temporarily while Writer mode uses that space. Page width shrinks to fit the manuscript column. Outline and Configuration remain available as overlays. Both divider proportions and panel placements are remembered on this device, independently of normal Reader page width. After a reload the app opens through the normal library/reader flow; entering Writer mode restores the arrangement. Resizing preserves the visible manuscript paragraph where it can be located.

There is deliberately no pen capture, conversion, Accept, or insertion inside these new frames yet. Existing annotation handwriting/conversion continues to work separately. This step is for testing panel placement, proportions, and palm comfort on the Note Max. Small windows clamp both columns to fit; on a wide tablet normal minimum columns are 280 CSS pixels and frame minimum heights are 100 CSS pixels.

Validation: browser test exercises both panel orders, real mouse/touch drags, keyboard limits, narrow-window bounds, saved preferences after reload, manuscript-anchor preservation, return to normal width, and absence of prose edits. Physical Note Max layout and palm comfort still need user testing.

Next: connect the proven pen/eraser with durable draft storage; then Convert replaces the pending unit and Accept saves it before clearing handwriting; finally insert accepted text as an unassimilated manuscript block.


## Recognition stroke completion — BOOX APK 0.1.17

Reader stays 0.1.52; PC stays 0.1.141. After the Note Max firmware update, recognition succeeds quickly but can time out after reopening a note. Inspection found a definite encoder defect: a one-point stroke was serialized as DOWN only, without UP. Such strokes are valid for dots or brief taps. The recognition copy now includes a matching UP at the same location; saved ink, pressure, and drawing code remain unchanged. Multi-point strokes retain their original events. This is a candidate fix for the reported timeout, not hardware-confirmed yet; timeouts and service lifecycle are unchanged.

Install APK 0.1.17 over the existing app (versionCode 18, same app ID/signature). No Pages upload is needed. Test Aa on the same note, close the dialog, accept/save the note, reopen, and convert again several times. Also try a note with dotted letters or a full stop. If a timeout persists, report whether repeating Aa without adding ink succeeds. Do not erase the affected note merely to test conversion.

Encoder regression tests decode the actual protobuf and verify balanced DOWN/UP events for dots and mixed strokes, preserved coordinates/pressure, increasing timestamps, empty-stroke handling, and unchanged source ink. Native BOOX service behavior still requires device testing.


## BOOX Notes companion — Reader 0.1.52 / APK 0.1.16

First-stage native Notes workflow. PC remains 0.1.141. Handwriting capture and recognition code are unchanged; direct recognition on Note Max is still awaiting a firmware retest.

### Try it on the Note Max

1. Upload the **contents of `site/`** from the Reader ZIP to the existing Pages repository. Check for update until About shows Reader **0.1.52**.
2. Install APK **0.1.16** over the existing app (do not uninstall). About should show the new APK version.
3. In Configuration, choose **BOOX Notes / converted drafts → Open BOOX Notes**. The APK requests Android adjacent-window launch. If Notes opens full screen, use BOOX system split screen manually: Sidecar left, Notes right. Resize with the system divider. Native notebook selection remains manual.
4. In Sidecar, hold a distinctive paragraph and choose **Paste converted draft after here**. Enter the matching BOOX notebook name. Open Notes, write, convert there, and copy the text.
5. Return to the draft dialog and choose **Replace from clipboard**, or long-press the text field and Paste if clipboard permission is unavailable. Save/close: a dashed draft block appears after the paragraph. Tap it to edit, replace text, or reopen Notes.
6. **Assimilate** inserts ordinary prose paragraphs after confirmation. The separate draft disappears. **Remove draft** removes only the Sidecar draft; native notebooks are untouched.

Drafts autosave on input. They are backed up by full **Send changes** as `Book/Notes/Converted draft <UUID>.md`, including the notebook name and exact insertion anchor. Until assimilation they are absent from scene HTML, so manuscript exports exclude them. On PC they are ordinary note files for now, not inline draft blocks. Assimilated text travels through normal scene sync. Annotation-only restrictions also prohibit creating/assimilating prose drafts. Pending drafts remain accessible from Configuration if their paragraph changed or scene disappeared. Exact repeated paragraphs are rejected as ambiguous. No guessed insertion or automatic private BOOX-file access.

Assimilation journals its before/after HTML locally before updating the scene draft. If storage fails, reopen the draft from Configuration to finish; sending/receiving is blocked while a journal is unfinished. Original native handwriting remains in BOOX Notes, outside Sidecar backup. Refresh-from-remote discards unsent local work as before.

Validation: browser workflow covers persistence, replacement, note/prose separation, stale/repeated anchors, idempotent assimilation and two storage-failure points. Native split-screen placement and notebook launch still need physical-device testing. Android's adjacent launch is best-effort: https://developer.android.com/develop/ui/views/layout/support-multi-window-mode


## 0.1.51 — recognition progress and timeout diagnosis

Pair with BOOX APK 0.1.15; PC remains 0.1.141. The Aa dialog now reports Connecting, Initializing English recognition, and Converting handwriting. Each stage has bounded waiting and a specific failure message. Progress updates keep the dialog listening for the final result. Handwriting is unchanged on failure.

The user confirmed native writing on Note Max after APK 0.1.14, but recognition times out even on a short note. This release diagnoses that failure; it is not yet a confirmed recognition fix. Try English conversion in BOOX Notes, then “Hello world” in Sidecar and report the exact final error.


Validation: large-note transfer round trip (240,000 points), browser conversion/reopen beyond the former limit, and capacity rejection without false save acknowledgement pass. Device performance at maximum size remains to be checked.

## 0.1.50 — larger handwritten notes

Each note now accepts 240,000 points and 20,000 strokes, ten times the former limit. Use PC 0.1.141 and BOOX APK 0.1.13 so transfer/display and conversion accept the same capacity. Existing saved notes need no migration. Individual native pen gestures retain their existing 24,000-point limit; this release increases the total note capacity.

If a stroke exceeds the remaining note capacity, native capture stops with an explicit message instead of continuing to accept unsavable strokes. Rejected strokes are not falsely marked saved. Strokes rejected by the previous release are not recovered by this update. Normal device-storage limits still apply.


## 0.1.49 — BOOX Convert to text test

Use BOOX APK **0.1.12**. The floating handwriting toolbar has an **Aa / Convert to text** button. Write a short English phrase, lift the pen, then press Aa. A dialog shows the recognized text with Copy and Close. Closing resumes note editing; the handwriting is retained unchanged. Nothing is inserted into the manuscript. Existing notes can be tested too.

Conversion uses the BOOX device's local recognition service through the APK. This first test supports English (en_US); ensure English handwriting recognition works in native BOOX Notes first. The browser and old APKs show an explanatory message. Unsupported firmware, empty notes and recognition failures are reported without deleting ink. A request times out rather than leaving the dialog waiting indefinitely.

Install: upload the contents of site/ to your Reader GitHub Pages repository. Install BOOX APK 0.1.12 over the current app, without uninstalling or clearing data. In Configuration → About, check for the Reader update. Confirm Reader 0.1.49 and BOOX 0.1.12.

Tests pass for the simulated bridge, result/error/unsupported cases, native pen reconnection, retained ink after reopening, and existing handwriting workflow. Recognition accuracy and service compatibility require a real BOOX test. The recognition service is undocumented, using the Apache-2.0 AragoniteHWR adapter; it is not a supported public BOOX API.

## 0.1.48 — per-book annotation-only workflow

Use PC 0.1.140 with the existing BOOX APK 0.1.11; no APK update is needed. Upload the contents of `site/` to your Reader hosting repository, then use Configuration → About → Check for app update.

On PC, GitHub → Settings → Allow manuscript editing on tablet controls this book. Save settings and Send changes; on the Reader, Receive changes. With editing disabled, Edit scene is hidden, while highlights and handwriting remain available. Existing prose drafts are retained and counted. Send changes sends annotations only in this mode; annotations tied to changed prose are blocked until editing is enabled and the complete scene can be sent. Settings are a workflow restriction, not security.

Normal Send changes and Receive changes exchange scene text and annotations through the shared book branch. Receive preserves independent local changes and refuses conflicting edits without replacing either copy. Refresh from remote remains the explicit replacement operation. Annotation-only sends preserve unreceived remote prose and track a partial base for later full receive.

Test: disable tablet editing on PC, send, receive on Reader, verify Edit scene is absent, add a note, send, and receive on PC. Re-enable editing and repeat the settings transfer to restore Edit scene. Existing offline books, tokens and handwriting are retained.

Automated browser checks pass for restricted sends, retained drafts, annotation tools, full peer send/receive and interrupted-transfer recovery. Physical tablet testing remains necessary.

## 0.1.39 — sensitivity and compact Configuration

Pressure sensitivity slider ranges from 0.5× to 3.0×, with a more responsive 1.4× default. 1.0× reproduces the original saved pressure response. Higher values reach the same bounded width variation with lighter pressure. Applies to new strokes after reopening a note; previous ink is unchanged. This changes saved strokes and browser live ink. BOOX native fountain preview still uses its SDK curve; no undocumented hardware settings are applied. Keep APK 0.1.9 and PC 0.1.136.

Configuration labels and controls now share a row, with shorter spacing and compact card choices. Longer explanations are under Help. Pressure controls remain usable by touch/pen/keyboard, and About remains at the bottom of the shorter panel.

## 0.1.38 — optional pressure handwriting

Configuration → Pressure sensitivity is off by default. Enable it and reopen a note to use pressure for new strokes. Fine/Medium/Thick remains the base; saved ink varies from 80% to 120% of that width. Existing ink is unchanged. Browser pen devices use PointerEvent pressure; BOOX requires APK 0.1.9, using native fountain preview and normalized device pressure. SDK preview curvature can differ from the subtle saved rendering; verify on the physical tablet. Fixed-width off mode retains native pencil and the established timing.

Install PC extension 0.1.136 before importing pressure notes. It displays saved widths and pressure with the same renderer as this Reader. Older PC releases cannot interpret the new pressure points. Reader 0.1.38 accepts old notes and older APK fixed-width points.

## 0.1.37 — annotation conflict recovery and remote status

Send updates now recovers a missing upload receipt automatically when authored content matches GitHub (ignoring only base bookkeeping). If different, a dialog previews Tablet and GitHub handwriting/text and offers Keep tablet version, Keep GitHub version, or Cancel. Keep tablet uses the previewed GitHub SHA as a compare-and-swap guard; a concurrent remote edit still blocks it. Both candidates are archived locally before a chosen replacement. Cancel preserves the conflicting copies; notes sent earlier in the batch remain sent. Imported base receipts are retained where available.

For the existing “Hej med dig” note: update the Reader without refreshing the book, Send updates, then choose Keep tablet version if its preview is the handwriting you want to send. PC Get tablet highlights retrieves it.

Library ⋯ → Check remote status checks only the repository’s backup commit, without downloading book files or changing local work. Its timestamped result is separate from annotation-inbox status. Existing books/work/tokens are preserved. Keep APK 0.1.8.

## 0.1.36 — book options and Updates

The selected library book has a ⋯ menu: GitHub configuration, Refresh from remote, Remove from this device. Actions target that selected book, independent of the last manuscript opened. Connection changes preserve the local book ID/work and reject duplicate connections. Token controls remain in GitHub configuration. Add book still opens download setup.

Inside a manuscript, Updates offers Send updates (annotations only; typed scene drafts remain local), Receive updates (keeps local work, blocks if a locally edited scene changed/disappeared remotely), and Refresh from remote (confirmed replacement of that book’s local work). Removal also confirms and keeps GitHub files/tokens. Existing books/notes and BOOX APK 0.1.8 remain unchanged.

## 0.1.35 — carousel library entrance

Every fresh launch shows Your library. Covers use Cover.png, Cover.jpeg, then Cover.jpg; a title cover is used when absent. Navigate using arrows, left/right keyboard keys or a horizontal swipe; tap a side book to select it, then the selected cover to open at its remembered position. The + tile / Add book opens the existing GitHub download panel. Library returns from a manuscript after saving its active note. About remains accessible from the library.

Each selected book shows offline availability, locally stored edits, annotations waiting to send, its GitHub connection and recorded receive/annotation-send dates. Remote freshness is explicitly not checked; merely browsing the library makes no GitHub request. GitHub setup remains in its existing panel until step 3. This release preserves 0.1.34 books/work and changes no handwriting code. Keep BOOX APK 0.1.8.

## 0.1.34 — library storage foundation (intentional reset)

First opening clears the old single-book download, drafts, annotations, card placements and reading positions. This reset was explicitly requested; old book content is not migrated. Saved GitHub tokens remain in the separate credentials database. The previous book’s repository/branch is rescued, plus other saved-token repository names (main is suggested where no branch was stored). GitHub settings are available in Saved GitHub connections; redownload your book. Device handwriting preferences are retained.

Books now have independent local UUIDs, snapshots and work keys. Refreshing a repository/branch retains its UUID. Downloading a different book retains previous books. Removing a book clears only its work and snapshot, keeping GitHub credentials. Library metadata stores connection, title and last send/receive times; remote freshness remains not checked. The carousel and library-first launch arrive in step 2. Existing APK 0.1.8 is unchanged.

## 0.1.33 — diagnose missing native handwriting

This is a diagnostic build, not a confirmed fix for the BOOX disappearance. Keep APK 0.1.8. After writing a short word in a fresh note, accept with ✓, then open Configuration → About before reloading. Report the last pen session’s started/received/accepted/rejected counts, last result and saved-note count. No prose, token or stroke coordinates are included in these diagnostics; counts live only in this Reader window. Note save confirmation also shows its stroke count. Full native-message integration test covers 24 strokes, accept and book reload; device-specific failure remains under investigation.

## 0.1.32 — disappearing stroke fix

Fixes incoming single-stroke validation accidentally carrying the whole note’s width list. Valid strokes could be rejected after adding thickness metadata. Closed-note Undo now removes the matching width entry too. Regression covers 24 consecutive strokes at each thickness, save/reopen and Undo followed by writing. Reader-only update; keep APK 0.1.7.

## 0.1.31 — pen thickness and simple collapse control

Configuration → Pen thickness offers Fine (original 2.5), Medium (4), and Thick (6) in note coordinates. Selection applies when opening a note for writing and is remembered on this device. Existing strokes keep their widths. New strokes save optional strokeWidths metadata, retained through erase and Undo. Older ink without metadata uses Fine. Native preview receives the same scaled width; existing APK 0.1.7 needs no update. Pressure sensitivity is not yet implemented.

The triangle only collapses/expands the note, including on a long press; it no longer opens a menu. Tools are in the floating palette, with Cancel changes/Delete under ⋯. Shared desktop rendering source also understands widths; older installed desktop releases still display their original fixed width.

## 0.1.30 — Configuration → About

About holds Reader version, Check for app update and Reload Reader. With BOOX APK 0.1.5 it also shows the native connection status, APK version and existing eraser-mode selector. The native toolbar is removed. Browser users see only applicable controls. Reload asks for confirmation; finish edits first.

Upload the site contents and update the Reader first, then install APK 0.1.5 over the existing APK without uninstalling or clearing data. The APK signing certificate and application ID are unchanged; saved books and eraser preferences are retained. Older APKs retain their toolbar until updated.

Browser annotation regression and About tests pass (native messages simulated), APK build/lint and signing verification pass. Confirm on BOOX: About opens, eraser choices work, reload/update work, handwriting and erasing remain correct. This becomes the baseline after that device check; book carousel is next.

## 0.1.29 — movable handwriting tool palette

Tap a handwritten note to edit: its floating palette provides Pen, Eraser, Undo, **+** More space, **✓** Accept, and **⋯** Cancel changes / Delete note. Pen and Eraser show the active tool in dark green. Existing note-corner collapse and contextual menus remain available; the old separate accept button is replaced by the palette's ✓.

Drag only the dotted handle. Near a left/right screen edge the palette becomes vertical; moving away makes it horizontal. Separate enter/leave thresholds prevent repeated flipping. Position and orientation are remembered per device, across notes/books, and clamped after screen resizing. Arrow keys on the focused handle also move it. The palette disappears when editing finishes. Small screens can scroll the palette if all tools do not fit.

All controls have accessible labels and hover text. The complete palette rectangle is excluded from native pen capture. Pen/eraser storage, native mode selection and Undo semantics are unchanged. No APK update required: publish the site files and update Reader inside the current APK.

Browser checks cover dragging, both orientations, edge hysteresis, no accidental tool switch, viewport bounds, remembered placement, tool selection, More actions and accept cleanup. Annotation lifecycle and mock-native bridge tests passed; the vertical tablet layout was visually inspected. Physical pen handling still warrants a BOOX check.

## 0.1.28 — compact toolbar and dismissible panels

- Outline, Configuration and GitHub close when you tap outside their panels. Their own controls remain usable; Escape also dismisses open panels when no modal dialog is active.
- **Show annotations** is now a Configuration checkbox, retaining the existing saved visibility preference.
- **Text size** is in Configuration, with a manuscript-font sample that updates immediately.
- The toolbar **Highlight** button is removed. Hold/right-click prose for Add note here, Highlight and annotate, or Highlight only.
- **Edit scene** is in that same prose popup and opens the scene at the selected passage, not an unrelated visible scene.
- Saved annotations remain accessible in Configuration. Open panels are excluded from native pen capture.

No new APK: upload these site files and update the Reader in your existing app. Handwriting and eraser modes are unchanged. Chrome checks cover outside dismissal, inside controls, checkbox visibility, sample sizing, correct scene editing and annotation lifecycle; mock-native bridge checks pass. Configuration screenshot reviewed at tablet width.

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

0.1.31 validation: annotation browser flow (configuration, thick drawing, erase/Undo, collapse, cancel/delete) passed; mixed-width JSON roundtrip and legacy rendering passed; simulated native preview-width and bridge regressions passed. Physical BOOX width appearance needs confirmation.

0.1.34 validation: library reset/credential rescue, two-book isolation, switching/removal/reload, annotation flow, fresh-copy failure/cancel preservation and full simulated native-message saving pass in Chrome. Saved tokens are never included in diagnostic output or library metadata.

0.1.35 validation: two-book carousel/cover/placeholder, stored scene resume, return/relaunch, Add book, narrow layout, About and zero GitHub requests passed. Annotation/fresh-copy and simulated-native stroke persistence regressions passed. Tablet and narrow-screen screenshots reviewed.

0.1.36 validation: selected-book settings/removal and cancel, duplicate connection rejection, stable IDs/work after relink, remote/local scene conflict preservation, fresh copy/cancel/failure and simulated native handwriting persistence passed. Narrow book-options dialog visually reviewed. Physical tablet workflow check remains.

0.1.37 validation: receipt unit tests and full browser conflict tests passed (preview/cancel/tablet/remote, second edit/send and reload). Concurrent changes reject stale approvals. Library matching/different backup checks use only GET metadata and preserve downloaded commit. Annotation regression passes. Dialog screenshot visually reviewed. Tablet/PC live exchange still needs confirmation.

0.1.38 verification: pressure validation, normalized native samples, browser live input, bounded widths, erase/Undo and saved SVG roundtrip passed. Pressure notes also pass conflict resolution, repeated upload and reload. Existing fixed-width native and annotation regression checks pass. Hardware is mocked in browser tests; BOOX curve and latency need physical confirmation.

0.1.39 validation: slider value/persistence, more responsive default and capped gain, pressure capture/eraser/Undo, transfer/reopen and annotation regressions passed. Configuration screenshot at 800×1100 shows all controls through About without scrolling; shorter screens remain scrollable.

## Reader 0.1.40 — page-width drag
The resize handle is now on the left edge. Drag left to widen, right to narrow. Configuration temporarily hides while dragging, keeping the centred page visible with a small current-width indicator. Release or cancel restores Configuration; width is saved. No APK update needed.

## Reader 0.1.41 — resize handle position
Moved the fixed resize controls outside the transformed manuscript scroll container, so viewport coordinates are accurate. The handle sits entirely left of the page with a small gap, rather than overlapping the paper. No APK update needed.

## Native save activity strip
Reader 0.1.42 + APK 0.1.10: the left edge of the writing area pulses on completed native strokes. Pending local-save confirmations grow the amber strip (full at 12); after 10 seconds it turns red. Confirmations shrink it. Render acknowledgement and local-storage confirmation are separate. This is not a GitHub sync indicator or recovery system. A frozen native process can freeze the indicator too. Install APK over the existing app; do not clear data.

## Pen-input regression investigation
Reader 0.1.43 / APK 0.1.11 removes the separate native SaveStrip overlay and its E-Ink update calls. The APK still owns pending-save counts and sends save-state events; the Reader draws the strip within the note SVG. This restores the prior native view arrangement. Device testing is required to confirm the reported connected-but-no-strokes regression is resolved.

## Reader 0.1.44 — persistent save mark
With BOOX APK 0.1.11, confirmed local saves leave a green mark on the note’s left edge. It alternates between short and longer lengths on confirmation rather than flashing or fading. Pending strokes grow an amber strip; after ten seconds without confirmation it turns red. A new editing session starts without a green mark until a save is confirmed. No new APK is needed. This does not change native ink handoff refresh or resolve device freezes.

## 0.1.45 — peer-sync Step 1
Verified downloaded snapshots now supply a shared base commit and file hashes. New local scene drafts retain original content for later three-way comparison; annotation edits retain their originating scene reference. Older drafts with an unmatched starting hash are marked unknown. Changing repository clears the old shared base without clearing local work. Updates shows the shared commit and local scene-draft count.

Transfers are unchanged: Send updates still sends annotations only. Prose drafts are still local; peer text transfer and conflict resolution come in later steps. No APK update is needed (keep 0.1.11). Existing books and work are retained; no reset or re-download is required.

## 0.1.46 — Send changes (Step 2)
Send changes now publishes saved prose and inline annotations together, plus annotation records, to the configured book branch. It uses a normal non-force commit and requires Contents read/write permission. Remote changes stop the send; local work stays on the device. Failed or interrupted sends preserve work and support safe retries. Successful sends update the shared base and clear only the captured edits. No APK update (keep 0.1.11).

PC scene receiving comes in Step 3 and is not in this release. Test with a test-book repository: change a short sentence, add a note, send, and inspect the scene HTML and Book/Notes on GitHub. Do not expect the old PC annotation-inbox button to fetch these new scene changes.

## 0.1.47 — Receive changes
Normal receiving now compares shared-base/local/remote files. Independent changes are preserved; identical edits settle. Any conflicting file stops the whole receive and lists paths; the existing book and drafts remain. No merge UI yet. Use PC 0.1.139 for Receive changes on the desktop. Keep APK 0.1.11. Refresh from remote still deliberately discards local work and is not conflict resolution.
