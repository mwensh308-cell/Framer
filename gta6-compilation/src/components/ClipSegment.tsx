import React from "react";
import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Clip, Streamer } from "../data";
import { colors, fonts, sec } from "../theme";
import { Placeholder } from "./Placeholder";

// مقطع واحد: الفيديو + عنوان اللحظة + شريط اسم الاستريمر
export const ClipSegment: React.FC<{ clip: Clip; streamer: Streamer }> = ({ clip, streamer }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // زوم بطيء خفيف يعطي إحساس الحركة
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.04]);

  const titleIn = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const titleOut = interpolate(frame, [sec(3.5), sec(4)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tagIn = spring({ frame: frame - 4, fps });

  return (
    <AbsoluteFill style={{ background: "black", direction: "rtl" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        {clip.src ? (
          <OffthreadVideo
            src={staticFile(`clips/${clip.src}`)}
            startFrom={sec(clip.startFrom ?? 0)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Placeholder streamer={streamer.name} title={clip.title} color={streamer.color} />
        )}
      </AbsoluteFill>

      {/* عنوان اللحظة */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: titleOut,
        }}
      >
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 72,
            color: colors.white,
            padding: "8px 48px",
            borderRadius: 20,
            background: `linear-gradient(90deg, ${streamer.color}, ${colors.purple})`,
            boxShadow: `0 0 30px ${streamer.color}`,
            transform: `scale(${titleIn}) rotate(${(1 - titleIn) * -6}deg)`,
          }}
        >
          {clip.title}
        </div>
      </div>

      {/* شريط الاسم الثابت */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          right: 50,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "10px 28px 10px 34px",
          borderRadius: 14,
          background: "rgba(18,5,31,0.82)",
          borderRight: `10px solid ${streamer.color}`,
          boxShadow: `0 0 18px ${streamer.color}88`,
          transform: `translateX(${(1 - tagIn) * 500}px)`,
        }}
      >
        <span style={{ fontFamily: fonts.display, fontSize: 48, color: colors.white }}>{streamer.name}</span>
        {streamer.kick && (
          <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 30, color: "#53fc18", direction: "ltr" }}>
            kick/{streamer.kick}
          </span>
        )}
      </div>
    </AbsoluteFill>
  );
};
