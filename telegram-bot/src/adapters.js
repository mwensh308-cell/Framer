// How each coding agent is driven: its arguments, how the message reaches it, and how its output
// stream becomes events. Modelled on Craft Anything's `AgentAdapter` (crates/ai/src/cli_agents).
//
// Events a parser returns:
//   { type: 'text', text }            the agent's words
//   { type: 'tool', id, name, input } a tool call started
//   { type: 'tool_done', id, ok, text }
//   { type: 'status', text }
//   { type: 'error', message }
//   { type: 'result', text, costUsd } the turn ended

export const MCP_NAME = 'telegram';
export const ASK_TOOL = `mcp__${MCP_NAME}__ask`;
export const APPROVE_TOOL = `mcp__${MCP_NAME}__approve`;

function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((c) => c?.text ?? '').join('');
  return '';
}

/** Claude Code: `claude -p --output-format stream-json`, the message on stdin. */
export const claudeCode = {
  id: 'claude-code',
  program: 'claude',
  promptOnStdin: true,
  resumes: true,
  // The brief goes in as a system prompt, so a resumed session keeps it.
  systemPrompt: true,
  args({ systemPrompt, mcp, model, resume, extra = [] }) {
    const mcpJson = JSON.stringify({ mcpServers: { [MCP_NAME]: { command: mcp.command, args: mcp.args } } });
    const a = [...extra, '-p', '--output-format', 'stream-json', '--verbose'];
    if (systemPrompt) a.push('--append-system-prompt', systemPrompt);
    if (model) a.push('--model', model);
    if (resume) a.push('--resume', resume);
    // Every permission question goes to our approve tool, which the bot shows as buttons;
    // the agent's own question tool is replaced by ours.
    a.push('--permission-prompt-tool', APPROVE_TOOL, '--disallowedTools', 'AskUserQuestion');
    a.push('--strict-mcp-config', '--mcp-config', mcpJson);
    a.push('--allowedTools', `mcp__${MCP_NAME}__*`, 'Read', 'Glob', 'Grep', 'TodoWrite');
    return a;
  },
  parse(state, v) {
    const out = [];
    if (typeof v.session_id === 'string') state.sessionId = v.session_id;
    switch (v.type) {
      case 'system':
        if (v.subtype === 'init') {
          const ours = (v.mcp_servers || []).find((s) => s.name === MCP_NAME);
          if (ours && ours.status !== 'connected') out.push({ type: 'error', message: `The bot's tools didn't start in Claude Code (${ours.status}).` });
        }
        break;
      case 'assistant':
        for (const b of v.message?.content || []) {
          if (b.type === 'text' && b.text) out.push({ type: 'text', text: b.text });
          if (b.type === 'tool_use') out.push({ type: 'tool', id: b.id, name: b.name, input: b.input ?? {} });
        }
        break;
      case 'user':
        for (const b of v.message?.content || []) {
          if (b.type === 'tool_result') out.push({ type: 'tool_done', id: b.tool_use_id, ok: !b.is_error, text: textOf(b.content) });
        }
        break;
      case 'result': {
        const text = typeof v.result === 'string' ? v.result : '';
        if (v.is_error) {
          if (/no conversation found/i.test(text)) state.sessionMissing = true;
          out.push({ type: 'error', message: text || v.subtype || 'The turn failed.' });
        }
        out.push({ type: 'result', text, costUsd: v.total_cost_usd, ok: !v.is_error });
        break;
      }
    }
    return out;
  },
};

function toml(s) {
  return JSON.stringify(String(s));
}

/** Codex: `codex exec --json`, sandboxed to the project folder, the message on stdin. */
export const codex = {
  id: 'codex',
  program: 'codex',
  promptOnStdin: true,
  resumes: true,
  // Codex takes no system prompt flag: the brief is the first message.
  systemPrompt: false,
  args({ mcp, model, resume, extra = [] }) {
    const a = ['exec', '--json', '--skip-git-repo-check', '--sandbox', 'workspace-write'];
    a.push('-c', `mcp_servers.${MCP_NAME}.command=${toml(mcp.command)}`);
    a.push('-c', `mcp_servers.${MCP_NAME}.args=[${mcp.args.map(toml).join(', ')}]`);
    // `codex exec` can't ask the person itself, so our ask tool must not need its approval.
    a.push('-c', `mcp_servers.${MCP_NAME}.tools.ask.approval_mode="approve"`);
    if (model) a.push('-m', model);
    a.push(...extra);
    if (resume) a.push('resume', '--', resume);
    a.push('-');
    return a;
  },
  parse(state, v) {
    const out = [];
    if (typeof v.thread_id === 'string') state.sessionId = v.thread_id;
    const item = v.item || {};
    if (v.type === 'item.completed' && item.type === 'agent_message') {
      out.push({ type: 'text', text: item.text || '' });
      state.lastText = item.text || '';
    } else if (v.type === 'item.started' && item.type === 'command_execution') {
      out.push({ type: 'tool', id: item.id, name: 'Bash', input: { command: item.command } });
    } else if (v.type === 'item.completed' && item.type === 'command_execution') {
      out.push({ type: 'tool_done', id: item.id, ok: item.exit_code === 0, text: item.aggregated_output || '' });
    } else if (v.type === 'item.completed' && item.type === 'file_change') {
      for (const c of item.changes || []) out.push({ type: 'tool', id: item.id, name: 'Edit', input: { file_path: c.path } });
    } else if (v.type === 'item.started' && item.type === 'mcp_tool_call') {
      out.push({ type: 'tool', id: item.id, name: item.tool, input: item.arguments ?? {} });
    } else if (v.type === 'turn.completed') {
      out.push({ type: 'result', text: state.lastText || '', ok: true });
    } else if (v.type === 'turn.failed' || v.type === 'error') {
      const message = v.error?.message || v.message || 'unknown error';
      out.push({ type: 'error', message }, { type: 'result', text: '', ok: false });
    }
    return out;
  },
};

/** Any other program: the message as its last argument, its output read as plain text. */
export function plain(program) {
  return {
    id: 'plain',
    program,
    promptOnStdin: false,
    resumes: false,
    systemPrompt: false,
    plainText: true,
    args({ prompt, extra = [] }) {
      return [...extra, prompt];
    },
    parse() {
      return [];
    },
  };
}

const BUILT_IN = [claudeCode, codex];

/** The adapter registered under `id`; anything else runs as a plain program of that name. */
export function adapterFor(id) {
  return BUILT_IN.find((a) => a.id === id || a.program === id) || plain(id);
}
