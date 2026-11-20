import React from "react";
import { AbsoluteFill } from "remotion";
import { streamers } from "../data";
import { fonts } from "../theme";

// رابط اللايف الصغير أعلى منتصف الشاشة
export const LiveLink: React.FC<{ handle: string; color: string }> = ({ handle, color }) => (
  <div
    style={{
      position: "absolute",
      top: 12,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      direction: "ltr",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "5px 16px 5px 6px",
        borderRadius: 999,
        background: "rgba(10,3,18,0.78)",
        border: `2px solid ${color}`,
        boxShadow: `0 0 12px ${color}66`,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: "#53fc18",
          color: "#0b0b0b",
          fontFamily: fonts.body,
          fontWeight: 900,
          fontSize: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        K
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 9, height: 9, borderRadius: 9, background: "#ff3b3b", boxShadow: "0 0 8px #ff3b3b" }} />
        <span style={{ fontFamily: fonts.body, fontWeight: 900, fontSize: 15, color: "#ff5a5a", letterSpacing: 1 }}>
          LIVE
        </span>
      </div>
      <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 24, color: "#ffffff" }}>
        kick.com/<span style={{ color: "#53fc18" }}>{handle}</span>
      </span>
    </div>
  </div>
);

// نسخة شفافة لكل استريمر (تُستخدم لتركيب الرابط على فيديو جاهز)
export const LiveLinkStill: React.FC<{ index: number }> = ({ index }) => {
  const s = streamers[index];
  return (
    <AbsoluteFill style={{ background: "transparent" }}>
      <LiveLink handle={s.kick} color={s.color} />
    </AbsoluteFill>
  );
};
