// The rebuild loop, as in Craft Anything (crates/ai/src/rebuild):
//
//   Study   capture the original into capture/ (once per project)
//   Build   one builder turn in the project folder, with the bot's MCP server
//   Check   the kind's checks; their results go back to the builder
//   Refine  until the checks are good enough, or the round limit
//
// Notes the person sends while the builder works go in before anything else after its turn.
import { EventEmitter } from 'node:events';
import { runTurn } from './agent.js';
import { RULES, NO_PROJECT, brief, followUp, notes as notesPrompt } from './brief.js';
import { good } from './checks.js';
import { kindById } from './kinds.js';
import { study } from './study.js';

const UNCHANGED_LIMIT = 2; // turns in a row that change nothing in app/
const NOT_WORKING_LIMIT = 5; // rounds in a row whose build doesn't work

export class Cancelled extends Error {}

export class RebuildRun extends EventEmitter {
  /**
   * opts: { adapter, program, extra, model, mcp, maxRounds, goodEnough, widths, turnTimeoutMs,
   *         message (a follow-up), checkOnly }
   */
  constructor(project, opts) {
    super();
    this.project = project;
    this.opts = opts;
    this.notes = [];
    this.abort = new AbortController();
    this.running = false;
  }

  addNote(text) {
    this.notes.push(text);
  }

  stop() {
    this.abort.abort();
  }

  async start() {
    this.running = true;
    const p = this.project;
    try {
      p.state.status = 'working';
      p.save();
      const message = await this.#run();
      p.state.status = 'ready';
      p.save();
      this.emit('finished', { ok: true, message, check: p.state.checks.at(-1) });
    } catch (e) {
      const paused = e instanceof Cancelled || this.abort.signal.aborted;
      p.state.status = paused ? 'paused' : 'failed';
      p.save();
      this.emit('finished', { ok: false, paused, message: paused ? 'Stopped.' : e.message, check: p.state.checks.at(-1) });
    } finally {
      this.running = false;
    }
  }

  #step(text) {
    this.emit('step', text);
  }

  #check() {
    if (this.abort.signal.aborted) throw new Cancelled('Stopped.');
  }

  async #checks(kind, round) {
    const results = [];
    for (const check of kind.checks()) {
      this.#check();
      results.push(await check(this.project, round, { signal: this.abort.signal, widths: this.opts.widths }));
    }
    this.project.state.checks.push(...results);
    this.project.save();
    for (const r of results) this.emit('checked', r);
    return results;
  }

  async #run() {
    const { adapter, goodEnough, maxRounds } = this.opts;
    const p = this.project;
    const kind = kindById(p.state.kind);
    const rules = adapter.systemPrompt ? null : RULES;
    const fresh = () => [rules, brief(p, kind, this.opts)].filter(Boolean).join('\n\n');
    let round = p.state.checks.at(-1)?.round || 0;

    if (this.opts.checkOnly) {
      this.#step('Checking the build…');
      const results = await this.#checks(kind, round + 1);
      return results.map((r) => r.note).join('\n');
    }

    let prompt;
    if (!p.state.studied) {
      this.#step(p.state.target ? 'Studying the original…' : 'Getting ready…');
      const s = await study(p, { widths: this.opts.widths, onStep: (t) => this.#step(t) });
      if (!s.ok) throw new Error(s.note);
      p.state.studied = true;
      p.save();
      this.#step(s.note);
    }
    if (!this.opts.message) prompt = p.state.sessionId ? 'Carry on with the build where you stopped.' : fresh();
    else if (p.state.sessionId) prompt = followUp(this.opts.message);
    else prompt = `${fresh()}\n\n${followUp(this.opts.message)}`;

    let refinements = 0;
    let unchanged = 0;
    let notWorking = 0;
    let retriedSession = false;
    let results = [];
    for (;;) {
      this.#check();
      const before = p.fingerprint();
      this.#step(refinements ? `Round ${refinements + 1}: the builder is fixing what the check found…` : 'The builder is working…');
      const turn = await runTurn({
        adapter,
        program: this.opts.program,
        cwd: p.root,
        prompt,
        systemPrompt: adapter.systemPrompt ? RULES : null,
        mcp: this.opts.mcp,
        model: this.opts.model,
        extra: this.opts.extra,
        resume: p.state.sessionId,
        signal: this.abort.signal,
        timeoutMs: this.opts.turnTimeoutMs,
        onEvent: (e) => this.emit('agent', e),
      });
      if (turn.cancelled) throw new Cancelled('Stopped.');
      if (!turn.ok && turn.sessionMissing && !retriedSession) {
        // The saved conversation is gone: a new one starts from what the project already has.
        retriedSession = true;
        p.state.sessionId = null;
        prompt = fresh();
        continue;
      }
      if (turn.sessionId) p.state.sessionId = turn.sessionId;
      p.save();
      if (!turn.ok) throw new Error(turn.error || 'The builder failed.');
      if (turn.reply) {
        p.state.lastReply = turn.reply;
        p.save();
        this.emit('reply', turn.reply);
      }
      if (this.notes.length) {
        prompt = notesPrompt(this.notes.splice(0));
        unchanged = 0;
        continue;
      }
      unchanged = p.fingerprint() === before ? unchanged + 1 : 0;

      round += 1;
      this.#step(p.state.target ? 'Checking the build against the original…' : 'Checking the build…');
      results = await this.#checks(kind, round);
      notWorking = results.every((r) => r.passed) ? 0 : notWorking + 1;
      if (this.notes.length) {
        prompt = notesPrompt(this.notes.splice(0));
        unchanged = 0;
        continue;
      }
      const bad = results.find((r) => !good(r, goodEnough));
      if (!bad) break;
      if (unchanged >= UNCHANGED_LIMIT) throw new Error(`The builder changed nothing in app/ for ${UNCHANGED_LIMIT} turns in a row, so the build was stopped. Last check: ${bad.note}`);
      if (notWorking >= NOT_WORKING_LIMIT) throw new Error(`The build hasn't worked for ${NOT_WORKING_LIMIT} rounds in a row. Last check: ${bad.note}`);
      if (refinements >= maxRounds) break;
      refinements += 1;
      prompt = p.appIsEmpty() ? NO_PROJECT : kind.refine(bad, round);
    }
    // A site that works but isn't alike enough is still usable; one that doesn't work is not.
    if (!results.every((r) => r.passed)) throw new Error(`The build isn't working yet. ${results.find((r) => !r.passed)?.note || ''}`.trim());
    return results.map((r) => r.note).join('\n');
  }
}
