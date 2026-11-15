import { useState } from 'react';
import Animate from '@/components/Animate';
import { ClubCard, PlayerCard } from '@/pages/Home';
import { BTN_LIGHT, FIELD, GLASS, GlassCard, Grid, Page, PageHeader, Section } from '@/components/ui';
import { useRouter } from '@/lib/router';
import { api, type Row } from '@/lib/api';

export const loadSearch = async (_: string[], query: URLSearchParams) => {
  const q = (query.get('q') ?? '').trim();
  const results = q.length >= 2 ? await api(`/search?q=${encodeURIComponent(q)}`) : { players: [], clubs: [], competitions: [] };
  return { q, results };
};

export function Search({ data }: { data: { q: string; results: Row } }) {
  const { navigate } = useRouter();
  const [q, setQ] = useState(data.q);
  const { players, clubs, competitions } = data.results;
  const total = players.length + clubs.length + competitions.length;

  return (
    <Page header={
      <PageHeader
        title="ابحث في الأرشيف"
        sub="لاعب أو نادٍ أو بطولة، بالعربية أو الإنجليزية."
        aside={
          <form role="search" className="flex gap-3 w-full lg:w-[520px]" onSubmit={(e) => { e.preventDefault(); navigate(`/search?q=${encodeURIComponent(q)}`); }}>
            <label className="sr-only" htmlFor="sq">كلمة البحث</label>
            <input id="sq" type="search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثال: صلاح، الزمالك، كأس الأمم" className={`${FIELD} flex-1 h-[51px]`} />
            <button className={BTN_LIGHT}>بحث</button>
          </form>
        }
      />
    }>
      {data.q && (
        <Section>
          <p className="text-white/60 font-[450] mb-8" aria-live="polite">{total ? `${total} نتيجة لـ «${data.q}»` : `لا توجد نتائج لـ «${data.q}». جرّب اسمًا أقصر أو الكتابة بالإنجليزية.`}</p>
          {players.length > 0 && (<><h2 className="text-white text-[26px] font-normal mb-5">اللاعبون</h2><Grid>{players.map((p: Row, i: number) => <PlayerCard key={p.slug} p={p} delay={i * 50} />)}</Grid></>)}
          {clubs.length > 0 && (<><h2 className="text-white text-[26px] font-normal mt-12 mb-5">الأندية</h2><Grid>{clubs.map((c: Row, i: number) => <ClubCard key={c.slug} c={c} delay={i * 50} />)}</Grid></>)}
          {competitions.length > 0 && (
            <>
              <h2 className="text-white text-[26px] font-normal mt-12 mb-5">البطولات</h2>
              <Grid>{competitions.map((c: Row, i: number) => (
                <GlassCard key={c.slug} to={`/championships/${c.slug}`} delay={i * 50}><span className="text-white text-[18px] font-[450]">{c.name_ar || c.name_en}</span></GlassCard>
              ))}</Grid>
            </>
          )}
        </Section>
      )}
      {!data.q && (
        <Section>
          <Animate delay={600} direction="up">
            <p className={`rounded-[24px] ${GLASS} p-6 text-white/70 font-[450]`}>اكتب كلمتين على الأقل للبحث في اللاعبين والأندية والبطولات.</p>
          </Animate>
        </Section>
      )}
    </Page>
  );
}
