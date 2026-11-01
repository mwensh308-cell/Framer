import FadeIn from '../components/FadeIn';

const SERVICES = [
  {
    name: 'Automation & Vision',
    desc: 'Computer vision, PLC control, pneumatic actuators and conveyor systems, engineered into smart automated inspection and production lines.',
  },
  {
    name: 'Web & AI Development',
    desc: 'Python scripting, HTML5 Canvas animation, AI-assisted development and domain & DNS setup to ship fast, modern web experiences.',
  },
  {
    name: 'Media Buying',
    desc: 'Planning and optimizing ad campaigns for local brands, with smarter budgets, sharper audience targeting and a better return on every pound spent.',
  },
  {
    name: 'E-Commerce & Social',
    desc: 'Running end-to-end store operations and social media services, from strategy and content to logistics, through WenshPro and El Alameya Store.',
  },
  {
    name: 'Hardware & Repair',
    desc: 'PlayStation console maintenance, DualSense controller repair, SSD upgrades, and PC hardware & software support done right the first time.',
  },
];

export default function ServicesSection() {
  return (
    <section
      id="services"
      className="rounded-t-[40px] px-5 py-20 sm:rounded-t-[50px] sm:px-8 sm:py-24 md:rounded-t-[60px] md:px-10 md:py-32"
      style={{ background: '#FFFFFF' }}
    >
      <FadeIn y={40}>
        <h2
          className="mb-16 text-center font-black uppercase leading-none tracking-tight text-[#0C0C0C] sm:mb-20 md:mb-28"
          style={{ fontSize: 'clamp(3rem, 12vw, 160px)' }}
        >
          Services
        </h2>
      </FadeIn>

      <div className="mx-auto max-w-5xl">
        {SERVICES.map((s, i) => (
          <FadeIn
            key={s.name}
            delay={i * 0.1}
            className="flex items-center gap-6 py-8 sm:gap-10 sm:py-10 md:gap-14 md:py-12"
            style={{
              borderTop: i === 0 ? '1px solid rgba(12, 12, 12, 0.15)' : undefined,
              borderBottom: '1px solid rgba(12, 12, 12, 0.15)',
            }}
          >
            <span
              className="shrink-0 font-black leading-none text-[#0C0C0C]"
              style={{ fontSize: 'clamp(3rem, 10vw, 140px)' }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="flex flex-col gap-2 text-[#0C0C0C]">
              <h3 className="font-medium uppercase" style={{ fontSize: 'clamp(1rem, 2.2vw, 2.1rem)' }}>
                {s.name}
              </h3>
              <p
                className="max-w-2xl font-light leading-relaxed"
                style={{ fontSize: 'clamp(0.85rem, 1.6vw, 1.25rem)', opacity: 0.6 }}
              >
                {s.desc}
              </p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
