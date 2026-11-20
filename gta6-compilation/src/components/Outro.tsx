import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { channel, streamers } from "../data";
import { colors, fonts, gradient, neonText } from "../theme";
import { Logo } from "./Logo";
import { NeonBackground } from "./NeonBackground";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });
  const pulse = 1 + Math.sin(frame / 8) * 0.04;

  return (
    <AbsoluteFill style={{ direction: "rtl", opacity: fadeOut }}>
      <Audio
        src={staticFile("audio/outro.mp3")}
        volume={(f) => interpolate(f, [0, 15, durationInFrames - 30, durationInFrames], [0, 0.7, 0.7, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
      <NeonBackground dim={0.5} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 70 }}>
        <div style={{ fontFamily: fonts.display, fontSize: 90, color: colors.white, textShadow: neonText() }}>
          شكراً للاستريمرز
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 80px", marginTop: 40 }}>
          {streamers.map((s, i) => {
            const p = spring({ frame: frame - 10 - i * 6, fps });
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "baseline", gap: 20, opacity: p, transform: `translateY(${(1 - p) * 40}px)` }}>
                <span style={{ fontFamily: fonts.display, fontSize: 64, color: s.color, textShadow: neonText(s.color) }}>{s.name}</span>
                <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 32, color: "#53fc18", direction: s.kick ? "ltr" : "rtl" }}>
                  {s.kick ? `kick.com/${s.kick}` : "على Kick"}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 70 }}>
          <Logo size={220} style={{ transform: `scale(${pulse})` }} />
          <div>
            <div style={{ fontFamily: fonts.display, fontSize: 80, backgroundImage: gradient, WebkitBackgroundClip: "text", color: "transparent" }}>
              {channel.name}
            </div>
            <div
              style={{
                display: "inline-block",
                marginTop: 10,
                fontFamily: fonts.body,
                fontWeight: 900,
                fontSize: 44,
                color: "white",
                background: "#ff0033",
                padding: "6px 36px",
                borderRadius: 12,
                transform: `scale(${pulse})`,
              }}
            >
              اشترك وفعّل الجرس 🔔
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
