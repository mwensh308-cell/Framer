// Shared pieces for inner pages, built from the hero's design tokens:
// #080A19 base, glass rgba(17,16,15,0.35) + blur, white/80 body text, #E9E9E9 light buttons, weight 450.
import type { ReactNode } from 'react';
import Animate from '@/components/Animate';
import Nav from '@/components/Nav';
import { HERO_VIDEO } from '@/components/Hero';
import { Link } from '@/lib/router';
import { initials, monogram } from '@/lib/i18n';
import type { Row } from '@/lib/api';

export const CONTAINER = 'w-full max-w-[1800px] mx-auto px-5 sm:px-8 md:px-[82px]';
export const GLASS = 'bg-[rgba(17,16,15,0.35)] backdrop-blur-[20px] border border-white/[0.06]';
export const BTN_LIGHT = 'h-[46px] sm:h-[51px] px-5 sm:px-[27px] bg-[#E9E9E9] rounded-[12px] text-[#0A0707] text-[14px] sm:text-[15.5px] font-[450] leading-[15.5px] transition-opacity hover:opacity-90 inline-flex items-center justify-center';
export const BTN_OUTLINE = 'h-[46px] sm:h-[51px] px-5 sm:px-[27px] rounded-[12px] border border-white text-white text-[14px] sm:text-[15.5px] font-[450] leading-[15.5px] transition-opacity hover:opacity-80 inline-flex items-center justify-center';
export const FIELD = 'h-[46px] px-4 rounded-[12px] bg-white/[0.06] border border-white/10 text-white text-[15px] font-[450] placeholder:text-white/40 focus:border-white/40 focus:outline-none transition-colors';

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Inner-page header: the hero video fading into the page, nav on top, title block below. */
export function PageHeader({ title, sub, eyebrow, crumbs, aside }: {
  title: ReactNode; sub?: ReactNode; eyebrow?: ReactNode; crumbs?: { to: string; label: string }[]; aside?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden">
      <video className="absolute inset-0 w-full h-full object-cover opacity-70" src={HERO_VIDEO} autoPlay={!reduce()} loop muted playsInline aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#080A19]/10 via-[#080A19]/50 to-[#080A19]" />
      <div className="relative z-10">
        <Nav />
        <div className={`${CONTAINER} pt-14 sm:pt-20 pb-12 sm:pb-16 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8`}>
          <div className="max-w-[760px]">
            {crumbs && (
              <Animate delay={200} direction="up">
                <nav aria-label="مسار التصفح" className="flex flex-wrap gap-2 text-white/60 text-[14px] font-[450] mb-5">
                  {crumbs.map((c, i) => (
                    <span key={c.to} className="flex gap-2">
                      {i > 0 && <span aria-hidden="true">/</span>}
                      <Link to={c.to} className="hover:text-white transition-colors">{c.label}</Link>
                    </span>
                  ))}
                </nav>
              </Animate>
            )}
            {eyebrow && <Animate delay={250} direction="up"><div className="mb-4">{eyebrow}</div></Animate>}
            <Animate delay={300} direction="up">
              <h1 className="text-white text-[36px] sm:text-[52px] md:text-[64px] font-normal leading-[1.15]">{title}</h1>
            </Animate>
            {sub && (
              <Animate delay={500} direction="up">
                <p className="text-white/80 text-[16px] sm:text-[18px] md:text-[20px] font-[450] leading-[1.6] max-w-[560px] mt-4 sm:mt-6">{sub}</p>
              </Animate>
            )}
          </div>
          {aside && <Animate delay={700} direction="scale" className="w-full lg:w-auto">{aside}</Animate>}
        </div>
      </div>
    </header>
  );
}

export function Section({ title, action, children, delay = 0 }: { title?: string; action?: ReactNode; children: ReactNode; delay?: number }) {
  return (
    <section className={`${CONTAINER} py-10 sm:py-14`}>
      {title && (
        <Animate delay={delay} direction="up">
          <div className="flex items-end justify-between gap-4 mb-6 sm:mb-8">
            <h2 className="text-white text-[28px] sm:text-[40px] font-normal leading-[1.2]">{title}</h2>
            {action}
          </div>
        </Animate>
      )}
      {children}
    </section>
  );
}

export const MoreLink = ({ to, label }: { to: string; label: string }) => (
  <Link to={to} className="text-white/80 hover:text-white text-[15px] font-[450] underline underline-offset-[6px] decoration-white/30 hover:decoration-white transition-colors whitespace-nowrap">{label}</Link>
);

