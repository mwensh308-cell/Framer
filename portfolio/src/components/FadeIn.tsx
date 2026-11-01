import { motion } from 'framer-motion';
import type { ElementType, ReactNode, CSSProperties } from 'react';

type FadeInProps = {
  children?: ReactNode;
  as?: ElementType;
  delay?: number;
  duration?: number;
  x?: number;
  y?: number;
  className?: string;
  style?: CSSProperties;
};

// Cache motion components so they aren't recreated on every render.
const motionCache = new Map<ElementType, ElementType>();
function getMotion(tag: ElementType): ElementType {
  let m = motionCache.get(tag);
  if (!m) {
    m = motion.create(tag as never) as unknown as ElementType;
    motionCache.set(tag, m);
  }
  return m;
}

export default function FadeIn({
  children,
  as = 'div',
  delay = 0,
  duration = 0.7,
  x = 0,
  y = 30,
  className,
  style,
}: FadeInProps) {
  const Component = getMotion(as);
  return (
    <Component
      className={className}
      style={style}
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '50px', amount: 0 }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </Component>
  );
}
