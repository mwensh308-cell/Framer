import FadeIn from '../components/FadeIn';
import Magnet from '../components/Magnet';
import ContactButton from '../components/ContactButton';
import { profile } from '../data';

const links = [
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Projects', href: '#projects' },
  { label: 'Contact', href: '#contact' },
];

export default function HeroSection() {
  return (
    <section className="relative flex h-screen flex-col" style={{ overflowX: 'clip' }}>
      <FadeIn as="nav" delay={0} y={-20} className="flex justify-between px-6 pt-6 md:px-10 md:pt-8">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className="text-sm font-medium uppercase tracking-wider text-[#D7E2EA] transition-opacity duration-200 hover:opacity-70 md:text-lg lg:text-[1.4rem]"
          >
            {l.label}
          </a>
        ))}
      </FadeIn>

      <div className="overflow-hidden">
        <FadeIn
          as="h1"
          delay={0.15}
          y={40}
          className="hero-heading mt-6 w-full whitespace-nowrap text-center font-black uppercase leading-none tracking-tight text-[13vw] sm:mt-4 sm:text-[14vw] md:-mt-5 md:text-[15vw] lg:text-[16vw]"
        >
          Hi, i&apos;m {profile.name.toLowerCase()}
        </FadeIn>
      </div>

      <div className="mt-auto flex items-end justify-between px-6 pb-7 sm:pb-8 md:px-10 md:pb-10">
        <FadeIn
          as="p"
          delay={0.35}
          y={20}
          className="relative z-20 max-w-[160px] font-light uppercase leading-snug tracking-wide text-[#D7E2EA] sm:max-w-[220px] md:max-w-[260px]"
          style={{ fontSize: 'clamp(0.75rem, 1.4vw, 1.5rem)' }}
        >
          a mechatronics engineer driven by crafting smart systems and standout digital projects
        </FadeIn>
        <FadeIn delay={0.5} y={20} className="relative z-20">
          <ContactButton />
        </FadeIn>
      </div>

      <div
        className="absolute left-1/2 top-1/2 z-10 w-[220px] -translate-x-1/2 -translate-y-1/2 sm:bottom-0 sm:top-auto sm:w-[300px] sm:translate-y-0 md:w-[360px] lg:w-[420px]"
      >
        <FadeIn delay={0.6} y={30}>
        <Magnet
          padding={150}
          strength={3}
          activeTransition="transform 0.3s ease-out"
          inactiveTransition="transform 0.6s ease-in-out"
        >
          <img
            src={`${import.meta.env.BASE_URL}portrait.webp`}
            alt={`${profile.fullName} (${profile.name})`}
            className="w-full rotate-[-3deg] rounded-[28px] border-[6px] border-[#D7E2EA] object-cover shadow-[0_30px_80px_rgba(0,0,0,0.6)] sm:rounded-b-none sm:border-b-0"
            draggable={false}
          />
        </Magnet>
        </FadeIn>
      </div>
    </section>
  );
}
