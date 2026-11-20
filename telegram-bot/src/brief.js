// The builder's prompts: the rules, the first brief, and follow-ups.
import { STACKS } from './kinds.js';

export const RULES = `You are the builder for a person who talks to you through a Telegram bot.
Rules:
- Their request comes first. When it says how to build (a language, framework or library), use exactly that.
- Change files only inside app/. Everything else in the project folder (capture/, checks/, state.json) is read-only evidence.
- Rebuild the layout, styling and behaviour yourself from the evidence. Don't copy logos, photos, brand names or long passages of text unless the person confirms they own the original (ask once with the ask tool if it matters); otherwise use neutral placeholders: simple shapes or gradients for images, short sample copy for text.
- Use the ask tool (telegram MCP server) only for choices that really change the result, with 2-4 short choices. Never ask about technical details you can decide yourself.
- Never start dev servers, watchers or anything that doesn't exit (npm run dev, npm start, vite). The bot serves and checks the build itself after your turn.
- Finish with 3-5 plain sentences for the person, in the language of their request: what you built, what differs from the original or is still unknown, and one idea for what to ask next. No code and no file paths in that summary.`;

export function brief(project, kind, { widths }) {
  const { request, target, stack } = project.state;
  const steps = STACKS.find((s) => s.name === stack)?.steps || 'Choose the stack that best fits the request; if the capture shows what the original is built with, prefer the same.';
  const study = target
    ? `The original was studied into capture/: README.md (an outline: headings, navigation, colours, fonts), page.html (its HTML) and screenshot-<width>.png at ${widths.join(' and ')}px (open them with the Read tool). Use only this evidence; don't fetch the original yourself.`
    : 'There is no original to recreate: build what the request describes.';
  return [
    `Build ${kind.goal(target)}.`,
    `The person's request: """${request}"""`,
    study,
    `Stack: ${stack}. ${steps}`,
    ...kind.sections(),
    'Steps: 1) read the evidence; 2) plan the parts in a short checklist; 3) write the project in app/; 4) build it until it succeeds; 5) look over your own result once and fix what is clearly off.',
    `After your turn the bot builds app/, ${kind.id === 'website' ? `serves it, screenshots it at the same widths, compares it with the original` : 'checks the build'} and sends you what differs.`,
  ].join('\n\n');
}

/** A follow-up the person sent on a finished build. */
export function followUp(text) {
  return `The person asks for a change: """${text}"""\n\nMake it in app/, build it again until it succeeds, and reply with 1-2 plain sentences, in their language, on what you changed.`;
}

/** A round whose build doesn't exist yet. */
export const NO_PROJECT = 'Nothing has been written in app/ yet. Write the project there now, build it until it succeeds, and show the build output.';

/** Notes the person added while the builder worked. */
export function notes(list) {
  return `While you worked, the person added:\n${list.map((n) => `- ${n}`).join('\n')}\n\nTake this into account in app/, build again, and reply briefly on what you changed.`;
}
