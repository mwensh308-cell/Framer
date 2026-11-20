import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { colors } from "../theme";

// خلفية "فايس سيتي": سماء غروب + شمس + أرضية شبكية متحركة
export const NeonBackground: React.FC<{ dim?: number }> = ({ dim = 0 }) => {
  const frame = useCurrentFrame();
  const gridOffset = (frame * 2) % 80;

  return (
    <AbsoluteFill style={{ background: colors.night, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${colors.night} 0%, ${colors.deep} 35%, #5a0f5c 58%, ${colors.pink} 72%, ${colors.orange} 100%)`,
          height: "62%",
        }}
      />
      {/* الشمس */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "22%",
          width: 520,
          height: 520,
          marginLeft: -260,
          borderRadius: "50%",
          background: `linear-gradient(180deg, ${colors.orange} 0%, ${colors.pink} 70%, ${colors.magenta} 100%)`,
          boxShadow: `0 0 120px ${colors.pink}`,
          WebkitMaskImage:
            "repeating-linear-gradient(180deg, #000 0px, #000 34px, transparent 34px, transparent 44px)",
          maskImage:
            "repeating-linear-gradient(180deg, #000 0px, #000 34px, transparent 34px, transparent 44px)",
          opacity: 0.85,
        }}
      />
      {/* الأرضية الشبكية */}
      <div
        style={{
          position: "absolute",
          left: "-50%",
          right: "-50%",
          top: "62%",
          height: "80%",
          transform: "perspective(500px) rotateX(62deg)",
          transformOrigin: "top center",
          backgroundImage: `linear-gradient(${colors.pink} 2px, transparent 2px), linear-gradient(90deg, ${colors.pink} 2px, transparent 2px)`,
          backgroundSize: "80px 80px",
          backgroundPosition: `0 ${gridOffset}px`,
          backgroundColor: colors.night,
          boxShadow: `inset 0 40px 80px ${colors.night}`,
        }}
      />
      <AbsoluteFill
        style={{
          top: "58%",
          height: "10%",
          background: `linear-gradient(180deg, transparent, ${colors.pink}55, transparent)`,
        }}
      />
      {dim > 0 && <AbsoluteFill style={{ background: `rgba(10,2,20,${dim})` }} />}
    </AbsoluteFill>
  );
};
