import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { channel, streamers } from "../data";
import { colors, fonts, gradient, neonText } from "../theme";
import { Logo } from "./Logo";
import { NeonBackground } from "./NeonBackground";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const logoIn = spring({ frame, fps, config: { damping: 12 } });
  const titleIn = spring({ frame: frame - 25, fps, config: { damping: 14 } });
  const subIn = spring({ frame: frame - 45, fps });
  const flash = interpolate(frame, [0, 6], [1, 0], { extrapolateRight: "clamp" });
  const out = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      <Audio src={staticFile("audio/intro.mp3")} volume={0.8} />
      <NeonBackground dim={0.35} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 60, opacity: out }}>
        <Logo size={300} style={{ transform: `scale(${logoIn}) rotate(${(1 - logoIn) * -90}deg)` }} />
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 120,
            lineHeight: 1.1,
            marginTop: 30,
            backgroundImage: gradient,
            WebkitBackgroundClip: "text",
            color: "transparent",
            filter: `drop-shadow(0 0 20px ${colors.pink})`,
            transform: `translateY(${(1 - titleIn) * 80}px)`,
            opacity: titleIn,
          }}
        >
          {channel.title}
        </div>
        <div
          style={{
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: 48,
            color: colors.white,
            textShadow: neonText(colors.purple),
            opacity: subIn,
          }}
        >
          {channel.subtitle}
        </div>
        <div style={{ display: "flex", gap: 36, marginTop: 50 }}>
          {streamers.map((s, i) => {
            const p = spring({ frame: frame - 70 - i * 8, fps, config: { damping: 13 } });
            return (
              <div
                key={s.id}
                style={{
                  fontFamily: fonts.display,
                  fontSize: 54,
                  color: colors.white,
                  padding: "6px 34px",
                  borderRadius: 16,
                  border: `3px solid ${s.color}`,
                  boxShadow: `0 0 20px ${s.color}, inset 0 0 20px ${s.color}55`,
                  background: "rgba(18,5,31,0.6)",
                  transform: `scale(${p})`,
                }}
              >
                {s.name}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "white", opacity: flash }} />
    </AbsoluteFill>
  );
};
