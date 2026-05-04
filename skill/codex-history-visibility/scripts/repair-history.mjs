import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const sessionsRoot = path.join(codexHome, "sessions");
const archivedRoot = path.join(codexHome, "archived_sessions");
const stateDbPath = path.join(codexHome, "state_5.sqlite");
const globalStatePath = path.join(codexHome, ".codex-global-state.json");

function run(command, args, options = {}) {
  console.log(`> ${[command, ...args].join(" ")}`);
  execFileSync(command, args, {
    stdio: "inherit",
    windowsHide: true,
    ...options,
  });
}

function runCodexProvider(args) {
  if (process.platform === "win32") {
    run("cmd.exe", ["/c", "codex-provider.cmd", ...args]);
    return;
  }
  run("codex-provider", args);
}

function walkJsonl(root, result = []) {
  if (!fs.existsSync(root)) {
    return result;
  }
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walkJsonl(fullPath, result);
    } else if (entry.isFile() && entry.name.startsWith("rollout-") && entry.name.endsWith(".jsonl")) {
      result.push(fullPath);
    }
  }
  return result;
}

function readFirstLine(filePath) {
  const fd = fs.openSync(filePath, "r");
  try {
    const chunks = [];
    const buffer = Buffer.alloc(64 * 1024);
    let position = 0;
    while (true) {
      const read = fs.readSync(fd, buffer, 0, buffer.length, position);
      if (read <= 0) {
        break;
      }
      const chunk = buffer.subarray(0, read);
      const newline = chunk.indexOf(0x0a);
      if (newline !== -1) {
        chunks.push(chunk.subarray(0, newline));
        break;
      }
      chunks.push(chunk);
      position += read;
    }
    return Buffer.concat(chunks).toString("utf8").replace(/\r$/, "");
  } finally {
    fs.closeSync(fd);
  }
}

function collectRolloutCwds() {
  const byId = new Map();
  for (const filePath of [...walkJsonl(sessionsRoot), ...walkJsonl(archivedRoot)]) {
    try {
      const parsed = JSON.parse(readFirstLine(filePath));
      const id = parsed?.payload?.id;
      const cwd = parsed?.payload?.cwd;
      if (typeof id === "string" && id && typeof cwd === "string" && cwd.trim()) {
        byId.set(id, cwd);
      }
    } catch {
      // Skip malformed or non-session metadata files.
    }
  }
  return byId;
}

function normalizeComparable(value) {
  if (typeof value !== "string") {
    return null;
  }
  let normalized = value.trim();
  if (!normalized) {
    return null;
  }
  normalized = normalized.replace(/^\\\\\?\\/, "");
  normalized = normalized.replace(/\//g, "\\");
  normalized = normalized.replace(/\\+$/, "");
  return normalized.toLowerCase();
}

function toDesktopPath(value) {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  if (trimmed.startsWith("\\\\?\\")) {
    return trimmed.slice(4).replace(/\//g, "\\");
  }
  return trimmed.replace(/\//g, "\\");
}

function dedupe(paths) {
  const seen = new Set();
  const result = [];
  for (const raw of paths) {
    const value = toDesktopPath(raw);
    const key = normalizeComparable(value);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }
  return result;
}

function syncSqliteCwdsFromRollouts() {
  if (!fs.existsSync(stateDbPath)) {
    console.log("state_5.sqlite not found; skipped SQLite cwd repair.");
    return;
  }
  const byId = collectRolloutCwds();
  const db = new DatabaseSync(stateDbPath);
  let changed = 0;
  try {
    db.exec("PRAGMA busy_timeout=5000; BEGIN IMMEDIATE");
    const stmt = db.prepare("UPDATE threads SET cwd = ? WHERE id = ? AND COALESCE(cwd, '') <> ?");
    for (const [id, cwd] of byId) {
      const desktopCwd = toDesktopPath(cwd);
      changed += stmt.run(desktopCwd, id, desktopCwd).changes ?? 0;
    }
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // Preserve the original error.
    }
    throw error;
  } finally {
    db.close();
  }
  console.log(`SQLite cwd repair: ${changed} row(s) updated from rollout metadata.`);
}

function resetSidebarState() {
  if (!fs.existsSync(globalStatePath)) {
    console.log(".codex-global-state.json not found; skipped UI state reset.");
    return;
  }
  const state = JSON.parse(fs.readFileSync(globalStatePath, "utf8"));
  const atomState = state["electron-persisted-atom-state"] ||= {};
  const active = dedupe(Array.isArray(state["active-workspace-roots"]) ? state["active-workspace-roots"] : []);
  const roots = dedupe([
    ...active,
    ...(Array.isArray(state["project-order"]) ? state["project-order"] : []),
    ...(Array.isArray(state["electron-saved-workspace-roots"]) ? state["electron-saved-workspace-roots"] : []),
  ]);
  const fallbackRoot = os.homedir().replace(/\//g, "\\");
  const nextRoots = roots.length > 0 ? roots : [fallbackRoot];

  state["active-workspace-roots"] = active.length > 0 ? active : [nextRoots[0]];
  state["project-order"] = nextRoots;
  state["electron-saved-workspace-roots"] = nextRoots;
  atomState["sidebar-workspace-filter-v2"] = "all";
  atomState["sidebar-collapsed-groups"] = {};
  atomState["app-shell:right-panel-width:v2:/local/:conversationId"] = 360;

  const stamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15);
  const backupPath = `${globalStatePath}.history-sync-${stamp}.json`;
  fs.copyFileSync(globalStatePath, backupPath);
  fs.writeFileSync(globalStatePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  console.log(`UI state reset. Backup: ${backupPath}`);
}

runCodexProvider(["sync"]);
syncSqliteCwdsFromRollouts();
resetSidebarState();
runCodexProvider(["status"]);
