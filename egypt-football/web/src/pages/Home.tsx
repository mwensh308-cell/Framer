import Animate from '@/components/Animate';
import Hero, { type ContinentalStats } from '@/components/Hero';
import { LiveNewsList } from '@/components/NewsList';
import { Badge, Crest, GLASS, GlassCard, Grid, MoreLink, Page, Portrait, Section } from '@/components/ui';
import { Link } from '@/lib/router';
import { api, type Row } from '@/lib/api';
import { POSITION, ar, lifespan, titlesCount, year } from '@/lib/i18n';

type Data = { stats: Row; continental: ContinentalStats; legends: Row[]; clubs: Row[]; moments: Row[]; news: Row[] };

export const loadHome = async (): Promise<Data> => {
  const [stats, continental, legends, clubs, moments, news] = await Promise.all([
    api('/stats'), api('/stats/continental'), api('/players?legend=1&limit=8'), api('/clubs'), api('/timeline?featured=1'), api('/news?limit=6'),
  ]);
  return { stats, continental, legends: legends.items, clubs, moments, news: news.items };
};

export function PlayerCard({ p, delay = 0 }: { p: Row; delay?: number }) {
  return (
    <GlassCard to={`/players/${p.slug}`} delay={delay}>
      <div className="flex items-center gap-4 mb-5">
        <Portrait row={p} />
        <div className="min-w-0">
          <h3 className="text-white text-[19px] font-[450] leading-[1.35]">{p.name_ar || p.name_en}</h3>
          <p className="text-white/50 text-[13px] font-[450] mt-0.5" lang="en" dir="ltr">{p.name_en}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-white/70 text-[14px] font-[450]">
        <span>{POSITION[p.position] ?? ''}</span>
        <span className="text-white/30">•</span>
        <span>{lifespan(p)}</span>
        {p.is_legend ? <Badge light>أسطورة</Badge> : null}
      </div>
    </GlassCard>
  );
}

export function ClubCard({ c, delay = 0 }: { c: Row; delay?: number }) {
  return (
    <GlassCard to={`/clubs/${c.slug}`} delay={delay}>
      <div className="flex items-center gap-4 mb-5">
        <Crest row={c} />
        <div className="min-w-0">
          <h3 className="text-white text-[19px] font-[450] leading-[1.35]">{c.name_ar || c.name_en}</h3>
          <p className="text-white/50 text-[13px] font-[450] mt-0.5">{ar(c, 'nickname')}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-white/70 text-[14px] font-[450]">
        <span>{ar(c, 'city')}</span>
        <span className="text-white/30">•</span>
        <span>تأسس {c.founded_year}</span>
        {c.trophies ? <Badge>{titlesCount(c.trophies)}</Badge> : null}
      </div>
    </GlassCard>
  );
}

export default function Home({ data }: { data: Data }) {
  const { stats } = data;
  const figures: [string, number][] = [
    ['ألقاب كأس الأمم الأفريقية', stats.afcon_titles],
    ['مشاركات في كأس العالم', stats.world_cups],
    ['لاعبون في الأرشيف', stats.players],
    ['أندية', stats.clubs],
    ['ألقاب مسجّلة', stats.titles],
  ];
  return (
    <Page header={<Hero stats={data.continental} />}>
      <section className="w-full max-w-[1800px] mx-auto px-5 sm:px-8 md:px-[82px] -mt-4 pt-12 sm:pt-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          {figures.map(([label, n], i) => (
            <Animate key={label} delay={i * 80} direction="up">
              <div className={`rounded-[24px] ${GLASS} p-5 sm:p-6 h-full`}>
                <p className="text-white text-[40px] sm:text-[52px] font-[450] leading-[1]">{n}</p>
                <p className="text-white/60 text-[14px] font-[450] mt-3 leading-[1.5]">{label}</p>
              </div>
            </Animate>
          ))}
        </div>
      </section>

      <Section title="آخر الأخبار" action={<MoreLink to="/news" label="كل الأخبار" />}>
        <LiveNewsList initial={data.news} />
      </Section>

      <Section title="الأساطير" action={<MoreLink to="/players" label="كل اللاعبين" />}>
        <Grid>{data.legends.map((p, i) => <PlayerCard key={p.slug} p={p} delay={i * 60} />)}</Grid>
      </Section>

      <Section title="لحظات صنعت التاريخ" action={<MoreLink to="/timeline" label="الخط الزمني كاملًا" />}>
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 -mx-5 px-5 sm:mx-0 sm:px-0 [scrollbar-width:thin]">
          {data.moments.map((m, i) => {
            const to = m.player_slug ? `/players/${m.player_slug}` : m.club_slug ? `/clubs/${m.club_slug}` : '/timeline';
            return (
              <div key={m.date} className="snap-start shrink-0 w-[78%] sm:w-[300px]">
                <GlassCard to={to} delay={i * 60}>
                  <span className="text-white/40 text-[44px] font-[450] leading-[1]">{year(m.date)}</span>
                  <h3 className="text-white text-[18px] font-[450] leading-[1.5] mt-4">{ar(m, 'title')}</h3>
                  {ar(m, 'body') && <p className="text-white/60 text-[14px] font-[450] leading-[1.7] mt-2">{ar(m, 'body')}</p>}
                </GlassCard>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="الأندية" action={<MoreLink to="/clubs" label="كل الأندية" />}>
        <Grid>{data.clubs.slice(0, 6).map((c, i) => <ClubCard key={c.slug} c={c} delay={i * 60} />)}</Grid>
      </Section>

      <Section>
        <Animate direction="up">
          <div className={`rounded-[24px] sm:rounded-[33px] ${GLASS} p-6 sm:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6`}>
            <div>
              <h2 className="text-white text-[26px] sm:text-[36px] font-normal leading-[1.25]">ابدأ من أي حقبة</h2>
              <p className="text-white/70 text-[16px] font-[450] leading-[1.7] mt-2 max-w-[520px]">من رواد أولمبياد العشرينيات إلى نجوم أوروبا اليوم، تصفّح أكثر من قرن من الكرة المصرية.</p>
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <Link to="/timeline" className="h-[46px] sm:h-[51px] px-5 sm:px-[27px] bg-[#E9E9E9] rounded-[12px] text-[#0A0707] text-[14px] sm:text-[15.5px] font-[450] inline-flex items-center transition-opacity hover:opacity-90">الخط الزمني</Link>
              <Link to="/championships" className="h-[46px] sm:h-[51px] px-5 sm:px-[27px] rounded-[12px] border border-white text-white text-[14px] sm:text-[15.5px] font-[450] inline-flex items-center transition-opacity hover:opacity-80">البطولات</Link>
            </div>
          </div>
        </Animate>
      </Section>
    </Page>
  );
}
