import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { Fragment, useRef, type CSSProperties } from 'react';

type Props = { text: string; className?: string; style?: CSSProperties };

export default function AnimatedText({ text, className, style }: Props) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.2'] });
  const words = text.split(' ');
  const total = text.length;
  let index = 0;

  return (
    <p ref={ref} className={className} style={style}>
      {words.map((word, w) => {
        const wordStart = index;
        index += word.length + 1;
        return (
          <Fragment key={w}>
          <span className="inline-block whitespace-nowrap">
            {word.split('').map((char, c) => {
              const start = (wordStart + c) / total;
              const end = start + 1 / total;
              return <Char key={c} char={char} progress={scrollYProgress} range={[start, end]} />;
            })}
          </span>
          {w < words.length - 1 && ' '}
          </Fragment>
        );
      })}
    </p>
  );
}

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
    <span className="relative inline-block">
      <span className="invisible">{char}</span>
      <motion.span className="absolute left-0 top-0" style={{ opacity }}>
        {char}
      </motion.span>
    </span>
  );
}
