import React from "react";
import { linearTiming, TransitionPresentation, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { streamers } from "./data";
import { sec } from "./theme";
import { Intro } from "./components/Intro";
import { Outro } from "./components/Outro";
import { StreamerCard } from "./components/StreamerCard";
import { ClipSegment } from "./components/ClipSegment";

export const INTRO = sec(8);
export const OUTRO = sec(14);
export const CARD = sec(4);
export const TRANSITION = 15;

// المدة الكلية = مجموع المقاطع - تداخل الانتقالات
export const getTotalDuration = () => {
  let total = INTRO + OUTRO;
  let transitions = 0;
  for (const s of streamers) {
    total += CARD;
    transitions += 1;
    for (const c of s.clips) {
      total += sec(c.duration);
      transitions += 1;
    }
  }
  transitions += 1; // قبل الخاتمة
  return total - transitions * TRANSITION;
};

const timing = linearTiming({ durationInFrames: TRANSITION });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clipTransitions: TransitionPresentation<any>[] = [
  fade(),
  wipe({ direction: "from-right" }),
  slide({ direction: "from-right" }),
];

export const Compilation: React.FC = () => {
  const items: React.ReactNode[] = [
    <TransitionSeries.Sequence key="intro" durationInFrames={INTRO}>
      <Intro />
    </TransitionSeries.Sequence>,
  ];

  streamers.forEach((s, si) => {
    items.push(
      <TransitionSeries.Transition key={`t-card-${s.id}`} presentation={slide({ direction: "from-bottom" })} timing={timing} />,
      <TransitionSeries.Sequence key={`card-${s.id}`} durationInFrames={CARD}>
        <StreamerCard streamer={s} index={si} total={streamers.length} />
      </TransitionSeries.Sequence>,
    );
    s.clips.forEach((c, ci) => {
      items.push(
        <TransitionSeries.Transition
          key={`t-${s.id}-${ci}`}
          presentation={ci === 0 ? fade() : clipTransitions[ci % clipTransitions.length]}
          timing={timing}
        />,
        <TransitionSeries.Sequence key={`${s.id}-${ci}`} durationInFrames={sec(c.duration)}>
          <ClipSegment clip={c} streamer={s} />
        </TransitionSeries.Sequence>,
      );
    });
  });

  items.push(
    <TransitionSeries.Transition key="t-outro" presentation={fade()} timing={timing} />,
    <TransitionSeries.Sequence key="outro" durationInFrames={OUTRO}>
      <Outro />
    </TransitionSeries.Sequence>,
  );

  return <TransitionSeries>{items}</TransitionSeries>;
};
