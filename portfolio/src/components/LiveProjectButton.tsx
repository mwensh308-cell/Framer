import { ArrowUpRight } from 'lucide-react';

export default function LiveProjectButton({ href, label = 'Live Project' }: { href?: string; label?: string }) {
  return (
    <a
      href={href ?? '#'}
      target={href ? '_blank' : undefined}
      rel={href ? 'noreferrer' : undefined}
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border-2 border-[#D7E2EA] px-8 py-3 sm:px-10 sm:py-3.5 text-sm sm:text-base font-medium uppercase tracking-widest text-[#D7E2EA] transition-colors duration-200 hover:bg-[#D7E2EA]/10"
    >
      {label}
      <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />
    </a>
  );
}
