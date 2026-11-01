import FadeIn from '../components/FadeIn';
import AnimatedText from '../components/AnimatedText';
import ContactButton from '../components/ContactButton';

const base = 'https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/';

const decor = [
  { src: `${base}moon_icon.11395d36.png`, className: 'top-[4%] left-[1%] sm:left-[2%] md:left-[4%] w-[120px] sm:w-[160px] md:w-[210px]', delay: 0.1, x: -80 },
  { src: `${base}p59_1.4659672e.png`, className: 'bottom-[8%] left-[3%] sm:left-[6%] md:left-[10%] w-[100px] sm:w-[140px] md:w-[180px]', delay: 0.25, x: -80 },
  { src: `${base}lego_icon-1.703bb594.png`, className: 'top-[4%] right-[1%] sm:right-[2%] md:right-[4%] w-[120px] sm:w-[160px] md:w-[210px]', delay: 0.15, x: 80 },
  { src: `${base}Group_134-1.2e04f3ce.png`, className: 'bottom-[8%] right-[3%] sm:right-[6%] md:right-[10%] w-[130px] sm:w-[170px] md:w-[220px]', delay: 0.3, x: 80 },
];

const about =
  "I'm Mostafa, a mechatronics engineering student at Helwan University. I build automated inspection systems with computer vision and PLCs, run ad campaigns that improve ROI, and run two businesses: WenshPro and El Alameya Store. Let's build something incredible together!";

export default function AboutSection() {
  return (
    <section
      id="about"
      className="relative flex min-h-screen flex-col items-center justify-center gap-16 px-5 py-20 sm:gap-20 sm:px-8 md:gap-24 md:px-10"
    >
      {decor.map((d) => (
        <FadeIn key={d.src} delay={d.delay} x={d.x} y={0} duration={0.9} className={`pointer-events-none absolute ${d.className}`}>
          <img src={d.src} alt="" loading="lazy" className="w-full" />
        </FadeIn>
      ))}

      <div className="relative z-10 flex flex-col items-center gap-10 sm:gap-14 md:gap-16">
        <FadeIn
          as="h2"
          delay={0}
          y={40}
          className="hero-heading text-center font-black uppercase leading-none tracking-tight"
          style={{ fontSize: 'clamp(3rem, 12vw, 160px)' }}
        >
          About me
        </FadeIn>
        <AnimatedText
          text={about}
          className="max-w-[560px] text-center font-medium leading-relaxed text-[#D7E2EA]"
          style={{ fontSize: 'clamp(1rem, 2vw, 1.35rem)' }}
        />
      </div>

      <FadeIn className="relative z-10">
        <ContactButton />
      </FadeIn>
    </section>
  );
}
