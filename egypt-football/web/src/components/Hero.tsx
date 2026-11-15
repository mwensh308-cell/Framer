import Animate from '@/components/Animate';
import Nav from '@/components/Nav';
import { Link } from '@/lib/router';
import { titlesWord } from '@/lib/i18n';

export const HERO_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_092641_de52eb87-daf2-41db-92cb-7a56eae012a5.mp4';

/** Continental titles won by Egyptian clubs, per year (from /api/v1/stats/continental). */
export type ContinentalStats = { total: number; years: { year: number; n: number }[] };

// 32 two-year windows, 1964–65 … 2026–27: the same bar count as the original design.
const FIRST_YEAR = 1964;
const WINDOWS = 32;
const SINCE = 2020;

function TitlesCard({ stats }: { stats: ContinentalStats }) {
  const perWindow = Array.from({ length: WINDOWS }, (_, i) => {
    const from = FIRST_YEAR + i * 2;
    return stats.years.filter((y) => y.year >= from && y.year < from + 2).reduce((s, y) => s + y.n, 0);
  });
  // Bar height = cumulative titles so far; a bar is bright when a new title was won in that window.
  let running = 0;
  const bars = perWindow.map((won) => ({ total: (running += won), won: won > 0 }));
  const maxHeight = Math.max(...bars.map((b) => b.total), 1);
  const recent = stats.years.filter((y) => y.year >= SINCE).reduce((s, y) => s + y.n, 0);

  return (
    <Animate delay={900} direction="scale" className="w-full max-w-[405px] mx-auto lg:mx-0">
      <div className="w-full rounded-[24px] sm:rounded-[33px] bg-[rgba(17,16,15,0.35)] backdrop-blur-[20px] p-5 sm:p-8 pb-5 sm:pb-6">
        <p className="text-white text-[16px] sm:text-[20px] font-[450] leading-[1.4] mb-3 sm:mb-4">ألقاب الأندية المصرية القارية</p>

        <p className="mb-2 sm:mb-3">
          <span className="text-white text-[28px] sm:text-[46px] font-[450] leading-[1]">{stats.total}</span>
          <span className="text-white/20 text-[28px] sm:text-[46px] font-[450] leading-[1]"> {titlesWord(stats.total)}</span>
        </p>

        <div className="flex items-center gap-[10px] mb-6 sm:mb-8">
          <span dir="ltr" className="px-[6px] py-[7px] bg-white/20 rounded-[6px] text-white text-[12px] sm:text-[14px] font-[450] leading-[14px]">+{recent}</span>
          <span className="text-white/80 text-[12px] sm:text-[14px] font-[450] leading-[1.4] opacity-70">منذ {SINCE} (كانت {stats.total - recent} قبلها)</span>
        </div>

        {/* Time runs left to right, as on any chart, regardless of page direction. */}
        <div className="relative" dir="ltr" role="img" aria-label={`رسم بياني لتراكم الألقاب القارية من ${FIRST_YEAR} حتى اليوم: ${stats.total} ${titlesWord(stats.total)}`}>
          <div className="flex items-end gap-[1.5px] h-[80px] sm:h-[100px]">
            {bars.map((b, i) => {
              const heightPercent = Math.max((b.total / maxHeight) * 100, 3);
              return (
                <div
                  key={i}
                  className="flex-1 rounded-[0.5px] animate-bar-grow origin-bottom"
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: b.won ? 'white' : 'rgba(255,255,255,0.1)',
                    animationDelay: `${1100 + i * 30}ms`,
                  }}
                />
              );
            })}
          </div>

          <div className="absolute inset-0 pointer-events-none">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="absolute top-0 bottom-0 w-px bg-white/10" style={{ left: `${((i + 1) / 5) * 100}%` }} />
            ))}
          </div>

          <div className="flex justify-between mt-3">
            {['1964', '1980', '1996', '2012', '2026'].map((label) => (
              <span key={label} className="text-[9px] sm:text-[10px] font-[450] leading-[10px] text-white/80">{label}</span>
            ))}
          </div>
        </div>
        <p className="mt-3 text-white/50 text-[11px] font-[450] leading-[1.5]">الأعمدة الساطعة: سنتان شهدتا لقبًا قاريًا جديدًا</p>
      </div>
    </Animate>
  );
}

export default function Hero({ stats }: { stats: ContinentalStats }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <section className="relative w-full h-screen min-h-[640px] overflow-hidden bg-[#080A19]">
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={HERO_VIDEO}
        autoPlay={!reduce}
        loop
        muted
        playsInline
        aria-hidden="true"
      />

      <div className="relative z-10 h-full flex flex-col">
        <Nav />

        <div className="flex-1 flex items-center py-8">
          <div className="w-full max-w-[1800px] mx-auto px-5 sm:px-8 md:px-[82px] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10 lg:gap-12">
            <div className="max-w-[593px]">
              <Animate delay={300} direction="up">
                {/* Arabic needs more line height than Latin (0.95 would clip ascenders and descenders). */}
                <h1 className="text-white text-[36px] sm:text-[52px] md:text-[64px] lg:text-[72px] font-normal leading-[1.15] mb-5 sm:mb-8">
                  حكاية الكرة المصرية من البداية إلى القمة
                </h1>
              </Animate>

              <Animate delay={500} direction="up">
                <p className="text-white/80 text-[16px] sm:text-[18px] md:text-[20px] font-[450] leading-[1.5] max-w-[420px] mb-7 sm:mb-10">
                  أرشيف كامل للاعبين والأندية والبطولات والمنتخبات منذ 1907، وأخبار الكرة المصرية لحظة بلحظة
                </p>
              </Animate>

              <Animate delay={700} direction="up">
                <div className="flex flex-wrap gap-3 sm:gap-4">
                  <Link to="/players" className="h-[46px] sm:h-[51px] px-5 sm:px-[27px] bg-[#E9E9E9] rounded-[12px] text-[#0A0707] text-[14px] sm:text-[15.5px] font-[450] leading-[15.5px] transition-opacity hover:opacity-90 inline-flex items-center">
                    تصفّح الأرشيف
                  </Link>
                  <Link to="/news" className="h-[46px] sm:h-[51px] px-5 sm:px-[27px] rounded-[12px] border border-white text-white text-[14px] sm:text-[15.5px] font-[450] leading-[15.5px] transition-opacity hover:opacity-80 inline-flex items-center">
                    آخر الأخبار
                  </Link>
                </div>
              </Animate>
            </div>

            <TitlesCard stats={stats} />
          </div>
        </div>
      </div>
    </section>
  );
}
