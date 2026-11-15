import { useCallback, useState } from 'react';
import Animate from '@/components/Animate';
import { GLASS } from '@/components/ui';
import { Link } from '@/lib/router';
import { ago } from '@/lib/i18n';
import { useLiveNews } from '@/lib/live';
import type { Row } from '@/lib/api';

/** News rows. New stories from the live stream slide in at the top. */
export function NewsItem({ n, fresh = false, delay = 0 }: { n: Row; fresh?: boolean; delay?: number }) {
  const external = Boolean(n.url);
  const title = (
    <span dir="auto" className="text-white text-[17px] sm:text-[19px] font-[450] leading-[1.5] group-hover:underline underline-offset-[6px] decoration-white/40">
      {n.title}
    </span>
  );
  return (
    <Animate delay={fresh ? 0 : delay} direction={fresh ? 'scale' : 'up'}>
      <article className={`grid sm:grid-cols-[130px_1fr] gap-1 sm:gap-6 py-5 border-b border-white/10 ${fresh ? 'bg-white/[0.04] rounded-[12px] px-3 -mx-3' : ''}`} lang={n.language}>
        <time dateTime={n.published_at} className="text-white/50 text-[13px] font-[450] pt-1">{ago(n.published_at)}</time>
        <div>
          <h3 className="mb-2">
            {external
              ? <a href={n.url} target="_blank" rel="noopener" className="group">{title}<span className="sr-only"> (يفتح في نافذة جديدة)</span></a>
              : <Link to={`/news/${n.id}`} className="group">{title}</Link>}
          </h3>
          {n.excerpt && <p dir="auto" className="text-white/70 text-[15px] font-[450] leading-[1.7] mb-2">{n.excerpt}</p>}
          <div className="flex flex-wrap items-center gap-3 text-white/50 text-[13px] font-[450]">
            <span dir="auto">{n.source_name || 'أرشيف الفراعنة'}</span>
            {n.pinned ? <span className="px-[6px] py-[3px] rounded-[6px] bg-white/20 text-white text-[12px]">مثبّت</span> : null}
            {fresh && <span className="px-[6px] py-[3px] rounded-[6px] bg-[#E9E9E9] text-[#0A0707] text-[12px]">جديد</span>}
          </div>
        </div>
      </article>
    </Animate>
  );
}

export function LiveNewsList({ initial, lang = '', empty = 'لا توجد أخبار بعد. يتحقق الموقع من المصادر كل بضع دقائق.' }: { initial: Row[]; lang?: string; empty?: string }) {
  const [items, setItems] = useState(initial);
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  const onItem = useCallback((item: Row) => {
    if (lang && item.language !== lang) return;
    setItems((list) => (list.some((x) => x.id === item.id) ? list : [item, ...list]));
    setFresh((s) => new Set(s).add(item.id));
  }, [lang]);
  useLiveNews(onItem);

  if (!items.length) return <p className={`rounded-[24px] ${GLASS} p-6 text-white/70 font-[450]`}>{empty}</p>;
  return <div>{items.map((n, i) => <NewsItem key={n.id} n={n} fresh={fresh.has(n.id)} delay={Math.min(i, 8) * 60} />)}</div>;
}
