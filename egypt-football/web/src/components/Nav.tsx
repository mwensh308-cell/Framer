import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import Animate from '@/components/Animate';
import Logo from '@/components/Logo';
import { Link, useRouter } from '@/lib/router';

const ARCHIVE_LINKS = [
  { to: '/players', label: 'اللاعبون' },
  { to: '/clubs', label: 'الأندية' },
  { to: '/championships', label: 'البطولات' },
];
const MAIN_LINKS = [
  { to: '/national-teams', label: 'المنتخبات' },
  { to: '/timeline', label: 'الخط الزمني' },
  { to: '/news', label: 'الأخبار' },
];
const MOBILE_LINKS = [...ARCHIVE_LINKS, ...MAIN_LINKS];

export default function Nav() {
  const [isOpen, setIsOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const { path } = useRouter();
  const dropdown = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close menus on Escape or a click outside the archive dropdown.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setIsOpen(false); setArchiveOpen(false); } };
    const onClick = (e: MouseEvent) => { if (!dropdown.current?.contains(e.target as Node)) setArchiveOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('click', onClick); };
  }, []);

  const active = (to: string) => path === to || path.startsWith(`${to}/`);
  const item = (to: string) => `text-[14px] font-[450] leading-[14px] hover:text-white transition-colors ${active(to) ? 'text-white' : 'text-white/80'}`;
  const archiveActive = ARCHIVE_LINKS.some((l) => active(l.to));

  return (
    <>
      <nav className="w-full max-w-[1800px] mx-auto px-5 sm:px-8 md:px-[82px] pt-[20px] sm:pt-[30px] flex items-center justify-between relative z-50" aria-label="القائمة الرئيسية">
        <Animate delay={0} direction="down">
          <Link to="/" className="flex items-center gap-2.5" aria-label="أرشيف الفراعنة — الرئيسية">
            <Logo />
            <span className="text-white text-[22px] sm:text-[26px] font-[450] leading-none tracking-[-0.02em]">أرشيف الفراعنة</span>
          </Link>
        </Animate>

        <Animate delay={100} direction="down" className="hidden lg:block">
          <div className="h-[52px] px-6 flex items-center gap-[30px] bg-[rgba(10,7,7,0.35)] rounded-[11px] backdrop-blur-[17px]">
            <div className="relative" ref={dropdown}>
              <button
                className={`flex items-center gap-[5px] ${archiveActive ? 'text-white' : 'text-white/80'} text-[14px] font-[450] leading-[14px] hover:text-white transition-colors`}
                aria-expanded={archiveOpen}
                aria-haspopup="true"
                onClick={() => setArchiveOpen((o) => !o)}
              >
                الأرشيف
                <ChevronDown className={`w-[10px] h-[10px] opacity-80 transition-transform duration-300 ${archiveOpen ? 'rotate-180' : ''}`} />
              </button>
              <div
                className={`absolute top-[calc(100%+22px)] start-[-24px] w-[220px] p-2 rounded-[14px] bg-[rgba(17,16,15,0.6)] backdrop-blur-[30px] border border-white/[0.06] origin-top transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${archiveOpen ? 'opacity-100 translate-y-0 scale-100 visible' : 'opacity-0 -translate-y-2 scale-[0.97] invisible'}`}
              >
                {ARCHIVE_LINKS.map((l) => (
                  <Link key={l.to} to={l.to} onClick={() => setArchiveOpen(false)}
                    className={`block px-4 py-3 rounded-[10px] text-[15px] font-[450] hover:bg-white/[0.06] transition-colors ${active(l.to) ? 'text-white bg-white/[0.06]' : 'text-white/80'}`}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
            {MAIN_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className={item(l.to)} aria-current={active(l.to) ? 'page' : undefined}>{l.label}</Link>
            ))}
          </div>
        </Animate>

        <Animate delay={200} direction="down" className="hidden lg:block">
          <div className="h-[52px] p-[3px] bg-[rgba(0,0,0,0.35)] rounded-[13px] backdrop-blur-[17px] flex items-center gap-[5px]">
            <a href="/admin" className="h-[46px] px-6 rounded-[11px] text-white text-[14px] font-[450] leading-[14px] hover:bg-white/5 transition-colors inline-flex items-center">
              دخول المحررين
            </a>
            <Link to="/search" className="h-[46px] px-6 bg-[#E9E9E9] rounded-[11px] text-[#0A0707] text-[14px] font-[450] leading-[14px] hover:bg-white transition-colors inline-flex items-center">
              ابحث في الأرشيف
            </Link>
          </div>
        </Animate>

        <Animate delay={100} direction="down" className="lg:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-[44px] h-[44px] flex items-center justify-center rounded-[11px] bg-[rgba(10,7,7,0.35)] backdrop-blur-[17px] transition-colors hover:bg-white/10"
            aria-label={isOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
          >
            <div className="relative w-5 h-5">
              <Menu className={`w-5 h-5 text-white absolute inset-0 transition-all duration-300 ease-out ${isOpen ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'}`} />
              <X className={`w-5 h-5 text-white absolute inset-0 transition-all duration-300 ease-out ${isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'}`} />
            </div>
          </button>
        </Animate>
      </nav>

      <div id="mobile-menu" className={`lg:hidden fixed inset-0 z-40 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'visible' : 'invisible'}`}>
        <div
          className={`absolute inset-0 bg-[#080A19]/90 backdrop-blur-[24px] transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsOpen(false)}
        />
        <div
          className={`absolute top-[76px] sm:top-[86px] left-4 right-4 sm:left-6 sm:right-6 bg-[rgba(17,16,15,0.6)] backdrop-blur-[30px] rounded-[20px] border border-white/[0.06] p-6 sm:p-8 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] origin-top ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-[0.97]'}`}
        >
          <div className="flex flex-col gap-1">
            {MOBILE_LINKS.map((l, i) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between px-4 py-4 rounded-[12px] text-white/90 text-[18px] font-[450] hover:bg-white/[0.06] transition-all duration-300 ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-3'} ${active(l.to) ? 'bg-white/[0.06]' : ''}`}
                style={{ transitionDelay: isOpen ? `${100 + i * 50}ms` : '0ms' }}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="h-px bg-white/10 my-5" />

          <div
            className={`flex flex-col gap-3 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            style={{ transitionDelay: isOpen ? '400ms' : '0ms' }}
          >
            <Link to="/search" onClick={() => setIsOpen(false)} className="w-full h-[50px] bg-[#E9E9E9] rounded-[12px] text-[#0A0707] text-[15px] font-[450] transition-colors hover:bg-white inline-flex items-center justify-center">
              ابحث في الأرشيف
            </Link>
            <a href="/admin" className="w-full h-[50px] rounded-[12px] border border-white/30 text-white text-[15px] font-[450] transition-colors hover:bg-white/5 inline-flex items-center justify-center">
              دخول المحررين
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
