import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const HelloWorld: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const y = interpolate(enter, [0, 1], [40, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
      <h1 style={{ color: "#fff", fontFamily: "sans-serif", fontSize: 72, fontWeight: 600, opacity: enter, transform: `translateY(${y}px)` }}>
        {title}
      </h1>
    </AbsoluteFill>
  );
};
