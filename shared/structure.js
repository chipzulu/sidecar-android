import { normalizeClockName } from "./clock-names.js";

function numericPrefix(name) {
  return String(name || "").match(/^([az]\d{2}|\d+)(?=$|[\s#.-])/);
}

export function sectionType(name) { return /^[az]\d{2}(?=$|[\s#.-])/.test(String(name)) ? String(name)[0] : ""; }
export function orderPrefix(number, type = "") {
  if (!["", "a", "z"].includes(type) || !Number.isSafeInteger(number) || number < 0 || (type && number > 99)) {
    throw new Error("Section positions must be a00–a99 or z00–z99; chapters use non-negative numbers.");
  }
  return type + String(number).padStart(type ? 2 : 3, "0");
}
export function compareOrderedNames(left, right) {
  const rank = name => ({ a: 0, "": 1, z: 2 })[sectionType(name)];
  return rank(left) - rank(right) || (parseOrderedName(left)?.number ?? Infinity) - (parseOrderedName(right)?.number ?? Infinity) || String(left).localeCompare(String(right), undefined, { numeric: true });
}
export function compareOrderedPaths(left, right) {
  if (!left || !right) return left ? 1 : right ? -1 : 0;
  const a = left.split('/'), b = right.split('/');
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const order = compareOrderedNames(a[i], b[i]);
    if (order) return order;
  }
  return a.length - b.length;
}

export function parseOrderedName(name) {
  const original = String(name || "");
  const extension = original.match(/\.html?$/i)?.[0] || "";
  const stem = extension ? original.slice(0, -extension.length) : original;
  const match = numericPrefix(stem);
  if (!match) return null;
  const type = sectionType(stem);
  if (type && extension) return null;
  const number = Number.parseInt(type ? match[1].slice(1) : match[1], 10);
  if (!Number.isSafeInteger(number) || number < 0) return null;

  let remainder = stem.slice(match[1].length).trim();
  if (remainder.startsWith("-")) remainder = remainder.slice(1).trim();
  const numberOnly = !type && remainder.startsWith("#");
  if (remainder.startsWith("#")) remainder = remainder.slice(1).trim();
  const hiddenTitle = Boolean(type && remainder.startsWith("!"));
  if (hiddenTitle) remainder = remainder.slice(1).trim();
  const [title = "", ...subtitleParts] = remainder.split(/\s+-\s+/);
  return {
    number,
    digits: match[1],
    title: title.trim(),
    subtitle: subtitleParts.join(" - ").trim(),
    numberOnly,
    ...(hiddenTitle ? { hiddenTitle: true } : {}),
    extension
  };
}

export function normalizedOrderedName(name) {
  const parsed = parseOrderedName(name);
  if (!parsed) return null;
  const match = numericPrefix(String(name));
  const prefix = orderPrefix(parsed.number, sectionType(name));
  return normalizeClockName(`${prefix}${String(name).slice(match[1].length)}`, { filesystem: true });
}

export function orderedDisplayName(name) {
  name = normalizeClockName(name);
  const parsed = parseOrderedName(name);
  if (!parsed) {
    return String(name || "").replace(/\.html?$/i, "").trim();
  }
  const title = parsed.title || `Untitled ${parsed.number}`;
  return parsed.subtitle ? `${title} — ${parsed.subtitle}` : title;
}

export function chapterDisplayName(name) {
  const parsed = parseOrderedName(name);
  if (parsed?.numberOnly) return `Chapter ${parsed.number}`;
  return orderedDisplayName(name);
}

export function chapterHeadingParts(name) {
  name = normalizeClockName(name);
  const parsed = parseOrderedName(name);
  if (!parsed) return { title: String(name || "").trim(), subtitle: "" };
  return {
    title: parsed.hiddenTitle ? "" : parsed.numberOnly ? `Chapter ${parsed.number}` : (parsed.title || (sectionType(name) ? parsed.digits : `Chapter ${parsed.number}`)),
    subtitle: parsed.subtitle
  };
}

export function sceneHeadingParts(name) {
  name = normalizeClockName(name);
  const original = String(name || "");
  const stem = original.replace(/\.html?$/i, "");
  const subtitleOnly = stem.match(/^\d+\s+-\s+(.+)$/);
  if (subtitleOnly) {
    const parsed = parseOrderedName(name);
    return {
      number: parsed?.number ?? null,
      privateTitle: "",
      subtitle: subtitleOnly[1].trim()
    };
  }
  const parsed = parseOrderedName(name);
  if (!parsed) {
    const privateTitle = stem.trim();
    return { number: null, privateTitle, subtitle: "" };
  }
  return {
    number: parsed.number,
    privateTitle: parsed.title || `Untitled ${parsed.number}`,
    subtitle: parsed.subtitle
  };
}

export function nextOrderNumber(entries, type = "") {
  const numbers = entries
    .filter(entry => sectionType(entry.name) === type)
    .map((entry) => parseOrderedName(entry.name)?.number)
    .filter(Number.isFinite);
  return numbers.length ? Math.max(...numbers) + 1 : (type ? 0 : 1);
}

export function numberedName(number, title, extension = "", type = "") {
  const cleanTitle = String(title || "").replace(/\s+/g, " ").trim();
  return `${orderPrefix(number, type)} ${cleanTitle}${extension}`;
}

export function planOrderedRenames(entries, description) {
  const occupied = new Map(entries.map((entry) => [entry.name.toLocaleLowerCase(), entry]));
  const numbers = new Map();
  const plans = [];

  for (const entry of entries) {
    const parsed = parseOrderedName(entry.name);
    if (!parsed) {
      throw new Error(`${description} must begin with a number (sections may use a00–a99 or z00–z99): ${entry.name}. Correct the filename in Explorer.`);
    }
    const position = `${sectionType(entry.name)}:${parsed.number}`;
    if (numbers.has(position)) {
      throw new Error(
        `${description} use ${sectionType(entry.name) ? `position ${parsed.digits}` : `number ${parsed.number}`} more than once: ${numbers.get(position)} and ${entry.name}`
      );
    }
    numbers.set(position, entry.name);

    const targetName = normalizedOrderedName(entry.name);
    if (targetName === entry.name) continue;
    const collision = occupied.get(targetName.toLocaleLowerCase());
    if (collision && collision !== entry) {
      throw new Error(`Cannot rename ${entry.name} to ${targetName}; that name already exists.`);
    }
    plans.push({ entry, targetName });
  }
  return plans;
}

async function directoryEntries(handle, cache = null) {
  const entries = [];
  for await (const entry of handle.values()) entries.push(entry);
  cache?.set(handle, entries);
  return entries;
}

async function collectScenePlans(directoryHandle, label, plans, cache) {
  const entries = await directoryEntries(directoryHandle, cache);
  const scenes = entries.filter((entry) => entry.kind === "file" && /\.html?$/i.test(entry.name));
  plans.push(...planOrderedRenames(scenes, `${label} scene files`).map((plan) => ({
    ...plan,
    parent: directoryHandle
  })));
  for (const entry of entries) {
    if (entry.kind === "directory" && entry.name.toLowerCase() !== "notes") {
      await collectScenePlans(entry, `${label}/${entry.name}`, plans, cache);
    }
  }
}

async function collectManuscriptPlans(rootHandle, label, plans, cache) {
  const entries = await directoryEntries(rootHandle, cache);
  const chapters = entries.filter((entry) => entry.kind === "directory");
  const rootScenes = entries.filter((entry) => entry.kind === "file" && /\.html?$/i.test(entry.name));
  plans.push(...planOrderedRenames(chapters, `${label} chapter folders`).map((plan) => ({
    ...plan,
    parent: rootHandle
  })));
  plans.push(...planOrderedRenames(rootScenes, `${label} scene files`).map((plan) => ({
    ...plan,
    parent: rootHandle
  })));
  for (const chapter of chapters) {
    await collectScenePlans(chapter, `${label}/${chapter.name}`, plans, cache);
  }
}

async function copyFile(sourceHandle, targetHandle) {
  const source = await sourceHandle.getFile();
  const writable = await targetHandle.createWritable();
  await writable.write(await source.arrayBuffer());
  await writable.close();
}

async function copyDirectory(sourceHandle, targetHandle) {
  for await (const child of sourceHandle.values()) {
    if (child.kind === "directory") {
      const targetChild = await targetHandle.getDirectoryHandle(child.name, { create: true });
      await copyDirectory(child, targetChild);
    } else {
      const targetChild = await targetHandle.getFileHandle(child.name, { create: true });
      await copyFile(child, targetChild);
    }
  }
}

export async function renameEntryByCopy(parent, entry, targetName) {
  const recursive = entry.kind === "directory";
  try {
    if (recursive) {
      const target = await parent.getDirectoryHandle(targetName, { create: true });
      await copyDirectory(entry, target);
    } else {
      const target = await parent.getFileHandle(targetName, { create: true });
      await copyFile(entry, target);
    }
    await parent.removeEntry(entry.name, { recursive });
  } catch (error) {
    try {
      await parent.removeEntry(targetName, { recursive });
    } catch {
      // The original remains authoritative if cleanup is unnecessary or unavailable.
    }
    throw new Error(`Could not rename ${entry.name} to ${targetName}: ${error.message || String(error)}`);
  }
}

export async function normalizeBookStructure(bookHandle, chaptersHandle, cache = null) {
  const plans = [];
  await collectManuscriptPlans(chaptersHandle, "Book/Chapters", plans, cache);

  try {
    const translations = await bookHandle.getDirectoryHandle("Translations");
    for await (const language of translations.values()) {
      if (language.kind === "directory" && !/^original$/i.test(language.name)) {
        await collectManuscriptPlans(language, `Book/Translations/${language.name}`, plans, cache);
      }
    }
  } catch (error) {
    if (error?.name !== "NotFoundError") throw error;
  }

  const files = plans.filter((plan) => plan.entry.kind === "file");
  if (plans.length) cache?.clear();
  const directories = plans.filter((plan) => plan.entry.kind === "directory");
  for (const plan of [...files, ...directories]) {
    await renameEntryByCopy(plan.parent, plan.entry, plan.targetName);
  }
  return plans.length;
}

async function manuscriptRoots(bookHandle, chaptersHandle) {
  const roots = [{ label: "Original", original: true, handle: chaptersHandle }];
  try {
    const translations = await bookHandle.getDirectoryHandle("Translations");
    for await (const language of translations.values()) {
      if (language.kind === "directory" && !/^original$/i.test(language.name)) {
        roots.push({ label: language.name, original: false, handle: language });
      }
    }
  } catch (error) {
    if (error?.name !== "NotFoundError") throw error;
  }
  return roots;
}

function numberedEntry(entries, kind, number, type = "") {
  return entries.find((entry) => entry.kind === kind && sectionType(entry.name) === type && parseOrderedName(entry.name)?.number === number);
}

function validateRequestedName(name, kind) {
  const parsed = parseOrderedName(name);
  if (!parsed || (kind === "scene" && parsed.number < 1)) {
    throw new Error(`${kind === "chapter" ? "Chapter" : "Scene"} name must begin with a ${kind === "chapter" ? "non-negative" : "positive"} number.`);
  }
  if (kind === "chapter" && parsed.extension) throw new Error("A chapter name cannot have an HTML extension.");
  if (kind === "scene" && !/\.html?$/i.test(name)) throw new Error("A scene name must end with .html.");
  return parsed;
}

async function mirroredChapter(root, chapterName, chapterNumber) {
  const entries = await directoryEntries(root.handle);
  const chapters = entries.filter((entry) => entry.kind === "directory");
  const exact = chapters.find((entry) => entry.name === chapterName);
  if (exact) return exact;
  const conflicting = numberedEntry(chapters, "directory", chapterNumber, sectionType(chapterName));
  if (conflicting) {
    throw new Error(`${root.label} uses chapter ${chapterNumber} as ${conflicting.name}; expected ${chapterName}.`);
  }
  return null;
}

export async function planStructureChange({
  bookHandle,
  chaptersHandle,
  action,
  kind,
  chapterName = "",
  oldName = "",
  newName,
  firstSceneName = ""
}) {
  if (!["create", "rename"].includes(action)) throw new Error(`Unsupported structural action: ${action}`);
  if (!["chapter", "scene"].includes(kind)) throw new Error(`Unsupported structural type: ${kind}`);
  const requested = validateRequestedName(newName, kind);
  const previous = action === "rename" ? validateRequestedName(oldName, kind) : null;
  if (previous && (previous.number !== requested.number || sectionType(oldName) !== sectionType(newName))) {
    throw new Error("Rename cannot change the numeric position. Moving and renumbering are separate operations.");
  }
  if (action === "rename" && oldName === newName) throw new Error("The name has not changed.");
  if (action === "rename" && oldName.toLocaleLowerCase() === newName.toLocaleLowerCase()) {
    throw new Error("A case-only rename is not supported safely on every filesystem.");
  }

  const roots = await manuscriptRoots(bookHandle, chaptersHandle);
  const operations = [];

  if (kind === "chapter") {
    if (action === "create") validateRequestedName(firstSceneName, "scene");
    for (const root of roots) {
      const entries = await directoryEntries(root.handle);
      const chapters = entries.filter((entry) => entry.kind === "directory");
      const position = numberedEntry(chapters, "directory", requested.number, sectionType(newName));
      if (action === "create") {
        if (position && (root.original || position.name !== newName)) {
          throw new Error(`${root.label} already uses chapter ${requested.number}: ${position.name}`);
        }
        if (root.original) operations.push({
          type: "create-chapter",
          label: "Original",
          parent: root.handle,
          name: newName,
          firstSceneName
        });
      } else {
        const source = chapters.find((entry) => entry.name === oldName);
        if (!source) {
          if (position) throw new Error(`${root.label} uses chapter ${previous.number} as ${position.name}; expected ${oldName}.`);
          if (root.original) throw new Error(`Original chapter is missing: ${oldName}`);
          continue;
        }
        if (chapters.some((entry) => entry !== source && entry.name.toLocaleLowerCase() === newName.toLocaleLowerCase())) {
          throw new Error(`${root.label} already contains ${newName}.`);
        }
        operations.push({ type: "rename", label: root.label, parent: root.handle, entry: source, newName });
      }
    }
  } else {
    const chapter = validateRequestedName(chapterName, "chapter");
    for (const root of roots) {
      const chapterHandle = await mirroredChapter(root, chapterName, chapter.number);
      if (!chapterHandle) {
        if (root.original) throw new Error(`Original chapter is missing: ${chapterName}`);
        continue;
      }
      const entries = await directoryEntries(chapterHandle);
      const scenes = entries.filter((entry) => entry.kind === "file" && /\.html?$/i.test(entry.name));
      const position = numberedEntry(scenes, "file", requested.number);
      if (action === "create") {
        if (position && (root.original || position.name !== newName)) {
          throw new Error(`${root.label} already uses scene ${requested.number}: ${position.name}`);
        }
        if (root.original) operations.push({
          type: "create-scene",
          label: "Original",
          parent: chapterHandle,
          name: newName
        });
      } else {
        const source = scenes.find((entry) => entry.name === oldName);
        if (!source) {
          if (position) throw new Error(`${root.label} uses scene ${previous.number} as ${position.name}; expected ${oldName}.`);
          if (root.original) throw new Error(`Original scene is missing: ${oldName}`);
          continue;
        }
        if (scenes.some((entry) => entry !== source && entry.name.toLocaleLowerCase() === newName.toLocaleLowerCase())) {
          throw new Error(`${root.label} already contains ${newName}.`);
        }
        operations.push({ type: "rename", label: root.label, parent: chapterHandle, entry: source, newName });
      }
    }
  }

  return { action, kind, oldName, newName, chapterName, firstSceneName, operations };
}

async function writeEmptyHtml(parent, name) {
  const handle = await parent.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write("<p><br></p>\n");
  await writable.close();
}

export async function executeStructurePlan(plan, onProgress = () => {}) {
  const completed = [];
  try {
    for (const [index, operation] of plan.operations.entries()) {
      await onProgress({ stage: "executing", index: index + 1, total: plan.operations.length, operation });
      if (operation.type === "rename") {
        const oldName = operation.entry.name;
        await renameEntryByCopy(operation.parent, operation.entry, operation.newName);
        completed.push({ type: "rename", parent: operation.parent, kind: operation.entry.kind, oldName, newName: operation.newName });
      } else if (operation.type === "create-scene") {
        await writeEmptyHtml(operation.parent, operation.name);
        completed.push({ type: "remove", parent: operation.parent, name: operation.name, recursive: false });
      } else if (operation.type === "create-chapter") {
        const chapter = await operation.parent.getDirectoryHandle(operation.name, { create: true });
        try {
          await writeEmptyHtml(chapter, operation.firstSceneName);
        } catch (error) {
          await operation.parent.removeEntry(operation.name, { recursive: true });
          throw error;
        }
        completed.push({ type: "remove", parent: operation.parent, name: operation.name, recursive: true });
      }
    }
  } catch (error) {
    await onProgress({ stage: "rollback", error });
    const rollbackErrors = [];
    for (const item of completed.reverse()) {
      try {
        if (item.type === "remove") {
          await item.parent.removeEntry(item.name, { recursive: item.recursive });
        } else {
          const current = item.kind === "directory"
            ? await item.parent.getDirectoryHandle(item.newName)
            : await item.parent.getFileHandle(item.newName);
          await renameEntryByCopy(item.parent, current, item.oldName);
        }
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError.message || String(rollbackError));
      }
    }
    if (rollbackErrors.length) {
      throw new Error(`${error.message || String(error)}\n\nRollback also failed:\n${rollbackErrors.join("\n")}`);
    }
    throw new Error(`${error.message || String(error)}\n\nCompleted steps were rolled back.`);
  }
  return plan;
}
