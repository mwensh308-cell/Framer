import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Streamer } from "../data";
import { colors, fonts, neonText } from "../theme";
import { NeonBackground } from "./NeonBackground";

// بطاقة تقديم كل استريمر قبل مقاطعه
export const StreamerCard: React.FC<{ streamer: Streamer; index: number; total: number }> = ({
  streamer,
  index,
  total,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nameIn = spring({ frame: frame - 5, fps, config: { damping: 10, mass: 0.8 } });
  const barW = interpolate(frame, [0, 20], [0, 900], { extrapolateRight: "clamp" });
  const metaIn = spring({ frame: frame - 18, fps });

  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      <Audio src={staticFile("audio/whoosh.mp3")} volume={0.7} />
      <NeonBackground dim={0.55} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            fontFamily: fonts.body,
            fontWeight: 900,
            fontSize: 44,
            color: colors.white,
            opacity: metaIn,
            letterSpacing: 2,
          }}
        >
          الاستريمر {index + 1} من {total}
        </div>
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 220,
            lineHeight: 1.15,
            color: colors.white,
            textShadow: neonText(streamer.color),
            transform: `scale(${nameIn})`,
          }}
        >
          {streamer.name}
        </div>
        <div style={{ width: barW, height: 8, borderRadius: 4, background: streamer.color, boxShadow: neonText(streamer.color) }} />
        {streamer.kick && (
          <div
            style={{
              marginTop: 28,
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: 46,
              color: "#53fc18",
              direction: "ltr",
              opacity: metaIn,
            }}
          >
            kick.com/{streamer.kick}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
