#!/usr/bin/env node
// A stand-in for Claude Code: reads the message on stdin, writes a small site into app/, and prints
// stream-json like the real one. FAKE_AGENT_MODE=nothing writes nothing; =fail ends with an error.
import fs from 'node:fs';
import path from 'node:path';

const say = (v) => process.stdout.write(`${JSON.stringify(v)}\n`);
let prompt = '';
process.stdin.on('data', (d) => (prompt += d));
process.stdin.on('end', () => {
  const resume = process.argv.includes('--resume') ? process.argv[process.argv.indexOf('--resume') + 1] : null;
  const session = resume || 'fake-session-1';
  fs.appendFileSync(path.join(process.cwd(), 'prompts.log'), `${JSON.stringify({ resume, prompt })}\n`);
  say({ type: 'system', subtype: 'init', session_id: session, mcp_servers: [{ name: 'telegram', status: 'connected' }] });
  const mode = process.env.FAKE_AGENT_MODE || 'site';
  if (mode === 'fail') {
    say({ type: 'result', subtype: 'error', is_error: true, result: 'Credit balance is too low', session_id: session });
    return;
  }
  if (mode === 'site') {
    const app = path.join(process.cwd(), 'app');
    fs.mkdirSync(app, { recursive: true });
    const n = (fs.existsSync(path.join(app, 'n')) ? Number(fs.readFileSync(path.join(app, 'n'), 'utf8')) : 0) + 1;
    fs.writeFileSync(path.join(app, 'n'), String(n));
    fs.writeFileSync(path.join(app, 'index.html'), `<!doctype html><title>Fake</title><h1>Hello ${n}</h1>`);
    say({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'Write', input: { file_path: 'app/index.html' } }] }, session_id: session });
    say({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }] }, session_id: session });
  }
  say({ type: 'assistant', message: { content: [{ type: 'text', text: 'I built a page.' }] }, session_id: session });
  say({ type: 'result', subtype: 'success', is_error: false, result: 'I built a small page with a heading.', total_cost_usd: 0.01, session_id: session });
});
