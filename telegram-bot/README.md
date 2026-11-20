# بوت تيليجرام لإعادة البناء

بوت تيليجرام مبني على نموذج حلقة إعادة البناء في
[Craft Anything](https://github.com/storytold/craft-anything) (`crates/ai/src/rebuild`):
ترسل له رابط موقع و/أو وصفًا، فيدرس الأصل، ويكلّف وكيل برمجة (Claude Code أو Codex أو غيرهما)
ببناء نسخة جديدة، ثم يفحصها ويقارنها بالأصل ويطلب التحسين، ويرسل لك النتيجة والصور.

الكود مكتوب من الصفر بـ Node.js، بلا أي مكتبات خارجية. Playwright اختياري ويُستخدم لالتقاط الصور والمقارنة.

## التشغيل

```bash
cd telegram-bot
cp .env.example .env   # ضع TELEGRAM_BOT_TOKEN و ALLOWED_USERS
npm start
```

المتطلبات:
- Node 20.12 أو أحدث.
- وكيل برمجة مثبّت ومسجَّل الدخول، مثل `claude` أو `codex`.
- Playwright و Chromium، اختياريًا: `npm i -g playwright && npx playwright install chromium`. بدونهما يبني البوت ويفحص البناء، لكنه لا يقارن الصور.

**أمان:** البوت يشغّل وكيلًا يكتب وينفّذ كودًا على جهازك، لذلك لا يستجيب إلا للأرقام المذكورة في `ALLOWED_USERS`. أرسل `/id` للبوت لتعرف رقمك.

## كيف يعمل

```
Study   → capture/: README.md (عناوين، تنقّل، ألوان، خطوط) + page.html + screenshot-<width>.png
Build   → دور واحد للوكيل داخل مجلد المشروع، مع خادم MCP الخاص بالبوت
Check   → يبني app/، يقدّمه محليًا، يصوّره بنفس العروض، ويقدّر التشابه، ويبحث عن العناوين المفقودة
Refine  → يرسل الفروق للوكيل، حتى يصل التشابه إلى GOOD_ENOUGH أو حد MAX_ROUNDS
```

| الملف | المقابل في Craft Anything | الدور |
|---|---|---|
| `src/adapters.js` | `cli_agents/adapters.rs` (`AgentAdapter`) | وسائط كل وكيل وتحليل مخرجاته: Claude Code و Codex ووكيل نصي عام |
| `src/agent.js` | `cli_agents/mod.rs` | تشغيل دور واحد، وبث الأحداث، وحفظ الجلسة للاستئناف |
| `src/mcp-server.js` | `crates/mcp` (`core_person_ask`، `core_action_approve`) | أدوات `ask` و`approve` و`notify` التي يستدعيها الوكيل |
| `src/bridge.js` | `engine::inbox` | جسر محلي (loopback) بين خادم MCP والبوت، محمي برمز سري |
| `src/policy.js` | `core_action_approve` | ما يُسمح به تلقائيًا: التعديل داخل `app/` وأوامر البناء. خوادم التطوير مرفوضة، وكل ما عدا ذلك يُعرض عليك بأزرار |
| `src/kinds.js` | `rebuild/kinds` (`TargetKind`) | نوع المشروع (موقع/تطبيق)، والتقنية الافتراضية، والفحوصات، ورسالة التحسين |
| `src/checks.js` | `rebuild/check.rs`، `Check` | `buildCheck` و`siteCheck`، والقرار يُبنى على قياسات لا على كلام الوكيل |
| `src/study.js` | `rebuild/study.rs` | دراسة الأصل |
| `src/brief.js` | `rebuild/brief.rs` | القواعد، والموجز الأول، والمتابعات |
| `src/rebuild.js` | `rebuild/mod.rs` (`RebuildRun`) | الحلقة الكاملة، والملاحظات أثناء العمل، وإيقاف الوكيل الذي لا يتقدّم |
| `src/bot.js` | `ui-egui` | واجهة تيليجرام: الأوامر، وأزرار الأسئلة والأذونات، والتقدّم، والطابور |

### ربط الوكيل

- **Claude Code**: يُشغَّل بـ `claude -p --output-format stream-json`، والرسالة تصل عبر stdin، والقواعد عبر `--append-system-prompt`. يُستأنف بـ `--resume <session>`. كل طلب إذن يمرّ عبر أداة البوت `--permission-prompt-tool mcp__telegram__approve`، ويُعطَّل `AskUserQuestion` لتحلّ محله أداة `ask`.
- **Codex**: يُشغَّل بـ `codex exec --json --sandbox workspace-write`، ويُعرَّف خادم MCP بخيارات `-c mcp_servers.telegram.*`، ويُستأنف بـ `resume -- <thread>`.
- **أي برنامج آخر**: يُشغَّل بالأمر `AGENT=<program>`، فتصله الرسالة كوسيط أخير ويُقرأ ناتجه كنص.

لإضافة وكيل جديد، اكتب كائنًا فيه `args()` و`parse()` في `src/adapters.js` وأضفه إلى `BUILT_IN`.

## الأوامر

`/new <طلب>` · `/status` · `/stop` · `/check` · `/preview` · `/download` · `/reset` · `/id` · `/help`

- أي رسالة أثناء العمل تُحفظ ملاحظةً، وتصل للوكيل بعد خطوته الحالية.
- أي رسالة بعد الانتهاء تُعدّ طلب تعديل، ويُكمل الوكيل في الجلسة نفسها.
- رسالة "حاول مجددًا" تكمل من حيث توقف العمل.

## الاختبارات

```bash
npm test
```

تشمل الاختبارات مسارًا كاملًا بتيليجرام وهمي ووكيل بديل (`test/fixtures/fake-agent.js`)، إضافة إلى بروتوكول MCP والجسر وسياسة الأذونات وتحليل مخرجات الوكلاء.
