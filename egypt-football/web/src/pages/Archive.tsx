import { useEffect, useRef, useState } from 'react';
import Animate from '@/components/Animate';
import { ClubCard, PlayerCard } from '@/pages/Home';
import { Badge, Crest, FIELD, Facts, GLASS, GlassCard, Grid, Page, PageHeader, Prose, Section } from '@/components/ui';
import { Link } from '@/lib/router';
import { api, type Row } from '@/lib/api';
import { MILESTONE_KIND, POSITION, RESULT, SCOPE, TEAM_CATEGORY, TOURNAMENT, ar, fullDate, score, titlesCount, year } from '@/lib/i18n';

const TABLE_WRAP = `rounded-[24px] ${GLASS} overflow-x-auto`;
const TH = 'text-start text-white/50 text-[13px] font-[450] px-4 sm:px-5 py-4 whitespace-nowrap';
const TD = 'px-4 sm:px-5 py-4 border-t border-white/[0.06] text-white/85 text-[15px] font-[450] align-top';

/* ------------------------------ Players ------------------------------ */

export const loadPlayers = async (query: URLSearchParams) => {
  const [eras, list] = await Promise.all([api('/eras'), api(`/players?limit=100&${query}`)]);
  return { eras, list };
};

export function Players({ data, query }: { data: { eras: Row[]; list: Row }; query: URLSearchParams }) {
  const [filters, setFilters] = useState({ q: query.get('q') ?? '', position: query.get('position') ?? '', era: query.get('era') ?? '' });
  const [list, setList] = useState(data.list);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    window.history.replaceState(null, '', `/players${qs.size ? `?${qs}` : ''}`);
    const t = setTimeout(() => api(`/players?limit=100&${qs}`).then(setList).catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [filters]);

  const set = (k: keyof typeof filters) => (e: { target: { value: string } }) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Page header={<PageHeader title="اللاعبون" sub="سِيَر لاعبي الكرة المصرية عبر كل العصور، من رواد الأولمبياد في العشرينيات إلى نجوم أوروبا اليوم." />}>
      <Section>
        <Animate delay={600} direction="up">
          <form className="flex flex-wrap gap-3 mb-4" role="search" onSubmit={(e) => e.preventDefault()}>
            <label className="sr-only" htmlFor="pq">ابحث بالاسم</label>
            <input id="pq" type="search" value={filters.q} onChange={set('q')} placeholder="ابحث بالاسم بالعربية أو الإنجليزية" className={`${FIELD} flex-[1_1_260px]`} />
            <label className="sr-only" htmlFor="ppos">المركز</label>
            <select id="ppos" value={filters.position} onChange={set('position')} className={FIELD}>
              <option value="">كل المراكز</option>
              {Object.entries(POSITION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <label className="sr-only" htmlFor="pera">الحقبة</label>
            <select id="pera" value={filters.era} onChange={set('era')} className={FIELD}>
              <option value="">كل الحقب</option>
              {data.eras.map((e) => <option key={e.slug} value={e.slug}>{e.name_ar} ({e.start_year}–{e.end_year ?? 'اليوم'})</option>)}
            </select>
          </form>
          <p className="text-white/50 text-[14px] font-[450] mb-6" aria-live="polite">{list.total} لاعب</p>
        </Animate>
        {list.items.length
          ? <Grid>{list.items.map((p: Row, i: number) => <PlayerCard key={p.slug} p={p} delay={700 + Math.min(i, 12) * 50} />)}</Grid>
          : <p className={`rounded-[24px] ${GLASS} p-6 text-white/70 font-[450]`}>لا يوجد لاعبون يطابقون هذا البحث.</p>}
      </Section>
    </Page>
  );
}

export const loadPlayer = ([slug]: string[]) => api(`/players/${encodeURIComponent(slug)}`);

export function Player({ data: p }: { data: Row }) {
  return (
    <Page header={
      <PageHeader
        crumbs={[{ to: '/players', label: 'اللاعبون' }]}
        eyebrow={<span className="text-white/60 text-[16px] font-[450]" lang="en" dir="ltr">{p.name_en}</span>}
        title={p.name_ar || p.name_en}
        sub={ar(p, 'nickname') ? `«${ar(p, 'nickname')}»` : undefined}
      />
    }>
      <Section>
        <Animate delay={600} direction="up">
          <Facts items={[
            ['المركز', POSITION[p.position]],
            ['الميلاد', [fullDate(p.birth_date), ar(p, 'birthplace')].filter(Boolean).join('، ')],
            ...(p.death_date ? [['الوفاة', fullDate(p.death_date)] as [string, string]] : []),
            ...(p.intl_caps != null ? [['مع منتخب مصر', `${p.intl_caps} مباراة / ${p.intl_goals ?? '—'} هدف`] as [string, string]] : []),
            ['الحقبة', p.era_ar || p.era],
          ]} />
        </Animate>
      </Section>
      <div className="w-full max-w-[1800px] mx-auto px-5 sm:px-8 md:px-[82px] grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-10 lg:gap-16 pb-10">
        <Animate delay={700} direction="up"><Prose text={p.bio_ar || p.bio_en} /></Animate>
        <aside className="space-y-8">
          <Animate delay={800} direction="up">
            <h2 className="text-white text-[24px] font-normal mb-4">المسيرة</h2>
            {p.career.length ? (
              <div className={TABLE_WRAP}>
                <table className="w-full">
                  <thead><tr><th scope="col" className={TH}>الفترة</th><th scope="col" className={TH}>النادي</th></tr></thead>
                  <tbody>
                    {p.career.map((s: Row, i: number) => (
                      <tr key={i}>
                        <td className={`${TD} whitespace-nowrap`} dir="ltr">{s.from_year ?? ''}{s.to_year !== s.from_year ? `–${s.to_year ?? (s.from_year ? 'الآن' : '')}` : ''}</td>
                        <td className={TD}>{s.club_slug ? <Link to={`/clubs/${s.club_slug}`} className="underline underline-offset-4 decoration-white/30 hover:decoration-white">{s.club_ar}</Link> : s.club_ar}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-white/60 font-[450]">تُضاف المسيرة لاحقًا.</p>}
          </Animate>
          {p.events.length > 0 && (
            <Animate delay={900} direction="up">
              <h2 className="text-white text-[24px] font-normal mb-4">لحظات فارقة</h2>
              <ul className="space-y-3">
                {p.events.map((e: Row) => (
                  <li key={e.date} className={`rounded-[16px] ${GLASS} p-4 flex gap-4 items-baseline`}>
                    <span className="text-white/50 text-[20px] font-[450]">{year(e.date)}</span>
                    <span className="text-white/85 text-[15px] font-[450] leading-[1.6]">{ar(e, 'title')}</span>
                  </li>
                ))}
              </ul>
            </Animate>
          )}
        </aside>
      </div>
    </Page>
  );
}

/* ------------------------------ Clubs ------------------------------ */

export const loadClubs = () => api('/clubs');

export function Clubs({ data }: { data: Row[] }) {
  return (
    <Page header={<PageHeader title="الأندية" sub="من تأسيس الأهلي عام 1907 إلى أحدث أبطال أفريقيا: تاريخ الأندية المصرية ورحلتها." />}>
      <Section><Grid>{data.map((c, i) => <ClubCard key={c.slug} c={c} delay={600 + i * 60} />)}</Grid></Section>
    </Page>
  );
}

export const loadClub = ([slug]: string[]) => api(`/clubs/${encodeURIComponent(slug)}`);

export function Club({ data: c }: { data: Row }) {
  const max = Math.max(1, ...c.honours.map((h: Row) => h.count));
  const total = c.honours.reduce((n: number, h: Row) => n + h.count, 0);
  return (
    <Page header={
      <PageHeader
        crumbs={[{ to: '/clubs', label: 'الأندية' }]}
        eyebrow={<Crest row={c} size="lg" />}
        title={c.name_ar || c.name_en}
        sub={ar(c, 'nickname') || undefined}
      />
    }>
      <Section>
        <Animate delay={600} direction="up">
          <Facts items={[['التأسيس', c.founded_year], ['المدينة', ar(c, 'city')], ['الملعب', ar(c, 'stadium')], ['الألقاب الكبرى المسجّلة', total]]} />
        </Animate>
      </Section>
      <div className="w-full max-w-[1800px] mx-auto px-5 sm:px-8 md:px-[82px] grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-10 lg:gap-16 pb-10">
        <div>
          <Animate delay={700} direction="up"><Prose text={c.history_ar || c.history_en} fallback="تاريخ النادي قيد الإعداد." /></Animate>
          <Animate delay={800} direction="up"><h2 className="text-white text-[28px] sm:text-[36px] font-normal mt-12 mb-6">رحلة النادي</h2></Animate>
          <ol className="relative border-s border-white/15 ms-3 space-y-4">
            {c.milestones.map((m: Row, i: number) => (
              <li key={i} className="ps-6 relative">
                <span className={`absolute -start-[7px] top-6 w-[13px] h-[13px] rounded-full border-2 ${m.kind === 'title' ? 'bg-white border-white' : 'bg-[#080A19] border-white/50'}`} aria-hidden="true" />
                <GlassCard delay={850 + i * 60}>
                  <div className="flex items-baseline gap-4">
                    <span className="text-white/50 text-[26px] font-[450] leading-none">{m.year}</span>
                    <div>
                      <p className="text-white text-[17px] font-[450] leading-[1.5]">{ar(m, 'title')}</p>
                      <p className="text-white/50 text-[13px] font-[450] mt-1">{MILESTONE_KIND[m.kind]}</p>
                    </div>
                  </div>
                </GlassCard>
              </li>
            ))}
          </ol>
        </div>
        <aside className="space-y-8">
          <Animate delay={800} direction="up">
            <h2 className="text-white text-[24px] font-normal mb-4">البطولات</h2>
            {c.honours.length ? (
              <div className="space-y-3">
                {c.honours.map((h: Row) => (
                  <div key={h.competition_slug} className={`rounded-[16px] ${GLASS} p-4`}>
                    <div className="flex items-center gap-4">
                      <span className="text-white text-[34px] font-[450] leading-none min-w-[2ch]">{h.count}</span>
                      <div className="flex-1 min-w-0">
                        <Link to={`/championships/${h.competition_slug}`} className="text-white text-[16px] font-[450] hover:underline underline-offset-4">{h.competition_ar || h.competition}</Link>
                        <div className="h-[6px] mt-2 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full bg-white rounded-full" style={{ width: `${(h.count / max) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                    <p className="text-white/50 text-[12px] font-[450] leading-[1.7] mt-3" dir="ltr">{h.seasons}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-white/60 font-[450]">لا توجد ألقاب كبرى مسجّلة بعد.</p>}
          </Animate>
          {c.players.length > 0 && (
            <Animate delay={900} direction="up">
              <h2 className="text-white text-[24px] font-normal mb-4">لاعبون بارزون</h2>
              <ul className="space-y-2">
                {c.players.map((p: Row) => (
                  <li key={p.slug}>
                    <Link to={`/players/${p.slug}`} className="flex justify-between gap-4 px-4 py-3 rounded-[12px] hover:bg-white/[0.06] transition-colors">
                      <span className="text-white/90 font-[450]">{p.name_ar || p.name_en}</span>
                      <span className="text-white/40 text-[14px] font-[450]">{p.from_year ?? ''}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Animate>
          )}
        </aside>
      </div>
    </Page>
  );
}

/* ------------------------------ Championships ------------------------------ */

export const loadChampionships = () => api('/competitions');

export function Championships({ data }: { data: Row[] }) {
  let n = 0;
  return (
    <Page header={<PageHeader title="البطولات" sub="كل لقب محلي وقاري ودولي فازت به الأندية والمنتخبات المصرية." />}>
      {Object.entries(SCOPE).map(([scope, label]) => (
        <Section key={scope} title={label} delay={500}>
          <Grid>
            {data.filter((c) => c.scope === scope).map((c) => (
              <GlassCard key={c.slug} to={`/championships/${c.slug}`} delay={600 + (n++) * 60}>
                <h3 className="text-white text-[20px] font-[450] leading-[1.4]">{c.name_ar || c.name_en}</h3>
                <p className="text-white/60 text-[14px] font-[450] leading-[1.7] mt-2 mb-5">{ar(c, 'summary')}</p>
                <div className="flex flex-wrap gap-3 items-center text-white/60 text-[13px] font-[450]">
                  <span>منذ {c.first_year}</span>
                  <Badge>{titlesCount(c.editions)} مصرية</Badge>
                </div>
              </GlassCard>
            ))}
          </Grid>
        </Section>
      ))}
    </Page>
  );
}

export const loadChampionship = ([slug]: string[]) => api(`/competitions/${encodeURIComponent(slug)}`);

export function Championship({ data: c }: { data: Row }) {
  const max = Math.max(1, ...c.leaderboard.map((l: Row) => l.count));
  return (
    <Page header={<PageHeader crumbs={[{ to: '/championships', label: 'البطولات' }]} title={c.name_ar || c.name_en} sub={ar(c, 'summary')} />}>
      <div className="w-full max-w-[1800px] mx-auto px-5 sm:px-8 md:px-[82px] grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-10 lg:gap-16 py-10">
        <Animate delay={600} direction="up">
          <div className={TABLE_WRAP}>
            <table className="w-full">
              <caption className="sr-only">الأبطال المصريون حسب الموسم</caption>
              <thead><tr>{['الموسم', 'البطل', 'الوصيف', 'النهائي', 'المضيف'].map((h) => <th key={h} scope="col" className={TH}>{h}</th>)}</tr></thead>
              <tbody>
                {c.titles.map((t: Row, i: number) => (
                  <tr key={i}>
                    <td className={`${TD} whitespace-nowrap text-white`} dir="ltr">{t.season}</td>
                    <td className={TD}>{t.winner_slug ? <Link to={`/clubs/${t.winner_slug}`} className="underline underline-offset-4 decoration-white/30 hover:decoration-white">{t.winner_ar || t.winner}</Link> : (t.winner_ar || t.winner)}</td>
                    <td className={TD}>{t.runner_up_ar || t.runner_up || '—'}</td>
                    <td className={`${TD} whitespace-nowrap`}>{score(t.final_score) || '—'}</td>
                    <td className={TD}>{t.host_ar || t.host || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Animate>
        <aside>
          <Animate delay={700} direction="up">
            <h2 className="text-white text-[24px] font-normal mb-4">الأكثر تتويجًا</h2>
            <div className="space-y-3">
              {c.leaderboard.map((l: Row) => (
                <div key={l.winner} className={`rounded-[16px] ${GLASS} p-4 flex items-center gap-4`}>
                  <span className="text-white text-[34px] font-[450] leading-none min-w-[2ch]">{l.count}</span>
                  <div className="flex-1">
                    <p className="text-white font-[450]">{l.winner_ar || l.winner}</p>
                    <div className="h-[6px] mt-2 rounded-full bg-white/10"><div className="h-full bg-white rounded-full" style={{ width: `${(l.count / max) * 100}%` }} /></div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-white/50 text-[13px] font-[450] mt-4">تظهر الأندية والمنتخبات المصرية الفائزة فقط.</p>
          </Animate>
        </aside>
      </div>
    </Page>
  );
}

/* ------------------------------ National teams ------------------------------ */

export const loadTeams = () => api('/national-teams');

export function Teams({ data }: { data: Row[] }) {
  return (
    <Page header={<PageHeader title="المنتخبات" sub="الفراعنة وكل منتخبات مصر، من المنتخبات الأولمبية في العشرينيات إلى منتخبات الشباب والسيدات." />}>
      <Section>
        <Grid>
          {data.map((t, i) => (
            <GlassCard key={t.slug} to={`/national-teams/${t.slug}`} delay={600 + i * 60}>
              <div className="flex items-center gap-4 mb-4">
                <Crest row={t} />
                <div>
                  <h3 className="text-white text-[19px] font-[450] leading-[1.35]">{t.name_ar}</h3>
                  <p className="text-white/50 text-[13px] font-[450] mt-0.5">{TEAM_CATEGORY[t.category]}</p>
                </div>
              </div>
              <p className="text-white/60 text-[14px] font-[450] leading-[1.7]">{ar(t, 'summary')}</p>
            </GlassCard>
          ))}
        </Grid>
      </Section>
    </Page>
  );
}

export const loadTeam = ([slug]: string[]) => api(`/national-teams/${encodeURIComponent(slug)}`);

export function Team({ data: t }: { data: Row }) {
  const groups: Record<string, Row[]> = {};
  for (const a of t.appearances) (groups[a.tournament] ||= []).push(a);
  return (
    <Page header={<PageHeader crumbs={[{ to: '/national-teams', label: 'المنتخبات' }]} eyebrow={<Crest row={t} size="lg" />} title={t.name_ar || t.name_en} sub={ar(t, 'summary')} />}>
      {Object.entries(groups).map(([name, rows], gi) => (
        <Section key={name} title={TOURNAMENT[name] ?? name} delay={500 + gi * 100}>
          <Animate delay={600 + gi * 100} direction="up">
            <div className={TABLE_WRAP}>
              <table className="w-full">
                <thead><tr>{['السنة', 'المضيف', 'النتيجة', 'المدرب', 'ملاحظات'].map((h) => <th key={h} scope="col" className={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.year}>
                      <td className={`${TD} text-white text-[17px]`}>{a.year}</td>
                      <td className={TD}>{a.host_ar || a.host || '—'}</td>
                      <td className={`${TD} whitespace-nowrap`}>{a.result === 'Champions' ? <Badge light>بطل</Badge> : (RESULT[a.result] ?? a.result ?? 'لم تُحدَّد بعد')}</td>
                      <td className={`${TD} whitespace-nowrap`}>{a.coach_ar || a.coach || '—'}</td>
                      <td className={`${TD} text-white/60 min-w-[240px]`}>{a.notes_ar || a.notes_en || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Animate>
        </Section>
      ))}
    </Page>
  );
}

/* ------------------------------ Timeline ------------------------------ */

export const loadTimeline = async () => {
  const [events, eras] = await Promise.all([api('/timeline'), api('/eras')]);
  return { events, eras };
};

export function Timeline({ data }: { data: { events: Row[]; eras: Row[] } }) {
  const eraFor = (y: number) => data.eras.find((e) => y >= e.start_year && (e.end_year == null || y <= e.end_year));
  let last: Row | undefined;
  return (
    <Page header={<PageHeader title="الخط الزمني" sub="أكثر من قرن من كرة القدم المصرية، حقبة بعد حقبة." />}>
      <Section>
        <ol className="relative border-s border-white/15 ms-3 sm:ms-[110px]">
          {data.events.map((e, i) => {
            const y = Number(year(e.date));
            const era = eraFor(y);
            const band = era && era !== last;
            last = era;
            const to = e.player_slug ? `/players/${e.player_slug}` : e.club_slug ? `/clubs/${e.club_slug}` : undefined;
            const delay = 500 + Math.min(i, 10) * 60;
            return (
              <li key={e.date} className="relative ps-6 sm:ps-8 pb-5">
                {band && (
                  <Animate delay={delay} direction="up">
                    <div className="pt-6 pb-4">
                      <p className="text-white text-[22px] sm:text-[26px] font-normal">{era.name_ar}</p>
                      <p className="text-white/50 text-[14px] font-[450] mt-1">{era.start_year}–{era.end_year ?? 'اليوم'} · {era.summary_ar}</p>
                    </div>
                  </Animate>
                )}
                <span className={`absolute -start-[7px] mt-6 w-[13px] h-[13px] rounded-full border-2 ${e.featured ? 'bg-white border-white' : 'bg-[#080A19] border-white/50'}`} aria-hidden="true" />
                <span className="hidden sm:block absolute -start-[110px] mt-[18px] w-[86px] text-end text-white/60 text-[22px] font-[450]">{y}</span>
                <GlassCard to={to} delay={delay}>
                  <p className="text-white/50 text-[13px] font-[450] mb-1">{fullDate(e.date)}</p>
                  <h3 className="text-white text-[18px] font-[450] leading-[1.5]">{ar(e, 'title')}</h3>
                  {ar(e, 'body') && <p className="text-white/65 text-[15px] font-[450] leading-[1.7] mt-2">{ar(e, 'body')}</p>}
                </GlassCard>
              </li>
            );
          })}
        </ol>
      </Section>
    </Page>
  );
}
