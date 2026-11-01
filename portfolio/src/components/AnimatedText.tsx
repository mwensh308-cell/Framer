import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { useRef, type CSSProperties } from 'react';

type Props = { text: string; className?: string; style?: CSSProperties };

function Char({
  char,
  progress,
  range,
}: {
  char: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.2, 1]);
  return (
    <span className="relative inline-block whitespace-pre">
      <span className="invisible">{char}</span>
      <motion.span className="absolute left-0 top-0" style={{ opacity }}>
        {char}
      </motion.span>
    </span>
  );
}

export default function AnimatedText({ text, className, style }: Props) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.2'] });
  const words = text.split(' ');
  const total = text.length;
  let idx = 0;

  return (
    <p ref={ref} className={className} style={style}>
      {words.map((word, w) => {
        const chars = (w < words.length - 1 ? word + ' ' : word).split('');
        return (
          // keep words together so lines only break between words
          <span key={w} className="inline-block whitespace-nowrap">
            {chars.map((c, i) => {
              const start = idx / total;
              const end = (idx + 1) / total;
              idx++;
              return <Char key={i} char={c} progress={scrollYProgress} range={[start, end]} />;
            })}
          </span>
        );
      })}
    </p>
  );
}