/** Card that staggers in. `delay` is the base entrance delay in ms. */
export function GlassCard({ to, children, delay = 0, className = '' }: { to?: string; children: ReactNode; delay?: number; className?: string }) {
  const cls = `block h-full rounded-[24px] ${GLASS} p-5 sm:p-6 transition-all duration-300 ${to ? 'hover:bg-[rgba(17,16,15,0.55)] hover:border-white/[0.14] hover:-translate-y-[3px]' : ''} ${className}`;
  return (
    <Animate delay={delay} direction="up" className="h-full">
      {to ? <Link to={to} className={cls}>{children}</Link> : <div className={cls}>{children}</div>}
    </Animate>
  );
}

export const Grid = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-4 sm:gap-5 grid-cols-[repeat(auto-fill,minmax(min(270px,100%),1fr))]">{children}</div>
);

export const Badge = ({ children, light = false }: { children: ReactNode; light?: boolean }) => (
  <span className={`inline-block px-[6px] py-[5px] rounded-[6px] text-[12px] font-[450] leading-[14px] ${light ? 'bg-[#E9E9E9] text-[#0A0707]' : 'bg-white/20 text-white'}`}>{children}</span>
);

/** Club or national-team logo: the uploaded file (2027 edition) when present, otherwise an Arabic monogram. */
export function Crest({ row, size = 'md' }: { row: Row; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] text-[36px]' : 'w-12 h-12 text-[20px]';
  if (row.crest_url) {
    return (
      <span className={`${box} shrink-0 rounded-full bg-white/[0.08] border border-white/15 p-[6px] grid place-items-center overflow-hidden`}>
        <img src={row.crest_url} alt="" className="w-full h-full object-contain" loading="lazy" decoding="async" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={`${box} shrink-0 rounded-full bg-white/[0.08] border border-white/15 grid place-items-center text-white font-[450]`}>
      {monogram(row.name_ar || row.name_en)}
    </span>
  );
}

export function Portrait({ row }: { row: Row }) {
  if (row.portrait_url) return <img src={row.portrait_url} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" loading="lazy" />;
  return (
    <span aria-hidden="true" className="w-14 h-14 shrink-0 rounded-full bg-white/[0.08] border border-white/15 grid place-items-center text-white/90 text-[17px] font-[450]">
      {initials(row.name_ar || row.name_en)}
    </span>
  );
}

/** Glass key-facts strip used on detail pages. */
export function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className={`grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] rounded-[24px] ${GLASS} overflow-hidden`}>
      {items.map(([k, v]) => (
        <div key={k} className="p-4 sm:p-5 border-white/[0.06] border-e border-b -me-px -mb-px">
          <dt className="text-white/50 text-[13px] font-[450] mb-1">{k}</dt>
          <dd className="text-white text-[16px] sm:text-[18px] font-[450] leading-[1.4]">{v || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Prose({ text, fallback = 'السيرة قيد الإعداد.' }: { text?: string | null; fallback?: string }) {
  const paras = (text || fallback).split(/\n{2,}/);
  return (
    <div className="text-white/85 text-[17px] sm:text-[19px] font-[400] leading-[1.95] max-w-[68ch] space-y-5">
      {paras.map((p, i) => <p key={i}>{p}</p>)}
    </div>
  );
}

export function Footer() {
  return (
    <footer className={`${CONTAINER} py-10 mt-10 border-t border-white/10 flex flex-col sm:flex-row gap-3 justify-between text-white/50 text-[14px] font-[450] leading-[1.7]`}>
      <p>أرشيف الفراعنة — حكاية كرة القدم المصرية منذ 1907.</p>
      <p>الأخبار الخارجية تحيل إلى مصادرها الأصلية. <a href="mailto:corrections@example.com" className="underline underline-offset-4 hover:text-white">أرسل تصحيحًا</a></p>
    </footer>
  );
}

export function Page({ header, children }: { header: ReactNode; children?: ReactNode }) {
  return (
    <>
      {header}
      <main id="main" tabIndex={-1} className="outline-none">{children}</main>
      <Footer />
    </>
  );
}

export function Message({ title, body }: { title: string; body: string }) {
  return (
    <Page header={<PageHeader title={title} sub={body} />}>
      <Section><Link to="/" className={BTN_LIGHT}>العودة إلى الرئيسية</Link></Section>
    </Page>
  );
}
