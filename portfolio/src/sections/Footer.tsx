import { Mail, MapPin, Globe } from 'lucide-react';
import FadeIn from '../components/FadeIn';
import ContactButton from '../components/ContactButton';
import { profile } from '../data';

export default function Footer() {
  const items = [
    { icon: Mail, label: profile.email, href: `mailto:${profile.email}` },
    { icon: Globe, label: 'wwwensh.online', href: profile.website },
    { icon: MapPin, label: profile.location },
  ];
  return (
    <footer id="contact" className="flex flex-col items-center gap-10 px-5 pb-16 pt-24 text-[#D7E2EA] sm:px-8 md:px-10 md:pt-32">
      <FadeIn
        as="h2"
        y={40}
        className="hero-heading text-center font-black uppercase leading-none tracking-tight"
        style={{ fontSize: 'clamp(3rem, 12vw, 160px)' }}
      >
        Let&apos;s talk
      </FadeIn>
      <FadeIn delay={0.15}>
        <ContactButton />
      </FadeIn>
      <FadeIn delay={0.25} className="flex flex-col items-center gap-4 font-light sm:flex-row sm:gap-10">
        {items.map(({ icon: Icon, label, href }) => {
          const content = (
            <>
              <Icon size={18} strokeWidth={1.5} />
              {label}
            </>
          );
          return href ? (
            <a
              key={label}
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="flex items-center gap-2 transition-opacity duration-200 hover:opacity-70"
            >
              {content}
            </a>
          ) : (
            <span key={label} className="flex items-center gap-2">
              {content}
            </span>
          );
        })}
      </FadeIn>
      <p className="mt-6 text-xs font-light uppercase tracking-widest text-[#D7E2EA]/40">
        © {new Date().getFullYear()} {profile.fullName} · Wensh
      </p>
    </footer>
  );
}
