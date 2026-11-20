import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { streamers } from "./data";
import { colors, fonts, gradient, neonText } from "./theme";
import { Logo } from "./components/Logo";

// صورة مصغرة 1280x720
const Face: React.FC<{ name: string; color: string; thumb?: string; tilt: number }> = ({ name, color, thumb, tilt }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: `rotate(${tilt}deg)` }}>
    <div
      style={{
        width: 250,
        height: 250,
        borderRadius: 28,
        overflow: "hidden",
        border: `6px solid ${color}`,
        boxShadow: `0 0 30px ${color}, 0 0 60px ${color}88`,
        background: `radial-gradient(circle at 50% 35%, ${color}aa, ${colors.night} 75%)`,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      {thumb ? (
        <Img src={staticFile(`thumb/${thumb}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        // صورة ظلية مؤقتة إلى أن تُضاف صورة الوجه
        <svg width="200" height="210" viewBox="0 0 200 210">
          <circle cx="100" cy="72" r="52" fill="rgba(0,0,0,0.55)" />
          <path d="M10 210 C10 140 50 120 100 120 C150 120 190 140 190 210 Z" fill="rgba(0,0,0,0.55)" />
        </svg>
      )}
    </div>
    <div
      style={{
        marginTop: -26,
        fontFamily: fonts.display,
        fontSize: 46,
        color: colors.white,
        background: color,
        padding: "0 22px",
        borderRadius: 12,
        boxShadow: `0 6px 0 rgba(0,0,0,0.5)`,
      }}
    >
      {name}
    </div>
  </div>
);

export const Thumbnail: React.FC = () => {
  const tilts = [-5, 3, -3, 5];
  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      <Img src={staticFile("thumb/bg.jpg")} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />
      {/* تلوين بألوان فايس سيتي + تعتيم للقراءة */}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(18,5,31,0.85) 0%, rgba(18,5,31,0.35) 38%, rgba(214,26,255,0.25) 62%, rgba(18,5,31,0.9) 100%)` }} />
      <AbsoluteFill style={{ background: `linear-gradient(90deg, ${colors.pink}33, transparent 40%, transparent 60%, ${colors.purple}44)`, mixBlendMode: "screen" }} />

      {/* العنوان */}
      <div style={{ position: "absolute", top: 18, right: 40, left: 220, textAlign: "center" }}>
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 108,
            lineHeight: 1.05,
            color: colors.white,
            WebkitTextStroke: `4px ${colors.night}`,
            textShadow: `6px 6px 0 ${colors.night}, ${neonText(colors.pink)}`,
          }}
        >
          الاستريمرز العرب
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 24, direction: "ltr" }}>
          <span
            style={{
              fontFamily: fonts.display,
              fontSize: 120,
              lineHeight: 1,
              backgroundImage: gradient,
              WebkitBackgroundClip: "text",
              color: "transparent",
              filter: `drop-shadow(5px 5px 0 ${colors.night}) drop-shadow(0 0 16px ${colors.pink})`,
            }}
          >
            GTA VI
          </span>
          <span
            style={{
              fontFamily: fonts.display,
              fontSize: 50,
              color: colors.night,
              background: colors.orange,
              padding: "0 22px",
              borderRadius: 12,
              transform: "rotate(-6deg)",
              boxShadow: `0 0 24px ${colors.orange}`,
            }}
          >
            أول تجربة!
          </span>
        </div>
      </div>

      <Logo size={170} style={{ position: "absolute", top: 24, left: 30 }} />

      {/* الوجوه */}
      <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 46 }}>
        {streamers.map((s, i) => (
          <Face key={s.id} name={s.name} color={s.color} thumb={s.thumb} tilt={tilts[i % tilts.length]} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
