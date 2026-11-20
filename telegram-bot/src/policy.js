// What the builder may do without asking (like Craft Anything's core_action_approve): change files
// inside app/, read anything in the project, and run ordinary build commands. Dev servers and
// watchers are refused (the bot serves and checks the build itself); anything else asks the person.
import path from 'node:path';

const READ_TOOLS = new Set(['Read', 'Glob', 'Grep', 'LS', 'TodoWrite', 'NotebookRead']);
const EDIT_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

// One command segment that's fine to run in the project.
const SAFE = [
  /^(npm|pnpm|yarn|bun) (install|i|ci|add)( [\w@./:^~=<>-]+)*$/,
  /^(npm|pnpm|yarn|bun) (run )?(build|test|lint|typecheck|format)( --?[\w=-]+)*$/,
  /^npx (--yes |-y )?(tsc|vite build|eslint|prettier|create-vite@?[\w.]*|create-react-app)( [\w@./=-]+)*$/,
  /^(node|python3?) --?(version|check)( [\w./-]+)?$/,
  /^(ls|pwd|cat|head|tail|wc|tree|find|grep|rg|echo|mkdir|touch|cp|mv)( [^;&|`$<>]*)?$/,
  /^cd [\w./-]+$/,
  /^cargo (build|check|test|fmt)( --?[\w=-]+)*$/,
  /^(go (build|test|vet)|python3? -m (py_compile|pytest|compileall))( [\w./-]+)*$/,
];
const NEVER = /\b(npm (run )?(dev|start|serve|preview)|vite( dev)?$|vite serve|next dev|nodemon|--watch|watch\b|live-server|http-server|serve -s)\b/;

function inside(dir, file) {
  const rel = path.relative(dir, path.resolve(dir, file));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/** Splits a shell command at &&, ||, ; and | (quotes kept simple: a quoted operator still splits). */
export function segments(command) {
  return String(command)
    .split(/&&|\|\||;|\|/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Decides a tool call: { allow: true } | { allow: false, message } | { ask: true, summary }.
 * `root` is the project folder; `app` the folder the builder works in.
 */
export function decide(toolName, input, { root, app }) {
  if (toolName.startsWith('mcp__telegram__') || READ_TOOLS.has(toolName)) return { allow: true };
  if (EDIT_TOOLS.has(toolName)) {
    const file = input.file_path || input.notebook_path || '';
    if (file && inside(app, path.resolve(root, file))) return { allow: true };
    return { ask: true, summary: `Change a file outside app/: ${file || '(no path)'}` };
  }
  if (toolName === 'Bash') {
    const command = String(input.command || '').trim();
    if (NEVER.test(command)) {
      return { allow: false, message: "Don't start dev servers or watchers: the bot serves and checks the build itself. Run the build command instead." };
    }
    const parts = segments(command);
    // Every word that looks like a path must stay inside the project.
    const pathOk = (w) => w.startsWith('-') || !/[/~]|^\.\./.test(w) || (!w.startsWith('~') && inside(root, path.resolve(root, w)));
    const pathsOk = parts.every((p) => p.split(/\s+/).slice(1).every(pathOk));
    if (parts.length && pathsOk && parts.every((p) => SAFE.some((re) => re.test(p)))) return { allow: true };
    return { ask: true, summary: `Run: ${command.slice(0, 300)}` };
  }
  if (toolName === 'WebFetch' || toolName === 'WebSearch') {
    return { ask: true, summary: `${toolName}: ${input.url || input.query || ''}` };
  }
  return { ask: true, summary: `${toolName}: ${JSON.stringify(input).slice(0, 300)}` };
}
