// One builder turn: start the agent in the project folder, stream its events, and return what it
// said and the session to resume next time.
import { spawn } from 'node:child_process';
import readline from 'node:readline';

export function runTurn({ adapter, program, cwd, prompt, systemPrompt, mcp, model, resume, extra, signal, timeoutMs = 30 * 60_000, onEvent = () => {} }) {
  return new Promise((resolve) => {
    const args = adapter.args({ prompt, systemPrompt, mcp, model, resume: adapter.resumes ? resume : null, extra });
    const state = { sessionId: resume || null, sessionMissing: false };
    let reply = '';
    let ok = false;
    let error = null;
    let costUsd;
    let sawResult = false;
    const stderr = [];

    let child;
    try {
      child = spawn(program || adapter.program, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, CI: '1' } });
    } catch (e) {
      resolve({ ok: false, error: e.message, reply: '', sessionId: state.sessionId });
      return;
    }

    const emit = (e) => {
      if (e.type === 'text') reply += (reply ? '\n' : '') + e.text;
      if (e.type === 'error') error = e.message;
      if (e.type === 'result') {
        sawResult = true;
        ok = e.ok !== false && !error;
        if (e.text) reply = e.text;
        costUsd = e.costUsd;
      }
      onEvent(e);
    };

    const stop = () => {
      child.kill('SIGTERM');
      setTimeout(() => child.exitCode === null && child.kill('SIGKILL'), 5000).unref();
    };
    const timer = setTimeout(() => {
      error = `The agent ran past ${Math.round(timeoutMs / 60000)} minutes and was stopped.`;
      stop();
    }, timeoutMs);
    signal?.addEventListener('abort', stop, { once: true });

    readline.createInterface({ input: child.stdout }).on('line', (line) => {
      if (adapter.plainText) {
        emit({ type: 'text', text: line });
        return;
      }
      let v;
      try {
        v = JSON.parse(line);
      } catch {
        if (line.trim()) onEvent({ type: 'status', text: line.trim().slice(0, 200) });
        return;
      }
      for (const e of adapter.parse(state, v)) emit(e);
    });
    child.stderr.on('data', (d) => {
      stderr.push(d.toString());
      if (stderr.length > 50) stderr.shift();
    });

    child.on('error', (e) => {
      error = e.code === 'ENOENT' ? `"${program || adapter.program}" isn't installed or isn't on PATH.` : e.message;
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (signal?.aborted) error = 'Stopped.';
      // A plain program has no final event: exiting cleanly is its result.
      if (!sawResult) ok = code === 0 && !error;
      if (code !== 0 && !error) error = stderr.join('').trim().split('\n').slice(-5).join('\n') || `The agent exited with code ${code}.`;
      resolve({ ok: ok && !error, error, reply: reply.trim(), sessionId: state.sessionId, sessionMissing: state.sessionMissing, costUsd, cancelled: !!signal?.aborted });
    });

    if (adapter.promptOnStdin) child.stdin.end(prompt);
    else child.stdin.end();
  });
}
