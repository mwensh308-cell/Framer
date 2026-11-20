import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { colors, fonts, FPS } from "../theme";

// يظهر مكان المقطع الحقيقي إلى أن يُضاف ملف الفيديو
export const Placeholder: React.FC<{ streamer: string; title: string; color: string }> = ({
  streamer,
  title,
  color,
}) => {
  const frame = useCurrentFrame();
  const s = Math.floor(frame / FPS);
  const time = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return (
    <AbsoluteFill
      style={{
        background: `repeating-linear-gradient(45deg, #1a0a2a 0 40px, #210d35 40px 80px)`,
        alignItems: "center",
        justifyContent: "center",
        direction: "rtl",
        fontFamily: fonts.body,
        color: colors.white,
      }}
    >
      <div style={{ fontSize: 40, opacity: 0.6 }}>مقطع مؤقت — ضع لقطة البث هنا</div>
      <div style={{ fontFamily: fonts.display, fontSize: 110, color, marginTop: 10 }}>{streamer}</div>
      <div style={{ fontSize: 56, fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 36, opacity: 0.5, marginTop: 20, direction: "ltr" }}>{time}</div>
    </AbsoluteFill>
  );
};
