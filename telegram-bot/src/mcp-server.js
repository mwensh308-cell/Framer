#!/usr/bin/env node
// The MCP server the coding agent starts (stdio, one JSON-RPC message per line). Its tools reach
// the person on Telegram through the bot's loopback bridge:
//   ask      a question with 2-4 choices, shown as buttons (like Craft Anything's core_person_ask)
//   approve  Claude Code's --permission-prompt-tool: the bot's policy decides, or asks the person
//   notify   a short progress line for the person
//
// Usage: node mcp-server.js --bridge http://127.0.0.1:PORT --token TOKEN --project ID
import readline from 'node:readline';
import { pathToFileURL } from 'node:url';

const PROTOCOL = '2025-06-18';

function arg(name, argv = process.argv) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

export const TOOLS = [
  {
    name: 'ask',
    description:
      'Ask the person a question on Telegram and wait for the answer. Use only for choices that really change the result; give 2-4 short choices. Never ask about technical details you can decide yourself.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        choices: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 },
      },
      required: ['question', 'choices'],
    },
  },
  {
    name: 'approve',
    description: 'Permission check for a tool call (used by the agent itself, not called directly).',
    inputSchema: {
      type: 'object',
      properties: { tool_name: { type: 'string' }, input: { type: 'object' }, tool_use_id: { type: 'string' } },
      required: ['tool_name'],
    },
  },
  {
    name: 'notify',
    description: 'Send the person one short line on what you are doing now (at most every few minutes).',
    inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function makeBridgeClient({ bridge, token, project, fetchImpl = fetch, pollMs = 1000 }) {
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const post = async (path, body) => {
    const res = await fetchImpl(`${bridge}${path}`, { method: 'POST', headers, body: JSON.stringify({ project, ...body }) });
    if (!res.ok) throw new Error(`bridge ${path}: HTTP ${res.status}`);
    return res.json();
  };
  const wait = async (id) => {
    for (;;) {
      const res = await fetchImpl(`${bridge}/answer/${encodeURIComponent(id)}`, { headers });
      if (!res.ok) throw new Error(`bridge answer: HTTP ${res.status}`);
      const body = await res.json();
      if (body.done) return body.answer;
      await sleep(pollMs);
    }
  };
  return {
    async ask(question, choices) {
      const { id } = await post('/ask', { question, choices });
      return wait(id);
    },
    async approve(toolName, input) {
      const r = await post('/approve', { tool_name: toolName, input });
      return r.decision ?? (await wait(r.id));
    },
    notify(text) {
      return post('/notify', { text });
    },
  };
}

export async function callTool(client, name, a = {}) {
  if (name === 'ask') {
    const choices = Array.isArray(a.choices) ? a.choices.map(String).slice(0, 4) : [];
    const answer = await client.ask(String(a.question ?? ''), choices);
    return `The person answered: ${answer}`;
  }
  if (name === 'approve') {
    const input = a.input && typeof a.input === 'object' ? a.input : {};
    const d = await client.approve(String(a.tool_name ?? ''), input);
    // Claude Code reads this JSON from the text of the result.
    return JSON.stringify(d.allow ? { behavior: 'allow', updatedInput: input } : { behavior: 'deny', message: d.message || 'The person said no.' });
  }
  if (name === 'notify') {
    await client.notify(String(a.text ?? '').slice(0, 500));
    return 'Sent.';
  }
  throw new Error(`Unknown tool: ${name}`);
}

/** Answers one JSON-RPC message; `null` for notifications. */
export async function handle(client, msg) {
  const reply = (result) => ({ jsonrpc: '2.0', id: msg.id, result });
  switch (msg.method) {
    case 'initialize':
      return reply({
        protocolVersion: msg.params?.protocolVersion || PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: { name: 'craft-telegram-bot', version: '0.1.0' },
      });
    case 'ping':
      return reply({});
    case 'tools/list':
      return reply({ tools: TOOLS });
    case 'tools/call':
      try {
        const text = await callTool(client, msg.params?.name, msg.params?.arguments);
        return reply({ content: [{ type: 'text', text }] });
      } catch (e) {
        if (msg.params?.name === 'approve') {
          // A broken bridge refuses rather than letting everything through.
          return reply({ content: [{ type: 'text', text: JSON.stringify({ behavior: 'deny', message: `The approval check failed: ${e.message}` }) }] });
        }
        return reply({ content: [{ type: 'text', text: e.message }], isError: true });
      }
    default:
      if (msg.id === undefined) return null;
      return { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `Method not found: ${msg.method}` } };
  }
}

async function main() {
  const client = makeBridgeClient({ bridge: arg('bridge'), token: arg('token'), project: arg('project') });
  const write = (m) => process.stdout.write(`${JSON.stringify(m)}\n`);
  readline.createInterface({ input: process.stdin }).on('line', async (line) => {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
      return;
    }
    const out = await handle(client, msg);
    if (out) write(out);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
