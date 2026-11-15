import { useState } from 'react';
import Animate from '@/components/Animate';
import { LiveNewsList } from '@/components/NewsList';
import { Page, PageHeader, Prose, Section } from '@/components/ui';
import { api, type Row } from '@/lib/api';
import { fullDate } from '@/lib/i18n';

export const loadNews = () => api('/news?limit=30');

const LANGS: [string, string][] = [['', 'الكل'], ['ar', 'العربية'], ['en', 'الإنجليزية']];

export function News({ data }: { data: Row }) {
  const [lang, setLang] = useState('');
  const [list, setList] = useState<{ key: string; items: Row[] }>({ key: '', items: data.items });

  const choose = async (l: string) => {
    setLang(l);
    const d = await api(`/news?limit=30${l ? `&lang=${l}` : ''}`);
    setList({ key: l, items: d.items });
  };

  return (
    <Page header={
      <PageHeader
        title="الأخبار"
        sub="عناوين الكرة المصرية من كبرى المواقع العالمية والعربية، تُحدَّث تلقائيًا وتظهر هنا لحظة نشرها."
        eyebrow={<span className="inline-flex items-center gap-2 px-3 py-[7px] rounded-[8px] bg-white/20 text-white text-[13px] font-[450]"><span className="w-[7px] h-[7px] rounded-full bg-white animate-pulse" />مباشر</span>}
      />
    }>
      <Section>
        <Animate delay={600} direction="up">
          <div className="inline-flex p-[3px] gap-[5px] rounded-[13px] bg-[rgba(0,0,0,0.35)] backdrop-blur-[17px] mb-6" role="group" aria-label="لغة الأخبار">
            {LANGS.map(([value, label]) => (
              <button
                key={value}
                onClick={() => choose(value)}
                aria-pressed={lang === value}
                className={`h-[40px] px-5 rounded-[11px] text-[14px] font-[450] transition-colors ${lang === value ? 'bg-[#E9E9E9] text-[#0A0707]' : 'text-white hover:bg-white/5'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </Animate>
        <LiveNewsList key={list.key} initial={list.items} lang={lang} />
      </Section>
    </Page>
  );
}

export const loadArticle = async ([id]: string[]) => {
  const item = await api(`/news/${encodeURIComponent(id)}`);
  if (item.url) window.location.href = item.url; // external stories live on the publisher's site
  return item;
};

export function Article({ data: n }: { data: Row }) {
  return (
    <Page header={<PageHeader crumbs={[{ to: '/news', label: 'الأخبار' }]} title={<span dir="auto">{n.title}</span>} sub={fullDate(n.published_at)} />}>
      <Section><Animate delay={600} direction="up"><Prose text={n.body || n.excerpt} fallback="" /></Animate></Section>
    </Page>
  );
}
